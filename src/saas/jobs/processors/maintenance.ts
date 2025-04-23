import { Job } from "bullmq";

import { newDate, subHours } from "@/lib/date-utils";
import { logger } from "@/lib/logger";

import { MaintenanceJobData, QUEUE_NAMES } from "../queues";
import { prisma } from "../utils/prisma-utils";
import { BaseProcessor } from "./base-processor";

const LOG_SOURCE = "MaintenanceProcessor";

/**
 * Maintenance processor for system maintenance tasks like cleaning up orphaned records
 */
export class MaintenanceProcessor extends BaseProcessor<
  MaintenanceJobData & Record<string, unknown>,
  { success: boolean; cleanedCount: number }
> {
  constructor() {
    super(QUEUE_NAMES.MAINTENANCE);
  }

  /**
   * Process a maintenance job
   * @param job The maintenance job to process
   */
  protected async process(
    job: Job<MaintenanceJobData & Record<string, unknown>>
  ): Promise<{ success: boolean; cleanedCount: number }> {
    const { olderThanHours = 24 } = job.data;

    logger.info(
      `Cleaning up orphaned job records older than ${olderThanHours} hours`,
      { olderThanHours },
      LOG_SOURCE
    );

    try {
      // Calculate the cutoff time
      const cutoffDate = subHours(newDate(), olderThanHours);

      // Find orphaned records
      const orphanedRecords = await prisma.jobRecord.findMany({
        where: {
          status: "PENDING",
          createdAt: {
            lt: cutoffDate,
          },
        },
      });

      logger.info(
        `Found ${orphanedRecords.length} orphaned job records`,
        { count: orphanedRecords.length },
        LOG_SOURCE
      );

      // Update them to FAILED status
      if (orphanedRecords.length > 0) {
        await prisma.jobRecord.updateMany({
          where: {
            status: "PENDING",
            createdAt: {
              lt: cutoffDate,
            },
          },
          data: {
            status: "FAILED",
            error:
              "Job was never processed - likely orphaned due to queue failure",
            finishedAt: new Date(),
          },
        });
      }

      return {
        success: true,
        cleanedCount: orphanedRecords.length,
      };
    } catch (error) {
      logger.error(
        "Failed to clean up orphaned job records",
        { error: error instanceof Error ? error.message : "Unknown error" },
        LOG_SOURCE
      );

      throw error;
    }
  }
}

// Create and export a singleton instance
export const maintenanceProcessor = new MaintenanceProcessor();
