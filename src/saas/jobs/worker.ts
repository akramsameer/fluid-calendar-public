// import { logger } from "@/lib/logger";
import { logger } from "@/lib/logger";
import { closeRedisConnection } from "./config/redis";
import { initializeQueues, closeQueues } from "./queues";
import { emailProcessor } from "./processors/email";
import {
  dailySummaryProcessor,
  DailySummaryProcessor,
} from "./processors/daily-summary";
import { maintenanceProcessor } from "./processors/maintenance";
import { taskReminderProcessor } from "./processors/task-reminder";
import { CronJob } from "cron";
import { ensurePrismaConnection, disconnectPrisma } from "./utils/prisma-utils";
import { addCleanupOrphanedRecordsJob } from "./queues";

const LOG_SOURCE = "Worker";

// Initialize all processors
// Import them to ensure they are instantiated
const processors = {
  email: emailProcessor,
  dailySummary: dailySummaryProcessor,
  maintenance: maintenanceProcessor,
  taskReminder: taskReminderProcessor,
  // Add other processors here as they are implemented
};

// Set up scheduled jobs
export async function setupScheduledJobs() {
  logger.info("Setting up scheduled jobs", {}, LOG_SOURCE);

  // Schedule daily summary emails at 5:00 AM every day
  const dailySummaryJob = new CronJob(
    "0 5 * * *", // At 5:00 AM every day
    async () => {
      try {
        logger.info(
          "Running scheduled job: Daily Summary Emails",
          {},
          LOG_SOURCE
        );
        await DailySummaryProcessor.scheduleForAllUsers();
      } catch (error) {
        logger.error(
          "Error in scheduled job: Daily Summary Emails",
          { error: error instanceof Error ? error.message : "Unknown error" },
          LOG_SOURCE
        );
      }
    },
    null, // onComplete
    true, // start
    "UTC" // timezone
  );

  // Schedule orphaned record cleanup at 4:30 AM every day
  const cleanupOrphanedRecordsJob = new CronJob(
    "30 4 * * *", // At 4:30 AM every day
    async () => {
      try {
        logger.info(
          "Running scheduled job: Cleanup Orphaned Records",
          {},
          LOG_SOURCE
        );
        await addCleanupOrphanedRecordsJob();
      } catch (error) {
        logger.error(
          "Error in scheduled job: Cleanup Orphaned Records",
          { error: error instanceof Error ? error.message : "Unknown error" },
          LOG_SOURCE
        );
      }
    },
    null, // onComplete
    true, // start
    "UTC" // timezone
  );

  // Add other scheduled jobs here

  logger.info("Scheduled jobs set up", {}, LOG_SOURCE);

  return {
    dailySummaryJob,
    cleanupOrphanedRecordsJob,
    // Add other jobs here
  };
}

// Graceful shutdown
export async function shutdown() {
  logger.info("Shutting down worker...", {}, LOG_SOURCE);

  // Close all processors
  for (const [name, processor] of Object.entries(processors)) {
    try {
      await processor.close();
      logger.info(`Closed processor: ${name}`, {}, LOG_SOURCE);
    } catch (error) {
      logger.error(
        `Error closing processor: ${name}`,
        { error: error instanceof Error ? error.message : "Unknown error" },
        LOG_SOURCE
      );
    }
  }

  // Close queues
  await closeQueues();

  // Close Redis connection
  await closeRedisConnection();

  // Disconnect Prisma
  await disconnectPrisma();

  logger.info("Worker shutdown complete", {}, LOG_SOURCE);

  process.exit(0);
}

// Handle process signals
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

// Main function
async function main() {
  try {
    logger.info("Starting worker...", {}, LOG_SOURCE);

    // Ensure Prisma connection is established
    await ensurePrismaConnection();

    // Initialize queues
    await initializeQueues();

    // Set up scheduled jobs
    // We don't use the return value but we need to call this to set up the jobs
    await setupScheduledJobs();

    logger.info("Worker started successfully", {}, LOG_SOURCE);
  } catch (error) {
    logger.error(
      "Failed to start worker",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );

    await shutdown();
  }
}

// Only run the main function if this file is executed directly
if (require.main === module) {
  // Start the worker
  main().catch((error) => {
    logger.error(
      "Unhandled error in worker",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );

    process.exit(1);
  });
}
