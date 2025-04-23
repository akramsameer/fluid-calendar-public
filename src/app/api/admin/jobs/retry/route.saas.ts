import { NextRequest, NextResponse } from "next/server";

import { queues } from "@/saas/jobs/queues";
import { JobStatus } from "@prisma/client";

import { requireAdmin } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const LOG_SOURCE = "RetryJobAPI";

/**
 * Generates a new job ID for a retry attempt
 * Format: originalJobId_retry_N where N is the retry number
 */
async function generateRetryJobId(jobId: string): Promise<string> {
  // If this is already a retry, increment the number
  if (jobId.includes("_retry_")) {
    const [baseId, retryNum] = jobId.split("_retry_");
    return `${baseId}_retry_${parseInt(retryNum) + 1}`;
  }

  // First retry
  return `${jobId}_retry_1`;
}

/**
 * POST /api/admin/jobs/retry
 * Retries a failed job by updating its ID and status
 */
export async function POST(request: NextRequest) {
  // Check if user is admin
  const authResponse = await requireAdmin(request);
  if (authResponse) return authResponse;

  try {
    const { jobId, queueName } = await request.json();

    if (!jobId) {
      return NextResponse.json(
        { error: "Job ID is required" },
        { status: 400 }
      );
    }

    if (!queueName) {
      return NextResponse.json(
        { error: "Queue name is required" },
        { status: 400 }
      );
    }

    // Find the job record using the compound unique key
    const jobRecord = await prisma.jobRecord.findUnique({
      where: {
        queueName_jobId: {
          queueName,
          jobId,
        },
      },
    });

    if (!jobRecord) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Check if job is failed
    if (jobRecord.status !== JobStatus.FAILED) {
      return NextResponse.json(
        { error: "Only failed jobs can be retried" },
        { status: 400 }
      );
    }

    // Get the queue for this job
    const queue = queues[jobRecord.queueName];
    if (!queue) {
      return NextResponse.json(
        { error: `Queue ${jobRecord.queueName} not found` },
        { status: 400 }
      );
    }

    // Generate new job ID for the retry
    const newJobId = await generateRetryJobId(jobId);

    // Update the existing job record with new ID and reset status
    await prisma.jobRecord.update({
      where: {
        id: jobRecord.id,
      },
      data: {
        jobId: newJobId,
        status: JobStatus.PENDING,
        attempts: 0,
        error: null,
        startedAt: null,
        finishedAt: null,
        updatedAt: new Date(),
      },
    });

    // Add the job back to the queue with the new job ID
    await queue.add(jobRecord.name, jobRecord.data as Record<string, unknown>, {
      jobId: newJobId,
    });

    logger.info(
      `Retried job ${jobId}`,
      {
        jobId,
        newJobId,
        queueName,
        jobName: jobRecord.name,
      },
      LOG_SOURCE
    );

    return NextResponse.json({
      success: true,
      message: "Job retried successfully",
      jobId,
    });
  } catch (error) {
    logger.error(
      "Error retrying job",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "An error occurred while retrying the job",
      },
      { status: 500 }
    );
  }
}
