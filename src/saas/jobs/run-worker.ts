#!/usr/bin/env node
/**
 * This script is used to run the worker process.
 * It ensures that all path aliases like @/ are properly resolved.
 */

import { initializeQueues } from "./queues";
import { logger } from "@/lib/logger";
import { setupScheduledJobs } from "./worker";

const LOG_SOURCE = "WorkerRunner";

async function main() {
  try {
    logger.info("Starting worker process...", {}, LOG_SOURCE);

    // Initialize queues
    await initializeQueues();

    // Set up scheduled jobs
    await setupScheduledJobs();

    logger.info("Worker process started successfully", {}, LOG_SOURCE);

    // Keep the process running
    process.stdin.resume();

    // Handle process termination
    process.on("SIGINT", async () => {
      logger.info("Shutting down worker process...", {}, LOG_SOURCE);
      process.exit(0);
    });

    process.on("SIGTERM", async () => {
      logger.info("Shutting down worker process...", {}, LOG_SOURCE);
      process.exit(0);
    });
  } catch (error) {
    logger.error(
      "Failed to start worker process",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );
    process.exit(1);
  }
}

// Start the worker
main().catch((error) => {
  console.error("Unhandled error in worker process:", error);
  process.exit(1);
});
