import { Job } from "bullmq";

import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { TaskSyncManager } from "@/lib/task-sync/task-sync-manager";

import { getRedisOptions } from "../config/redis";
import { QUEUE_NAMES, TaskSyncJobData } from "../queues";
import { BaseProcessor } from "./base-processor";

// Results from a task sync job
interface TaskSyncJobResult {
  success: boolean;
  message: string;
  details?: {
    imported?: number;
    updated?: number;
    deleted?: number;
    skipped?: number;
    errors?: Array<{ taskId: string; error: string }>;
  };
  [key: string]: unknown; // Add index signature to satisfy JobResult constraint
}

// Log source name
const LOG_SOURCE = "TaskSyncProcessor";

/**
 * Processor for task sync jobs
 * Handles synchronization between FluidCalendar and external task providers
 */
export class TaskSyncProcessor extends BaseProcessor<
  TaskSyncJobData,
  TaskSyncJobResult
> {
  // Singleton instance of the task sync manager
  private syncManager: TaskSyncManager;

  constructor() {
    // Add connection: null as a workaround for the WorkerOptions type
    super(QUEUE_NAMES.TASK_SYNC, {
      ...getRedisOptions(),
      concurrency: 5, // Process up to 5 sync jobs at once
      lockDuration: 5 * 60 * 1000, // 5 minutes lock
      stalledInterval: 60000, // Check for stalled jobs every minute
    });

    // Initialize the task sync manager
    this.syncManager = new TaskSyncManager();

    logger.info("Task sync processor initialized", {}, LOG_SOURCE);
  }

  /**
   * Process a task sync job
   */
  protected async process(
    job: Job<TaskSyncJobData>
  ): Promise<TaskSyncJobResult> {
    const { mappingId, providerId, userId, syncAll, fullSync, direction } =
      job.data;

    logger.info(
      "Starting task sync job",
      {
        jobId: job.id || "",
        userId: userId || "none",
        syncAll: syncAll || false,
        fullSync: fullSync || false,
        direction: direction || "bidirectional",
      },
      LOG_SOURCE
    );

    try {
      // Different sync strategies based on the job data
      if (syncAll && userId) {
        logger.info(
          "Sync all mappings for user",
          {
            userId,
            syncType: "ALL_USER_MAPPINGS",
          },
          LOG_SOURCE
        );

        // Sync all mappings for a user
        const results = await this.syncManager.syncAllForUser(userId);

        // Calculate totals
        const totals = results.reduce(
          (
            acc: {
              imported: number;
              updated: number;
              deleted: number;
              skipped: number;
              errors: Array<{ taskId: string; error: string }>;
            },
            r
          ) => {
            acc.imported += r.imported;
            acc.updated += r.updated;
            acc.deleted += r.deleted;
            acc.skipped += r.skipped;
            acc.errors.push(...r.errors);
            return acc;
          },
          {
            imported: 0,
            updated: 0,
            deleted: 0,
            skipped: 0,
            errors: [] as Array<{ taskId: string; error: string }>,
          }
        );

        logger.info(
          "Sync all user mappings completed",
          {
            userId,
            imported: totals.imported,
            updated: totals.updated,
            deleted: totals.deleted,
            skipped: totals.skipped,
            errors: totals.errors.length,
            mappingsProcessed: results.length,
          },
          LOG_SOURCE
        );

        return {
          success: results.every((r) => r.success),
          message: `Synced all task lists for user ${userId}`,
          details: totals,
        };
      } else if (mappingId) {
        logger.info(
          "Sync specific mapping",
          {
            mappingId,
            syncType: "SPECIFIC_MAPPING",
          },
          LOG_SOURCE
        );

        // Sync a specific mapping
        const result = await this.syncManager.syncTaskList(mappingId);

        logger.info(
          "Sync specific mapping completed",
          {
            mappingId,
            success: result.success,
            imported: result.imported,
            updated: result.updated,
            deleted: result.deleted,
            skipped: result.skipped,
            errors: result.errors.length,
          },
          LOG_SOURCE
        );

        return {
          success: result.success,
          message: `Synced task list ${mappingId}`,
          details: result,
        };
      } else if (providerId) {
        logger.info(
          "Sync all provider mappings",
          {
            providerId,
            syncType: "ALL_PROVIDER_MAPPINGS",
          },
          LOG_SOURCE
        );

        // Sync all mappings for a specific provider
        // Get all mappings for this provider
        const mappings = await prisma.taskListMapping.findMany({
          where: { providerId },
        });

        logger.info(
          "Found provider mappings",
          {
            providerId,
            mappingsCount: mappings.length,
          },
          LOG_SOURCE
        );

        // Sync each mapping
        const results = await Promise.all(
          mappings.map((mapping: { id: string }) =>
            this.syncManager.syncTaskList(mapping.id)
          )
        );

        // Calculate totals
        const totals = results.reduce(
          (
            acc: {
              imported: number;
              updated: number;
              deleted: number;
              skipped: number;
              errors: Array<{ taskId: string; error: string }>;
            },
            r
          ) => {
            acc.imported += r.imported;
            acc.updated += r.updated;
            acc.deleted += r.deleted;
            acc.skipped += r.skipped;
            acc.errors.push(...r.errors);
            return acc;
          },
          {
            imported: 0,
            updated: 0,
            deleted: 0,
            skipped: 0,
            errors: [] as Array<{ taskId: string; error: string }>,
          }
        );

        logger.info(
          "Sync all provider mappings completed",
          {
            providerId,
            imported: totals.imported,
            updated: totals.updated,
            deleted: totals.deleted,
            skipped: totals.skipped,
            errors: totals.errors.length,
            mappingsProcessed: mappings.length,
          },
          LOG_SOURCE
        );

        return {
          success: results.every((r: { success: boolean }) => r.success),
          message: `Synced all task lists for provider ${providerId}`,
          details: totals,
        };
      } else {
        // No valid sync target specified
        logger.error(
          "Invalid task sync job: no valid sync target",
          {
            jobId: job.id || "",
            error: "Invalid task sync job: no valid sync target",
          },
          LOG_SOURCE
        );

        return {
          success: false,
          message: "Invalid task sync job: no valid sync target specified",
        };
      }
    } catch (error) {
      logger.error(
        "Task sync processor error",
        {
          jobId: job.id || "",
          error: error instanceof Error ? error.message : "Unknown error",
        },
        LOG_SOURCE
      );

      throw error;
    }
  }
}

// Export singleton instance
export const taskSyncProcessor = new TaskSyncProcessor();
