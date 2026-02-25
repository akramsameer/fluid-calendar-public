#!/usr/bin/env tsx
/**
 * SaaS Submodule Setup Script
 *
 * This script integrates the SaaS submodule into the main FluidCalendar application.
 * It runs automatically during `npm install` (postinstall hook) when the submodule is present.
 *
 * Actions performed:
 * 1. Detects if saas/ submodule is populated
 * 2. Creates symlinks for SaaS routes, API routes, and worker files
 * 3. Symlinks SaaS overrides for shared modules (subscription service, etc.)
 * 4. Merges SaaS dependencies into package.json
 * 5. Merges Prisma schemas
 * 6. Updates User model with SaaS relations
 * 7. Sets environment variable for SaaS features
 */

import * as fs from "fs";
import * as path from "path";

const ROOT_DIR = path.resolve(__dirname, "..");
const SAAS_DIR = path.join(ROOT_DIR, "saas");
const SRC_DIR = path.join(ROOT_DIR, "src");

// ANSI color codes for output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  blue: "\x1b[34m",
  dim: "\x1b[2m",
};

function log(message: string, color: keyof typeof colors = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step: string) {
  log(`\n→ ${step}`, "blue");
}

function logSuccess(message: string) {
  log(`  ✓ ${message}`, "green");
}

function logSkip(message: string) {
  log(`  ○ ${message}`, "dim");
}

function logError(message: string) {
  log(`  ✗ ${message}`, "red");
}

/**
 * Check if the SaaS submodule is present and populated
 */
function isSaasSubmodulePresent(): boolean {
  const saasAppDir = path.join(SAAS_DIR, "app", "(saas)");
  return fs.existsSync(saasAppDir) && fs.readdirSync(saasAppDir).length > 0;
}

/**
 * Create a directory symlink, handling cross-platform differences
 */
