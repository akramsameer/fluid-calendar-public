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
    const schedulerId = Math.random().toString(36).substring(2, 15);
    const stackTrace = new Error().stack;

    logger.info(
      "🕐📅 SCHEDULER: STARTING SYNC JOB SCHEDULING",
      {
        scheduler_id: schedulerId,
        fullSync,
        timestamp: new Date().toISOString(),
        stackTrace:
          stackTrace?.split("\n").slice(0, 8).join("\n") || "No stack trace",
        schedulingReason: fullSync ? "FULL_SYNC_REQUESTED" : "PERIODIC_SYNC",
      },
      LOG_SOURCE
    );

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
        "🔍📊 SCHEDULER: FOUND PROVIDERS FOR SYNC",
        {
          scheduler_id: schedulerId,
          totalProviders: enabledProviders.length,
          fullSync,
          providers: enabledProviders.map((provider) => ({
            id: provider.id,
            userId: provider.userId,
            type: provider.type,
            name: provider.name,
            syncInterval: provider.syncInterval,
            lastSyncedAt: provider.lastSyncedAt?.toISOString() || "never",
            syncEnabled: provider.syncEnabled,
            timeSinceLastSync: provider.lastSyncedAt
              ? Math.round(
                  (Date.now() - provider.lastSyncedAt.getTime()) / (1000 * 60)
                ) + " minutes"
              : "never synced",
          })),
          currentTime: new Date().toISOString(),
        },
        LOG_SOURCE
      );

      // Schedule a sync job for each provider
      let scheduledCount = 0;
      for (const provider of enabledProviders) {
        try {
          logger.info(
            "🚀📤 SCHEDULER: SCHEDULING SYNC JOB FOR PROVIDER",
            {
              scheduler_id: schedulerId,
              providerId: provider.id,
              providerName: provider.name,
              providerType: provider.type,
              userId: provider.userId,
              syncInterval: provider.syncInterval,
              lastSyncedAt: provider.lastSyncedAt?.toISOString() || "never",
              fullSync,
              jobType: "provider_sync",
            },
            LOG_SOURCE
          );

          await addTaskSyncJob({
            userId: provider.userId,
            providerId: provider.id,
            syncAll: true,
            fullSync,
          });

          scheduledCount++;

          logger.info(
            "✅📤 SCHEDULER: SYNC JOB SCHEDULED FOR PROVIDER",
            {
              scheduler_id: schedulerId,
              providerId: provider.id,
              providerName: provider.name,
              userId: provider.userId,
              syncInterval: provider.syncInterval,
              scheduledCount,
            },
            LOG_SOURCE
          );
        } catch (providerError) {
          logger.error(
            "❌📤 SCHEDULER: FAILED TO SCHEDULE SYNC JOB FOR PROVIDER",
            {
              scheduler_id: schedulerId,
              providerId: provider.id,
              providerName: provider.name,
              userId: provider.userId,
              error:
                providerError instanceof Error
                  ? providerError.message
                  : "Unknown error",
              errorStack:
                providerError instanceof Error && providerError.stack
                  ? providerError.stack
                  : "No stack trace",
            },
            LOG_SOURCE
          );
          // Continue with other providers
        }
      }

      logger.info(
        "🎉📅 SCHEDULER: SYNC JOB SCHEDULING COMPLETED",
        {
          scheduler_id: schedulerId,
          totalProvidersFound: enabledProviders.length,
          totalJobsScheduled: scheduledCount,
          fullSync,
          completedAt: new Date().toISOString(),
        },
        LOG_SOURCE
      );

      return scheduledCount;
    } catch (error) {
      logger.error(
        "💥📅 SCHEDULER: SYNC JOB SCHEDULING ERROR",
        {
          scheduler_id: schedulerId,
          error: error instanceof Error ? error.message : "Unknown error",
          errorStack:
            error instanceof Error && error.stack
              ? error.stack
              : "No stack trace",
          fullSync,
          timestamp: new Date().toISOString(),
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
