import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { JobStatus } from "@prisma/client";

const LOG_SOURCE = "JobCreator";

/**
 * Track a job in the database when it's created
 * @param queueName The name of the queue
 * @param jobId The ID of the job
 * @param name The name of the job
 * @param data The job data
 * @param userId Optional user ID associated with the job
 */
export async function trackJobCreation(
  queueName: string,
  jobId: string,
  name: string,
  data: unknown,
  userId?: string
): Promise<void> {
  try {
    await prisma.jobRecord.upsert({
      where: {
        queueName_jobId: {
          queueName,
          jobId,
        },
      },
      update: {
        // If the job already exists, don't update anything
      },
      create: {
        queueName,
        jobId,
        name,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: data as any, // Cast to any for database storage
        attempts: 0,
        maxAttempts: 3,
        status: JobStatus.PENDING,
        userId,
      },
    });

    logger.info(
      `Created job record for ${jobId} in queue ${queueName}`,
      {
        jobId,
        queueName,
        jobName: name,
        userId: userId || "unknown",
      },
      LOG_SOURCE
    );
  } catch (error) {
    logger.error(
      `Failed to create job record for ${jobId} in queue ${queueName}`,
      {
        jobId,
        queueName,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      LOG_SOURCE
    );
  }
}
