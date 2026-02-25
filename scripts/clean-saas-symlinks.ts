#!/usr/bin/env tsx
/**
 * Clean SaaS Symlinks Script
 *
 * Removes all SaaS symlinks created by setup-saas.ts,
 * restoring the open-source defaults. Used by build:os
 * to ensure clean open-source builds.
 */

import * as fs from "fs";
import * as path from "path";

const ROOT_DIR = path.resolve(__dirname, "..");

/**
 * Expanded directories: real directories with symlinked children.
 * Each entry's symlinked children are removed, then the empty directory is cleaned up.
 */
const EXPANDED_DIRS = [
  "src/app/(saas)",
  "src/app/api/admin",
  "src/app/api/sse",
  "src/app/api/subscription/lifetime",
  "src/app/api/waitlist",
  "src/app/api/tasks/schedule-all/queue",
  "src/saas/jobs",
  "src/saas/k8s",
];

/**
 * File symlinks that override open-source defaults.
 * When removed, the .os-backup file is restored if it exists.
 */
const FILE_OVERRIDES = [
  "src/lib/services/subscription.ts",
  "src/app/api/task-sync/sync/route.ts",
  "src/components/providers/NotificationProvider.tsx",
  "src/components/calendar/LifetimeAccessBanner.tsx",
  "src/components/ui/sponsorship-banner.tsx",
  "src/lib/email/email-service.ts",
  "src/lib/email/waitlist.ts",
  "src/lib/actions/subscription.ts",
  "src/lib/hooks/useSubscription.ts",
  "src/store/waitlist.ts",
  "src/app/(common)/settings/waitlist/page.tsx",
];

/**
 * Recursively clean a mirrored directory: remove all symlinked files,
 * then remove empty directories bottom-up.
 */
function cleanMirroredDir(dirPath: string, label: string): number {
  let cleaned = 0;
  try {
    if (!fs.existsSync(dirPath)) return 0;

    if (fs.lstatSync(dirPath).isSymbolicLink()) {
      // Legacy: single directory symlink
      fs.unlinkSync(dirPath);
      console.log(`  Removed symlink: ${label}`);
      return 1;
    }

    if (fs.statSync(dirPath).isDirectory()) {
      const entries = fs.readdirSync(dirPath);
      for (const entry of entries) {
        const entryPath = path.join(dirPath, entry);
        const entryLabel = `${label}/${entry}`;

        if (fs.lstatSync(entryPath).isSymbolicLink()) {
          fs.unlinkSync(entryPath);
          console.log(`  Removed symlink: ${entryLabel}`);
          cleaned++;
        } else if (fs.statSync(entryPath).isDirectory()) {
          // Recurse into subdirectories
          cleaned += cleanMirroredDir(entryPath, entryLabel);
        }
      }
      // Remove the directory if now empty
      const remaining = fs.readdirSync(dirPath);
      if (remaining.length === 0) {
        fs.rmdirSync(dirPath);
      }
    }
  } catch {
    // Ignore errors
  }
  return cleaned;
}

function cleanSymlinks(): void {
  console.log("[clean-saas-symlinks] Removing SaaS symlinks...");

  let cleaned = 0;

  // Clean expanded directories (real dirs with symlinked children)
  for (const dir of EXPANDED_DIRS) {
    cleaned += cleanMirroredDir(path.join(ROOT_DIR, dir), dir);
  }

  // Remove file symlinks and restore backups
  for (const target of FILE_OVERRIDES) {
    const fullPath = path.join(ROOT_DIR, target);
    const backupPath = fullPath + ".os-backup";
    try {
      if (fs.existsSync(fullPath) && fs.lstatSync(fullPath).isSymbolicLink()) {
        fs.unlinkSync(fullPath);
        // Restore the open-source backup if it exists
        if (fs.existsSync(backupPath)) {
          fs.renameSync(backupPath, fullPath);
          console.log(`  Restored: ${target}`);
        } else {
          console.log(`  Removed symlink: ${target} (no backup to restore)`);
        }
        cleaned++;
      }
    } catch {
      // Ignore errors
    }
  }

  // Restore route conflict backups (files removed by setup-saas.ts)
  const routeConflictBackups = ["src/app/(open)/page.tsx"];
  for (const target of routeConflictBackups) {
    const fullPath = path.join(ROOT_DIR, target);
    const backupPath = fullPath + ".os-backup";
    try {
      if (!fs.existsSync(fullPath) && fs.existsSync(backupPath)) {
        fs.renameSync(backupPath, fullPath);
        console.log(`  Restored route: ${target}`);
        cleaned++;
      }
    } catch {
      // Ignore errors
    }
  }

  // Clean up empty directories left behind
  const emptyDirCandidates = [
    "src/saas",
    "src/app/api/admin",
    "src/app/(saas)",
  ];
  for (const dir of emptyDirCandidates) {
    const fullPath = path.join(ROOT_DIR, dir);
    try {
      if (
        fs.existsSync(fullPath) &&
        fs.statSync(fullPath).isDirectory() &&
        fs.readdirSync(fullPath).length === 0
      ) {
        fs.rmdirSync(fullPath);
      }
    } catch {
      // Ignore errors
    }
  }

  if (cleaned === 0) {
    console.log("  No SaaS symlinks found.");
  } else {
    console.log(`  Cleaned ${cleaned} symlink(s).`);
  }
}

cleanSymlinks();
