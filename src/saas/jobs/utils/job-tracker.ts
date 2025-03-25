import { Job } from "bullmq";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

const LOG_SOURCE = "JobTracker";

// Define a type for job results
type JobResult = string | number | boolean | null | Record<string, unknown>;

/**
 * Track a job in the database
 * @param job The BullMQ job to track
 * @param userId Optional user ID associated with the job
 */
export async function trackJob(job: Job, userId?: string): Promise<void> {
  try {
    await prisma.jobRecord.upsert({
      where: {
        queueName_jobId: {
          queueName: job.queueName,
          jobId: job.id?.toString() || "unknown",
        },
      },
      update: {
        attempts: job.attemptsMade,
        status: getJobStatus(job),
      },
      create: {
        queueName: job.queueName,
        jobId: job.id?.toString() || "unknown",
        name: job.name,
        data: job.data,
        attempts: job.attemptsMade,
        maxAttempts: job.opts.attempts || 3,
        status: getJobStatus(job),
        userId: userId,
      },
    });
  } catch (error) {
    logger.error(
      `Failed to track job ${job.id} in queue ${job.queueName}`,
      {
        jobId: job.id || "unknown",
        queueName: job.queueName,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      LOG_SOURCE
    );
  }
}

/**
 * Update job status when it starts processing
 * @param job The BullMQ job that started
 */
export async function trackJobStart(job: Job): Promise<void> {
  try {
    await prisma.jobRecord.update({
      where: {
        queueName_jobId: {
          queueName: job.queueName,
          jobId: job.id?.toString() || "unknown",
        },
      },
      data: {
        status: "ACTIVE",
        startedAt: new Date(),
        attempts: job.attemptsMade,
      },
    });
  } catch (error) {
    logger.error(
      `Failed to update job ${job.id} status to ACTIVE`,
      {
        jobId: job.id || "unknown",
        queueName: job.queueName,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      LOG_SOURCE
    );
  }
}

/**
 * Update job status when it completes
 * @param job The BullMQ job that completed
 * @param result The result of the job
 */
export async function trackJobCompletion<T, R extends JobResult>(
  job: Job<T, R, string>,
  result: R
): Promise<void> {
  try {
    await prisma.jobRecord.update({
      where: {
        queueName_jobId: {
          queueName: job.queueName,
          jobId: job.id?.toString() || "unknown",
        },
      },
      data: {
        status: "COMPLETED",
        finishedAt: new Date(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        result: result as any, // Cast to any for database storage
        attempts: job.attemptsMade,
      },
    });
  } catch (error) {
    logger.error(
      `Failed to update job ${job.id} status to COMPLETED`,
      {
        jobId: job.id || "unknown",
        queueName: job.queueName,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      LOG_SOURCE
    );
  }
}

/**
 * Update job status when it fails
 * @param job The BullMQ job that failed
 * @param error The error that caused the job to fail
 */
export async function trackJobFailure(job: Job, error: Error): Promise<void> {
  try {
    await prisma.jobRecord.update({
      where: {
        queueName_jobId: {
          queueName: job.queueName,
          jobId: job.id?.toString() || "unknown",
        },
      },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        error: error.message,
        attempts: job.attemptsMade,
      },
    });

    logger.error(
      `Job ${job.id} in queue ${job.queueName} failed`,
      {
        jobId: job.id || "unknown",
        queueName: job.queueName,
        error: error.message,
      },
      LOG_SOURCE
    );
  } catch (dbError) {
    logger.error(
      `Failed to update job ${job.id} status to FAILED`,
      {
        jobId: job.id || "unknown",
        queueName: job.queueName,
        error: dbError instanceof Error ? dbError.message : "Unknown error",
        jobError: error.message,
      },
      LOG_SOURCE
    );
  }
}

/**
 * Get the job status from a BullMQ job
 * @param job The BullMQ job
 * @returns The job status
 */
function getJobStatus(
  job: Job
): "PENDING" | "ACTIVE" | "COMPLETED" | "FAILED" | "DELAYED" | "PAUSED" {
  // Since we can't await in a synchronous function, use a simpler approach
  // based on job properties that are immediately available

  // Check if the job has a finishedOn timestamp
  if (job.finishedOn) {
    // If the job has a failedReason, it failed
    if (job.failedReason) return "FAILED";
    // Otherwise, it completed successfully
    return "COMPLETED";
  }

  // Check if the job is currently being processed
  if (job.processedOn && !job.finishedOn) return "ACTIVE";

  // Check if the job is delayed
  if (job.delay && job.delay > 0) return "DELAYED";

  // Default to PENDING for all other cases
  return "PENDING";
}
