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
  "src/app/api/subscription/checkout",
  "src/app/api/subscription/status",
  "src/app/api/subscription/trial",
  "src/app/api/subscription/early-bird-status",
  "src/app/api/waitlist",
  "src/app/api/tasks/schedule-all/queue",
  "src/app/api/webhooks/stripe",
  "src/app/api/book",
  "src/app/api/booking-links",
  "src/app/api/bookings",
  "src/app/api/user/username",
  "src/app/api/cron/generate-article",
  "src/app/book",
  "src/app/(common)/bookings",
  "src/app/(marketing)/learn",
  "src/lib/stripe",
  "src/lib/booking",
  "src/lib/availability",
  "src/lib/seo",
  "src/lib/ai",
  "src/lib/subscription",
  "src/components/subscription",
  "src/saas/jobs",
  "src/saas/k8s",
];

/**
 * File symlinks that override open-source defaults.
 * When removed, the .os-backup file is restored if it exists.
 */
const FILE_OVERRIDES = [
  "src/lib/services/subscription.ts",
  "src/lib/services/calendar-provider-permissions.ts",
  "src/app/api/task-sync/sync/route.ts",
  "src/components/providers/NotificationProvider.tsx",
  "src/components/calendar/LifetimeAccessBanner.tsx",
  "src/components/ui/sponsorship-banner.tsx",
  "src/lib/email/email-service.ts",
  "src/lib/email/resend.ts",
  "src/lib/email/waitlist.ts",
  "src/lib/actions/subscription.ts",
  "src/hooks/useSubscription.ts",
  "src/hooks/use-early-bird-status.ts",
  "src/hooks/use-trial-activation.ts",
  "src/lib/utils/plan-comparison.ts",
  "src/lib/utils/plan-validation.ts",
  "src/lib/validations/booking.ts",
  "src/lib/username.ts",
  "src/lib/waitlist/position.ts",
  "src/types/subscription.ts",
  "src/types/booking.ts",
  "src/app/sitemap.ts",
  "src/components/settings/BookingLinksSettings.tsx",
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
      // Restore any .os-backup files (OS stubs that were backed up by setup-saas.ts)
      const afterEntries = fs.readdirSync(dirPath);
      for (const entry of afterEntries) {
        if (entry.endsWith(".os-backup")) {
          const originalName = entry.replace(".os-backup", "");
          const originalPath = path.join(dirPath, originalName);
          const backupPath = path.join(dirPath, entry);
          if (!fs.existsSync(originalPath)) {
            fs.renameSync(backupPath, originalPath);
            console.log(`  Restored: ${label}/${originalName}`);
            cleaned++;
          }
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
    "src/app/api/webhooks/stripe",
    "src/app/api/webhooks",
    "src/app/api/subscription/checkout",
    "src/app/api/subscription/status",
    "src/app/api/subscription/trial",
    "src/app/api/subscription/early-bird-status",
    "src/app/api/subscription/lifetime",
    "src/app/api/book",
    "src/app/api/booking-links",
    "src/app/api/bookings",
    "src/app/api/user/username",
    "src/app/api/cron/generate-article",
    "src/app/api/cron",
    "src/app/book",
    "src/app/(common)/bookings",
    "src/app/(marketing)/learn",
    "src/app/(marketing)",
    "src/app/(saas)",
    "src/lib/stripe",
    "src/lib/booking",
    "src/lib/availability",
    "src/lib/seo",
    "src/lib/ai",
    "src/lib/subscription",
    "src/components/subscription",
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