function createDirSymlink(target: string, linkPath: string): boolean {
  try {
    // Remove existing symlink
    if (fs.existsSync(linkPath) || fs.lstatSync(linkPath).isSymbolicLink()) {
      const stats = fs.lstatSync(linkPath);
      if (stats.isSymbolicLink()) {
        fs.unlinkSync(linkPath);
      } else if (stats.isDirectory()) {
        logSkip(`${linkPath} exists as real directory, skipping`);
        return false;
      }
    }
  } catch {
    // Path doesn't exist, which is fine
  }

  try {
    // Create parent directory if needed
    const parentDir = path.dirname(linkPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    // Create symlink (use 'junction' on Windows for directories)
    const type = process.platform === "win32" ? "junction" : "dir";
    fs.symlinkSync(target, linkPath, type);
    return true;
  } catch (error) {
    logError(`Failed to create directory symlink ${linkPath}: ${error}`);
    return false;
  }
}

/**
 * Create a file symlink, handling cross-platform differences.
 * Backs up the original file if it exists (for open-source stubs being overridden).
 */
function createFileSymlink(target: string, linkPath: string): boolean {
  try {
    // Remove existing symlink or file
    if (fs.existsSync(linkPath)) {
      const stats = fs.lstatSync(linkPath);
      if (stats.isSymbolicLink()) {
        fs.unlinkSync(linkPath);
      } else if (stats.isFile()) {
        // Back up the original file (open-source stub)
        const backupPath = linkPath + ".os-backup";
        fs.copyFileSync(linkPath, backupPath);
        fs.unlinkSync(linkPath);
      }
    }
  } catch {
    // Path doesn't exist, which is fine
  }

  try {
    // Create parent directory if needed
    const parentDir = path.dirname(linkPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    // Create file symlink
    const type = process.platform === "win32" ? "file" : "file";
    fs.symlinkSync(target, linkPath, type);
    return true;
  } catch (error) {
    logError(`Failed to create file symlink ${linkPath}: ${error}`);
    return false;
  }
}

/**
 * Recursively mirror a directory tree for Turbopack compatibility.
 * Turbopack doesn't follow directory symlinks for route discovery at any level,
 * so we create real directories at every level and only symlink individual files.
 */
function mirrorDirWithFileSymlinks(
  targetDir: string,
  linkDir: string,
  label: string
): void {
  if (!fs.existsSync(targetDir)) {
    logSkip(`Target not found: ${targetDir}`);
    return;
  }

  // Remove existing directory symlink if the old approach left one
  try {
    if (fs.existsSync(linkDir) && fs.lstatSync(linkDir).isSymbolicLink()) {
      fs.unlinkSync(linkDir);
    }
  } catch {
    // ignore
  }

  // Create real directory
  if (!fs.existsSync(linkDir)) {
    fs.mkdirSync(linkDir, { recursive: true });
  }

  // Process each child entry
  const entries = fs.readdirSync(targetDir);
  for (const entry of entries) {
    const entryTarget = path.join(targetDir, entry);
    const entryLink = path.join(linkDir, entry);
    const entryLabel = `${label}/${entry}`;

    // Remove stale symlink
    try {
      if (fs.existsSync(entryLink) && fs.lstatSync(entryLink).isSymbolicLink()) {
        fs.unlinkSync(entryLink);
      }
    } catch {
      // ignore
    }

    if (fs.statSync(entryTarget).isFile()) {
      // Symlink individual files
      const relTarget = path.relative(linkDir, entryTarget);
      if (createFileSymlink(relTarget, entryLink)) {
        logSuccess(`Symlinked: ${entryLabel} → ${relTarget}`);
      }
    } else {
      // Recurse into subdirectories
      mirrorDirWithFileSymlinks(entryTarget, entryLink, entryLabel);
    }
  }
}

/**
 * Setup symlinks for SaaS content into src/
 *
 * Strategy:
 * - Expanded directory symlinks for Turbopack compatibility (real dirs with symlinked children)
 * - File symlinks for individual overrides (subscription service, etc.)
 */
function setupSymlinks(): void {
  logStep("Setting up SaaS symlinks");

  // === Expanded directory symlinks ===
  // Turbopack doesn't follow directory symlinks for route discovery,
  // so we create real directories and symlink each child entry inside them.

  const expandedDirSymlinks = [
    // SaaS app routes (pages, layouts)
    {
      target: path.join(SAAS_DIR, "app", "(saas)"),
      link: path.join(SRC_DIR, "app", "(saas)"),
      label: "src/app/(saas)",
    },
    // Admin API routes
    {
      target: path.join(SAAS_DIR, "api", "admin"),
      link: path.join(SRC_DIR, "app", "api", "admin"),
      label: "src/app/api/admin",
    },
    // SSE API route
    {
      target: path.join(SAAS_DIR, "api", "sse"),
      link: path.join(SRC_DIR, "app", "api", "sse"),
      label: "src/app/api/sse",
    },
    // Subscription lifetime API routes
    {
      target: path.join(SAAS_DIR, "api", "subscription", "lifetime"),
      link: path.join(SRC_DIR, "app", "api", "subscription", "lifetime"),
      label: "src/app/api/subscription/lifetime",
    },
    // Waitlist API routes
    {
      target: path.join(SAAS_DIR, "api", "waitlist"),
      link: path.join(SRC_DIR, "app", "api", "waitlist"),
      label: "src/app/api/waitlist",
    },
    // Task schedule queue API route
    {
      target: path.join(SAAS_DIR, "api", "tasks", "schedule-all", "queue"),
      link: path.join(SRC_DIR, "app", "api", "tasks", "schedule-all", "queue"),
      label: "src/app/api/tasks/schedule-all/queue",
    },
    // SaaS jobs/workers directory
    {
      target: path.join(SAAS_DIR, "jobs"),
      link: path.join(SRC_DIR, "saas", "jobs"),
      label: "src/saas/jobs",
    },
    // SaaS k8s directory
    {
      target: path.join(SAAS_DIR, "k8s"),
      link: path.join(SRC_DIR, "saas", "k8s"),
      label: "src/saas/k8s",
    },
  ];

  for (const { target, link, label } of expandedDirSymlinks) {
    mirrorDirWithFileSymlinks(target, link, label);
  }

  // === File symlinks for SaaS overrides ===
  // These override open-source stubs with SaaS implementations

  const fileOverrides = [
    // Subscription service (overrides the open-source stub)
    {
      target: path.join(SAAS_DIR, "lib", "services", "subscription.ts"),
      link: path.join(SRC_DIR, "lib", "services", "subscription.ts"),
    },
    // SaaS task-sync route (overrides the open-source synchronous version)
    {
      target: path.join(SAAS_DIR, "api", "task-sync", "sync", "route.ts"),
      link: path.join(SRC_DIR, "app", "api", "task-sync", "sync", "route.ts"),
    },
    // NotificationProvider (overrides open-source no-op with SaaS SSE notifications)
    {
      target: path.join(
        SAAS_DIR,
        "components",
        "providers",
        "NotificationProvider.tsx"
      ),
      link: path.join(
        SRC_DIR,
        "components",
        "providers",
        "NotificationProvider.tsx"
      ),
    },
    // LifetimeAccessBanner (overrides open-source no-op with SaaS banner)
    {
      target: path.join(
        SAAS_DIR,
        "components",
        "calendar",
        "LifetimeAccessBanner.tsx"
      ),
      link: path.join(
        SRC_DIR,
        "components",
        "calendar",
        "LifetimeAccessBanner.tsx"
      ),
    },
    // SponsorshipBanner (overrides open-source GitHub sponsor banner with SaaS no-op)
    {
      target: path.join(
        SAAS_DIR,
        "components",
        "ui",
        "sponsorship-banner.tsx"
      ),
      link: path.join(SRC_DIR, "components", "ui", "sponsorship-banner.tsx"),
    },
    // Email service (overrides open-source direct send with SaaS queue-based)
    {
      target: path.join(SAAS_DIR, "lib", "email", "email-service.ts"),
      link: path.join(SRC_DIR, "lib", "email", "email-service.ts"),
    },
    // Email waitlist service
    {
      target: path.join(SAAS_DIR, "lib", "email", "waitlist.ts"),
      link: path.join(SRC_DIR, "lib", "email", "waitlist.ts"),
    },
    // Subscription actions
    {
      target: path.join(SAAS_DIR, "lib", "actions", "subscription.ts"),
      link: path.join(SRC_DIR, "lib", "actions", "subscription.ts"),
    },
    // useSubscription hook (SaaS version)
    {
      target: path.join(SAAS_DIR, "lib", "hooks", "useSubscription.ts"),
      link: path.join(SRC_DIR, "lib", "hooks", "useSubscription.ts"),
    },
    // Waitlist store (overrides open-source no-op with SaaS implementation)
    {
      target: path.join(SAAS_DIR, "store", "waitlist.ts"),
      link: path.join(SRC_DIR, "store", "waitlist.ts"),
    },
    // Waitlist settings page (overrides open-source placeholder with SaaS admin page)
    {
      target: path.join(
        SAAS_DIR,
        "app",
        "(common)",
        "settings",
        "waitlist",
        "page.tsx"
      ),
      link: path.join(
        SRC_DIR,
        "app",
        "(common)",
        "settings",
        "waitlist",
        "page.tsx"
      ),
    },
  ];

  for (const { target, link } of fileOverrides) {
    if (!fs.existsSync(target)) {
      logSkip(`Override target not found: ${target}`);
      continue;
    }

    const relativeTarget = path.relative(path.dirname(link), target);

    if (createFileSymlink(relativeTarget, link)) {
      logSuccess(
        `Override: ${path.relative(ROOT_DIR, link)} → ${relativeTarget}`
      );
    }
  }
}

/**
 * Handle route conflicts between open-source and SaaS pages.
 * The (open) route group provides the OS landing page at /,
 * which conflicts with (saas)/page.tsx. Back up and remove it.
 */
function handleRouteConflicts(): void {
  logStep("Resolving route conflicts");

  const conflictingFiles = [
    path.join(SRC_DIR, "app", "(open)", "page.tsx"),
  ];

  for (const filePath of conflictingFiles) {
    if (fs.existsSync(filePath) && !fs.lstatSync(filePath).isSymbolicLink()) {
      const backupPath = filePath + ".os-backup";
      fs.copyFileSync(filePath, backupPath);
      fs.unlinkSync(filePath);
      logSuccess(
        `Backed up and removed: ${path.relative(ROOT_DIR, filePath)}`
      );
    } else {
      logSkip(`No conflict: ${path.relative(ROOT_DIR, filePath)}`);
    }
  }
}

/**
 * Merge SaaS package.json dependencies into main package.json
 */
function mergeDependencies(): void {
  logStep("Merging SaaS dependencies");

  const mainPkgPath = path.join(ROOT_DIR, "package.json");
  const saasPkgPath = path.join(SAAS_DIR, "package.json");

  if (!fs.existsSync(saasPkgPath)) {
    logSkip("No saas/package.json found");
    return;
  }

  try {
    const mainPkg = JSON.parse(fs.readFileSync(mainPkgPath, "utf-8"));
    const saasPkg = JSON.parse(fs.readFileSync(saasPkgPath, "utf-8"));

    let merged = false;

    // Merge dependencies
    if (saasPkg.dependencies) {
      for (const [name, version] of Object.entries(saasPkg.dependencies)) {
        if (!mainPkg.dependencies[name]) {
          mainPkg.dependencies[name] = version;
          logSuccess(`Added dependency: ${name}@${version}`);
          merged = true;
        }
      }
    }

    // Merge devDependencies
    if (saasPkg.devDependencies) {
      mainPkg.devDependencies = mainPkg.devDependencies || {};
      for (const [name, version] of Object.entries(saasPkg.devDependencies)) {
        if (!mainPkg.devDependencies[name]) {
          mainPkg.devDependencies[name] = version;
          logSuccess(`Added devDependency: ${name}@${version}`);
          merged = true;
        }
      }
    }

    if (merged) {
      // Sort dependencies alphabetically
      mainPkg.dependencies = Object.fromEntries(
        Object.entries(mainPkg.dependencies).sort(([a], [b]) =>
          a.localeCompare(b)
        )
      );
      if (mainPkg.devDependencies) {
        mainPkg.devDependencies = Object.fromEntries(
          Object.entries(mainPkg.devDependencies).sort(([a], [b]) =>
            a.localeCompare(b)
          )
        );
      }

      fs.writeFileSync(mainPkgPath, JSON.stringify(mainPkg, null, 2) + "\n");
      logSuccess("Updated package.json");
    } else {
      logSkip("No new dependencies to merge");
    }
  } catch (error) {
    logError(`Failed to merge dependencies: ${error}`);
  }
}

/**
 * Merge SaaS Prisma schema into main schema
 */
function mergePrismaSchema(): void {
  logStep("Merging Prisma schemas");

  const mainSchemaPath = path.join(ROOT_DIR, "prisma", "schema.prisma");
  const saasSchemaPath = path.join(SAAS_DIR, "prisma", "schema.prisma");

  if (!fs.existsSync(saasSchemaPath)) {
    logSkip("No saas/prisma/schema.prisma found");
    return;
  }

  try {
    const mainSchema = fs.readFileSync(mainSchemaPath, "utf-8");
    const saasSchema = fs.readFileSync(saasSchemaPath, "utf-8");

    // Check if already merged (look for SaaS-specific model)
    if (mainSchema.includes("model Subscription {")) {
      logSkip("Prisma schema already includes SaaS models");
      return;
    }

    // Filter out generator/datasource from SaaS schema (they're in core)
    const saasModels = saasSchema
      .replace(/generator\s+\w+\s*{[\s\S]*?}/g, "")
      .replace(/datasource\s+\w+\s*{[\s\S]*?}/g, "")
      .trim();

    // Append SaaS models to main schema
    const mergedSchema = `${mainSchema}\n\n// =============================================================================\n// SaaS Models (merged from saas/prisma/schema.prisma)\n// =============================================================================\n\n${saasModels}`;

    fs.writeFileSync(mainSchemaPath, mergedSchema);
    logSuccess("Merged SaaS models into prisma/schema.prisma");
  } catch (error) {
    logError(`Failed to merge Prisma schema: ${error}`);
  }
}

/**
 * Update User model to include SaaS relations
 */
function updateUserModel(): void {
  logStep("Updating User model with SaaS relations");

  const mainSchemaPath = path.join(ROOT_DIR, "prisma", "schema.prisma");

  try {
    let schema = fs.readFileSync(mainSchemaPath, "utf-8");

    // Check if User model already has SaaS relations
    if (schema.includes("subscription         Subscription?")) {
      logSkip("User model already has SaaS relations");
      return;
    }

    // Find User model and add SaaS relations
    const userModelRegex = /(model User \{[\s\S]*?)(createdAt\s+DateTime)/;
    const saasRelations = `
  // SaaS Relations (added by setup-saas.ts)
  subscription         Subscription?
  JobRecord            JobRecord[]
  subscriptionHistory  SubscriptionHistory[]
  subscriptionUsage    SubscriptionUsage?
  bookingLinks         BookingLink[]
  bookings             Booking[]             @relation("HostBookings")

  `;

    if (userModelRegex.test(schema)) {
      schema = schema.replace(userModelRegex, `$1${saasRelations}$2`);
      fs.writeFileSync(mainSchemaPath, schema);
      logSuccess("Added SaaS relations to User model");
    } else {
      logSkip("Could not find User model to update");
    }
  } catch (error) {
    logError(`Failed to update User model: ${error}`);
  }
}

/**
 * Set environment variable to indicate SaaS is enabled
 */
function updateEnvironment(): void {
  logStep("Configuring environment");

  // Create/update .env.local to enable SaaS features
  const envLocalPath = path.join(ROOT_DIR, ".env.local");

  try {
    let envContent = "";
    if (fs.existsSync(envLocalPath)) {
      envContent = fs.readFileSync(envLocalPath, "utf-8");
    }

    if (!envContent.includes("NEXT_PUBLIC_ENABLE_SAAS_FEATURES")) {
      envContent +=
        "\n# SaaS features enabled by setup-saas.ts\nNEXT_PUBLIC_ENABLE_SAAS_FEATURES=true\n";
      fs.writeFileSync(envLocalPath, envContent);
      logSuccess("Set NEXT_PUBLIC_ENABLE_SAAS_FEATURES=true in .env.local");
    } else {
      logSkip("NEXT_PUBLIC_ENABLE_SAAS_FEATURES already set");
    }
  } catch (error) {
    logError(`Failed to update environment: ${error}`);
  }
}

/**
 * Main setup function
 */
async function main(): Promise<void> {
  log("\n╔════════════════════════════════════════╗", "blue");
  log("║     FluidCalendar SaaS Setup           ║", "blue");
  log("╚════════════════════════════════════════╝", "blue");

  // Check if SaaS submodule is present
  if (!isSaasSubmodulePresent()) {
    log("\nSaaS submodule not found or empty.", "yellow");
    log("Running in open-source mode.\n", "dim");
    log(
      "To enable SaaS features, clone with: git clone --recurse-submodules\n",
      "dim"
    );
    return;
  }

  log("\nSaaS submodule detected. Setting up...", "green");

  // Run setup steps
  setupSymlinks();
  handleRouteConflicts();
  mergeDependencies();
  mergePrismaSchema();
  updateUserModel();
  updateEnvironment();

  log("\n╔════════════════════════════════════════╗", "green");
  log("║     SaaS Setup Complete!               ║", "green");
  log("╚════════════════════════════════════════╝", "green");
  log("\nNext steps:", "dim");
  log("1. Run: npm install (to install new dependencies)", "dim");
  log("2. Run: npx prisma generate", "dim");
  log("3. Run: npx prisma migrate dev", "dim");
  log("4. Run: npm run dev\n", "dim");
}

// Run main function
main().catch((error) => {
  logError(`Setup failed: ${error}`);
  process.exit(1);
});
