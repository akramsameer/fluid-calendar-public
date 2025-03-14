import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/api-auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { JobStatus } from "@prisma/client";
import { queues } from "@/saas/jobs/queues";

const LOG_SOURCE = "RetryJobAPI";

/**
 * POST /api/admin/jobs/retry
 * Retries a failed job by updating the existing record
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

    // Update the job record to reset its status and attempts
    await prisma.jobRecord.update({
      where: {
        id: jobRecord.id,
      },
      data: {
        status: JobStatus.PENDING,
        attempts: 0,
        error: null,
        updatedAt: new Date(),
        startedAt: null,
        finishedAt: null,
      },
    });

    // Add the job back to the queue with the same job ID
    await queue.add(jobRecord.name, jobRecord.data as Record<string, unknown>, {
      jobId: jobRecord.jobId,
    });

    logger.info(
      `Retried job ${jobId}`,
      {
        jobId,
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
