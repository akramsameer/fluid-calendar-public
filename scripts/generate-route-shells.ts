#!/usr/bin/env tsx
/**
 * Generates shell files for SaaS route symlinks.
 * Replaces symlinks with thin shell files that feature-gate with notFound()/404.
 * Also generates saas/src/ re-export files.
 *
 * Usage: tsx scripts/generate-route-shells.ts
 */
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");
const SRC_APP = path.join(ROOT, "src", "app");
const SAAS_SRC = path.join(ROOT, "saas", "src");

interface RouteInfo {
  /** Absolute path to the symlink in src/app/ */
  linkPath: string;
  /** Absolute path the symlink points to (resolved) */
  targetPath: string;
  /** Relative path from src/app/ (e.g. "api/admin/articles/route.ts") */
  relPath: string;
  /** File type */
  type: "route" | "page" | "layout" | "component";
  /** HTTP methods exported (for route.ts files) */
  methods: string[];
  /** Dynamic route params (e.g. ["id", "bookingId"]) */
  params: string[];
}

function findSymlinks(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) {
      results.push(fullPath);
    } else if (entry.isDirectory()) {
      results.push(...findSymlinks(fullPath));
    }
  }
  return results;
}

function getRouteInfo(linkPath: string): RouteInfo {
  const relPath = path.relative(SRC_APP, linkPath);
  const targetPath = fs.realpathSync(linkPath);
  const fileName = path.basename(linkPath);

  // Determine file type
  let type: RouteInfo["type"] = "component";
  if (fileName === "route.ts") type = "route";
  else if (fileName === "page.tsx") type = "page";
  else if (fileName === "layout.tsx") type = "layout";

  // Get HTTP methods for route files
  let methods: string[] = [];
  if (type === "route") {
    try {
      const content = fs.readFileSync(targetPath, "utf-8");
      const methodRegex =
        /export\s+(?:async\s+)?function\s+(GET|POST|PUT|DELETE|PATCH)/g;
      let match;
      while ((match = methodRegex.exec(content)) !== null) {
        methods.push(match[1]);
      }
    } catch {
      methods = ["GET", "POST"];
    }
  }

  // Extract dynamic params from path
  const params: string[] = [];
  const paramRegex = /\[(\w+)\]/g;
  let paramMatch;
  while ((paramMatch = paramRegex.exec(relPath)) !== null) {
    params.push(paramMatch[1]);
  }

  return { linkPath, targetPath, relPath, type, methods, params };
}

/** Generate the @saas import path for a re-export */
function getSaasImportPath(relPath: string): string {
  // Convert src/app/ path to saas/src/ re-export path
  // e.g. "api/admin/articles/route.ts" → "api/admin/articles"
  // e.g. "(saas)/beta/page.tsx" → "routes/saas/beta/page"
  const withoutExt = relPath.replace(/\.(ts|tsx)$/, "");

  if (relPath.startsWith("api/")) {
    return withoutExt;
  }
  // Page routes go under routes/
  return `routes/${withoutExt}`;
}

/** Generate a shell API route file */
function generateApiShell(info: RouteInfo): string {
  const saasPath = getSaasImportPath(info.relPath);
  const hasParams = info.params.length > 0;

  // Build params type
  const paramsType = hasParams
    ? `{ params: Promise<{ ${info.params.map((p) => `${p}: string`).join("; ")} }> }`
    : "";

  const lines = [
    `import { NextRequest, NextResponse } from "next/server";`,
    ``,
    `import { isSaasEnabled } from "@/lib/config";`,
    ``,
  ];

  for (const method of info.methods) {
    const args = hasParams
      ? `req: NextRequest, context: ${paramsType}`
      : `req: NextRequest`;
    const fwdArgs = hasParams ? `req, context` : `req`;

    lines.push(`export async function ${method}(${args}) {`);
    lines.push(`  if (!isSaasEnabled) {`);
    lines.push(
      `    return NextResponse.json({ error: "Not available" }, { status: 404 });`
    );
    lines.push(`  }`);
    lines.push(
      `  const handler = await import("@saas/${saasPath}");`
    );
    lines.push(`  return handler.${method}(${fwdArgs});`);
    lines.push(`}`);
    lines.push(``);
  }

  return lines.join("\n");
}

