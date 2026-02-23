#!/usr/bin/env tsx
/**
 * SaaS Submodule Setup Script
 *
 * This script integrates the SaaS submodule into the main FluidCalendar application.
 * It runs automatically during `npm install` (postinstall hook) when the submodule is present.
 *
 * Actions performed:
 * 1. Detects if saas/ submodule is populated
 * 2. Creates symlinks for SaaS routes in src/app/(saas)
 * 3. Merges SaaS dependencies into package.json
 * 4. Merges Prisma schemas
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
 * Create a symlink, handling cross-platform differences
 */
function createSymlink(target: string, linkPath: string): boolean {
  try {
    // Remove existing symlink or directory
    if (fs.existsSync(linkPath)) {
      const stats = fs.lstatSync(linkPath);
      if (stats.isSymbolicLink()) {
        fs.unlinkSync(linkPath);
      } else if (stats.isDirectory()) {
        // If it's a real directory, don't overwrite
        logSkip(`${linkPath} exists as directory, skipping`);
        return false;
      }
    }

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
    logError(`Failed to create symlink: ${error}`);
    return false;
  }
}

/**
 * Setup symlinks for SaaS routes
 */
function setupRouteSymlinks(): void {
  logStep("Setting up SaaS route symlinks");

  const symlinks = [
    {
      target: path.join(SAAS_DIR, "app", "(saas)"),
      link: path.join(SRC_DIR, "app", "(saas)"),
    },
  ];

  for (const { target, link } of symlinks) {
    if (!fs.existsSync(target)) {
      logSkip(`Target not found: ${target}`);
      continue;
    }

    // Calculate relative path for symlink
    const relativeTarget = path.relative(path.dirname(link), target);

    if (createSymlink(relativeTarget, link)) {
      logSuccess(`Created symlink: ${path.basename(link)} → ${relativeTarget}`);
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
  const saasSchemaPath = path.join(SAAS_DIR, "prisma", "schema.saas.prisma");

  if (!fs.existsSync(saasSchemaPath)) {
    logSkip("No saas/prisma/schema.saas.prisma found");
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
    const mergedSchema = `${mainSchema}\n\n// =============================================================================\n// SaaS Models (merged from saas/prisma/schema.saas.prisma)\n// =============================================================================\n\n${saasModels}`;

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
      envContent += "\n# SaaS features enabled by setup-saas.ts\nNEXT_PUBLIC_ENABLE_SAAS_FEATURES=true\n";
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
    log("To enable SaaS features, clone with: git clone --recurse-submodules\n", "dim");
    return;
  }

  log("\nSaaS submodule detected. Setting up...", "green");

  // Run setup steps
  setupRouteSymlinks();
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
