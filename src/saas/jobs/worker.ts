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
import { taskScheduleProcessor } from "./processors/task-schedule";
import { testCronProcessor, TestCronProcessor } from "./processors/test-cron";

const LOG_SOURCE = "Worker";

// Initialize all processors
// Import them to ensure they are instantiated
const processors = {
  email: emailProcessor,
  dailySummary: dailySummaryProcessor,
  maintenance: maintenanceProcessor,
  taskReminder: taskReminderProcessor,
  taskSchedule: taskScheduleProcessor,
  testCron: testCronProcessor,
  // Add other processors here as they are implemented
};

// Set up scheduled jobs
export async function setupScheduledJobs() {
  console.log("SETUP SCHEDULED JOBS STARTED");
  logger.info("Setting up scheduled jobs", {}, LOG_SOURCE);

  // Schedule daily summary emails at 5:00 AM every day
  console.log("Creating daily summary job...");
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
  console.log("Daily summary job created");

  // Schedule orphaned record cleanup at 4:30 AM every day
  console.log("Creating cleanup orphaned records job...");
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
  console.log("Cleanup orphaned records job created");

  // Schedule test cron job every 15 minutes
  console.log("CREATING TEST CRON JOB");
  console.log("TEST_CRON value:", process.env.TEST_CRON);
  const testCronJob = new CronJob(
    "*/1 * * * *", // Every 1 minute
    async () => {
      try {
        // Check if TEST_CRON is enabled
        console.log(
          "Test cron job running, TEST_CRON =",
          process.env.TEST_CRON
        );
        if (process.env.TEST_CRON === "false") {
          logger.info(
            "Test cron job is disabled by TEST_CRON=false",
            {},
            LOG_SOURCE
          );
          return;
        }

        logger.info("Running scheduled job: Test Cron Email", {}, LOG_SOURCE);
        console.log("Scheduling test email...");
        await TestCronProcessor.scheduleTestEmail("eibrahim@gmail.com");
        console.log("Test email scheduled");
      } catch (error) {
        console.error("Error in test cron job:", error);
        logger.error(
          "Error in scheduled job: Test Cron Email",
          { error: error instanceof Error ? error.message : "Unknown error" },
          LOG_SOURCE
        );
      }
    },
    null, // onComplete
    true, // start
    "UTC" // timezone
  );
  console.log("Test cron job created");

  // Add other scheduled jobs here
  console.log("CRON JOBS SET UP");
  logger.info("Scheduled jobs set up", {}, LOG_SOURCE);

  return {
    dailySummaryJob,
    cleanupOrphanedRecordsJob,
    testCronJob,
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
export async function main() {
  console.log("MAIN FUNCTION STARTED");
  try {
    logger.info("Starting worker...", {}, LOG_SOURCE);

    // Log environment variables
    console.log("Environment variables:");
    console.log("NODE_ENV:", process.env.NODE_ENV);
    console.log("APP_ENVIRONMENT:", process.env.APP_ENVIRONMENT);
    console.log("TEST_CRON:", process.env.TEST_CRON);
    console.log("DEBUG:", process.env.DEBUG);

    // Ensure Prisma connection is established
    console.log("Ensuring Prisma connection...");
    await ensurePrismaConnection();
    console.log("Prisma connection established");

    // Initialize queues
    console.log("Initializing queues...");
    await initializeQueues();
    console.log("Queues initialized");

    // Set up scheduled jobs
    // We don't use the return value but we need to call this to set up the jobs
    console.log("Setting up scheduled jobs...");
    await setupScheduledJobs();
    console.log("Scheduled jobs set up");

    logger.info("Worker started successfully", {}, LOG_SOURCE);
    console.log("MAIN FUNCTION COMPLETED SUCCESSFULLY");
  } catch (error) {
    console.error("Error in main function:", error);
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
