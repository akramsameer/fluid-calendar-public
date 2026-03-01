import { NextRequest, NextResponse } from "next/server";

import { addTaskScheduleJob } from "@saas/jobs/queues";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const LOG_SOURCE = "task-schedule-queue-route";

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;

    // Get user's auto-schedule settings
    const settings = await prisma.autoScheduleSettings.findUnique({
      where: { userId },
    });

    if (!settings) {
      return NextResponse.json(
        { error: "Auto-schedule settings not found" },
        { status: 404 }
      );
    }

    // Queue the task scheduling job
    const job = await addTaskScheduleJob({
      userId,
      settings: settings as Record<string, unknown>,
    });

    logger.info(
      "Task scheduling job queued",
      { userId, jobId: job.id },
      LOG_SOURCE
    );

    return NextResponse.json({
      success: true,
      message: "Task scheduling job queued",
      jobId: job.id,
    });
  } catch (error) {
    logger.error(
      "Error queueing task scheduling job",
      {
        error: error instanceof Error ? error.message : String(error),
      },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to queue task scheduling job" },
      { status: 500 }
    );
  }
}
