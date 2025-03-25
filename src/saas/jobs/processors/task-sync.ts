import { Job } from "bullmq";
import { BaseProcessor } from "./base-processor";
import { QUEUE_NAMES, TaskSyncJobData } from "../queues";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { TaskSyncManager } from "@/lib/task-sync/task-sync-manager";
import { getRedisOptions } from "../config/redis";

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
      `Processing task sync job: ${job.id}`,
      {
        jobId: job.id || "",
        mappingId: mappingId || "",
        providerId: providerId || "",
        userId: userId || "",
        syncAll: syncAll || false,
        fullSync: fullSync || false,
        direction: direction || "bidirectional",
      },
      LOG_SOURCE
    );

    try {
      // Different sync strategies based on the job data
      if (syncAll && userId) {
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

        return {
          success: results.every((r) => r.success),
          message: `Synced all task lists for user ${userId}`,
          details: totals,
        };
      } else if (mappingId) {
        // Sync a specific mapping
        // Get the mapping with its provider
        const mapping = await prisma.taskListMapping.findUnique({
          where: { id: mappingId },
          include: { provider: true },
        });

        if (!mapping) {
          throw new Error(`Task list mapping not found: ${mappingId}`);
        }

        const result = await this.syncManager.syncTaskList(mapping);

        return {
          success: result.success,
          message: `Synced task list mapping ${mappingId}`,
          details: {
            imported: result.imported,
            updated: result.updated,
            deleted: result.deleted,
            skipped: result.skipped,
            errors: result.errors,
          },
        };
      } else if (providerId) {
        // Sync all mappings for a specific provider
        // Get all mappings for this provider
        const mappings = await prisma.taskListMapping.findMany({
          where: { providerId },
        });

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
      // Log and return error
      logger.error(
        "Task sync job failed",
        {
          jobId: job.id || "",
          error: error instanceof Error ? error.message : "Unknown error",
        },
        LOG_SOURCE
      );

      return {
        success: false,
        message: `Task sync failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  }
}

// Export singleton instance
export const taskSyncProcessor = new TaskSyncProcessor();
