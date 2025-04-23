import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

import { addTaskSyncJob } from "../queues";

const LOG_SOURCE = "TaskSyncScheduler";

/**
 * Task Sync Scheduler
 *
 * Schedules task sync jobs based on provider settings
 * This is used by the cron job in worker.ts
 */
export class TaskSyncScheduler {
  /**
   * Schedule sync jobs for all users with enabled providers
   *
   * @param fullSync Whether to perform a full sync (default: false)
   * @returns Number of sync jobs scheduled
   */
  static async scheduleAllSyncJobs(fullSync = false): Promise<number> {
    logger.info("Scheduling task sync jobs for all users", {}, LOG_SOURCE);

    try {
      // Get all enabled task providers
      const enabledProviders = await prisma.taskProvider.findMany({
        where: {
          syncEnabled: true,
          // Only select providers that need to be synced based on their interval
          OR: [
            // For providers set to sync hourly, sync if last sync was more than 45 minutes ago
            {
              syncInterval: "hourly",
              lastSyncedAt: {
                lt: new Date(Date.now() - 45 * 60 * 1000),
              },
            },
            // For providers set to sync daily, sync if last sync was more than 23 hours ago
            {
              syncInterval: "daily",
              lastSyncedAt: {
                lt: new Date(Date.now() - 23 * 60 * 60 * 1000),
              },
            },
            // For providers that have never been synced (null lastSyncedAt)
            {
              lastSyncedAt: null,
            },
            // For providers set to manual sync, don't auto-sync
          ],
        },
      });

      logger.info(
        `Found ${enabledProviders.length} providers to sync`,
        {},
        LOG_SOURCE
      );

      // Schedule a sync job for each provider
      for (const provider of enabledProviders) {
        await addTaskSyncJob({
          userId: provider.userId,
          providerId: provider.id,
          syncAll: true,
          fullSync,
        });

        logger.info(
          `Scheduled sync for provider ${provider.id} (${provider.name})`,
          {
            providerId: provider.id,
            userId: provider.userId,
            syncInterval: provider.syncInterval,
          },
          LOG_SOURCE
        );
      }

      return enabledProviders.length;
    } catch (error) {
      logger.error(
        "Failed to schedule task sync jobs",
        {
          error: error instanceof Error ? error.message : "Unknown error",
        },
        LOG_SOURCE
      );
      return 0;
    }
  }

  /**
   * Schedule a full sync for all providers
   * This is typically used for manual syncs or after significant changes
   *
   * @returns Number of sync jobs scheduled
   */
  static async scheduleFullSync(): Promise<number> {
    return this.scheduleAllSyncJobs(true);
  }
}