/** Generate a shell page file */
function generatePageShell(info: RouteInfo): string {
  const saasPath = getSaasImportPath(info.relPath);

  return `import { notFound } from "next/navigation";

import { isSaasEnabled } from "@/lib/config";

export default async function Page() {
  if (!isSaasEnabled) return notFound();
  const { default: Component } = await import("@saas/${saasPath}");
  return <Component />;
}
`;
}

/** Generate a shell layout file */
function generateLayoutShell(info: RouteInfo): string {
  const saasPath = getSaasImportPath(info.relPath);

  return `import { notFound } from "next/navigation";

import { isSaasEnabled } from "@/lib/config";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isSaasEnabled) return notFound();
  const { default: SaasLayout } = await import("@saas/${saasPath}");
  return <SaasLayout>{children}</SaasLayout>;
}
`;
}

/** Generate a re-export file in saas/src/ */
function generateReexport(info: RouteInfo): string {
  // Calculate relative path from saas/src/[saasPath] to the actual saas file
  const saasPath = getSaasImportPath(info.relPath);
  const reexportDir = path.join(SAAS_SRC, path.dirname(saasPath));
  const relToTarget = path.relative(reexportDir, info.targetPath);
  const relWithoutExt = relToTarget.replace(/\.(ts|tsx)$/, "");

  if (info.type === "route") {
    const exports = info.methods.map((m) => m).join(", ");
    return `export { ${exports} } from "${relWithoutExt}";\n`;
  }
  return `export { default } from "${relWithoutExt}";\n`;
}

// Main
function main() {
  console.log("Scanning for route symlinks...\n");

  const symlinks = findSymlinks(SRC_APP);
  const routes = symlinks.map(getRouteInfo);

  // Separate by type
  const apiRoutes = routes.filter((r) => r.type === "route");
  const pages = routes.filter((r) => r.type === "page");
  const layouts = routes.filter((r) => r.type === "layout");
  const components = routes.filter((r) => r.type === "component");

  console.log(`Found:`);
  console.log(`  ${apiRoutes.length} API routes`);
  console.log(`  ${pages.length} pages`);
  console.log(`  ${layouts.length} layouts`);
  console.log(`  ${components.length} co-located components (skipped)\n`);

  let created = 0;

  // Process route files
  for (const route of [...apiRoutes, ...pages, ...layouts]) {
    // Skip already-migrated files (Phase 2 file overrides)
    if (
      route.relPath === "sitemap.ts" ||
      route.relPath.includes("task-sync/sync") ||
      route.relPath.includes("(common)/settings/waitlist")
    ) {
      console.log(`  SKIP (Phase 2): ${route.relPath}`);
      continue;
    }

    // 1. Delete symlink
    fs.unlinkSync(route.linkPath);

    // 2. Create shell file
    let shell: string;
    if (route.type === "route") {
      shell = generateApiShell(route);
    } else if (route.type === "page") {
      shell = generatePageShell(route);
    } else {
      shell = generateLayoutShell(route);
    }

    fs.writeFileSync(route.linkPath, shell);
    console.log(`  SHELL: ${route.relPath}`);

    // 3. Create re-export in saas/src/
    const saasPath = getSaasImportPath(route.relPath);
    const reexportPath = path.join(
      SAAS_SRC,
      saasPath + path.extname(route.linkPath)
    );
    const reexportDir = path.dirname(reexportPath);
    if (!fs.existsSync(reexportDir)) {
      fs.mkdirSync(reexportDir, { recursive: true });
    }
    const reexport = generateReexport(route);
    fs.writeFileSync(reexportPath, reexport);

    created++;
  }

  // Handle co-located components: just delete the symlinks
  for (const comp of components) {
    // Skip sitemap.ts (already handled in Phase 2)
    if (comp.relPath === "sitemap.ts") {
      console.log(`  SKIP (Phase 2): ${comp.relPath}`);
      continue;
    }

    fs.unlinkSync(comp.linkPath);
    console.log(`  DELETE symlink: ${comp.relPath}`);
  }

  console.log(`\nDone! Created ${created} shell files.`);
  console.log(
    `Deleted ${components.length} co-located component symlinks.`
  );
}

main();
