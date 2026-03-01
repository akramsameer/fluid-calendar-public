import { NextRequest, NextResponse } from "next/server";

import { addTaskSyncJob } from "@saas/jobs/queues";
import { z } from "zod";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

// Log source for this file
const LOG_SOURCE = "TaskSyncAPI";

// Schema for validating the sync request
const syncRequestSchema = z.object({
  // Either providerId or mappingId must be provided
  providerId: z.string().optional(),
  mappingId: z.string().optional(),
  // Optional direction parameter
  direction: z
    .enum(["incoming", "outgoing", "bidirectional"])
    .optional()
    .default("bidirectional"),
});

// Add a utility function to validate the direction parameter
function isValidDirection(
  direction: string
): direction is "incoming" | "outgoing" | "bidirectional" {
  return ["incoming", "outgoing", "bidirectional"].includes(direction);
}

/**
 * POST /api/task-sync/sync
 * Triggers a sync for a specific provider or mapping
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Authenticate the request
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      // If response exists, authentication failed
      return auth.response as NextResponse;
    }

    const userId = auth.userId;

    // Parse the request body
    const body = await request.json();
    const parseResult = syncRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request",
          message: "Please provide either providerId or mappingId",
          details: parseResult.error.format(),
        },
        { status: 400 }
      );
    }

    const { providerId, mappingId } = parseResult.data;
    let { direction } = parseResult.data;

    // Validate the direction parameter
    if (direction && !isValidDirection(direction)) {
      return NextResponse.json(
        {
          error: "Invalid direction",
          message:
            "Direction must be 'incoming', 'outgoing', or 'bidirectional'",
        },
        { status: 400 }
      );
    }

    // Ensure at least one of providerId or mappingId is provided
    if (!providerId && !mappingId) {
      return NextResponse.json(
        {
          error: "Invalid request",
          message: "Please provide either providerId or mappingId",
        },
        { status: 400 }
      );
    }

    // If providerId is provided, check if the provider belongs to the user
    if (providerId) {
      const provider = await prisma.taskProvider.findFirst({
        where: {
          id: providerId,
          userId,
        },
      });

      if (!provider) {
        return NextResponse.json(
          {
            error: "Not found",
            message: "Provider not found or does not belong to you",
          },
          { status: 404 }
        );
      }
    }

    // If mappingId is provided, check if the mapping belongs to the user
    if (mappingId) {
      const mapping = await prisma.taskListMapping.findFirst({
        where: {
          id: mappingId,
          provider: {
            userId,
          },
        },
      });

      if (!mapping) {
        return NextResponse.json(
          {
            error: "Not found",
            message: "Task list mapping not found or does not belong to you",
          },
          { status: 404 }
        );
      }

      // Use the mapping's direction if not explicitly provided
      if (!direction) {
        direction = mapping.direction as
          | "incoming"
          | "outgoing"
          | "bidirectional";
      }
    }

    // Add a job to the task sync queue
    const job = await addTaskSyncJob({
      userId,
      providerId,
      mappingId,
      direction,
    });

    logger.info(
      `Manual sync requested by user ${userId}`,
      {
        userId,
        providerId: providerId || null,
        mappingId: mappingId || null,
        jobId: job.id || null,
        direction,
      },
      LOG_SOURCE
    );

    return NextResponse.json({
      message: "Sync job scheduled",
      jobId: job.id,
    });
  } catch (error) {
    logger.error(
      "Error triggering manual sync",
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      LOG_SOURCE
    );

    return NextResponse.json(
      {
        error: "Server error",
        message: "Failed to schedule sync job",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/task-sync/sync/status?jobId=xxx
 * Gets the status of a sync job
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Authenticate the request
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      // If response exists, authentication failed
      return auth.response as NextResponse;
    }

    // Get the job ID from the query params
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");

    if (!jobId) {
      return NextResponse.json(
        {
          error: "Invalid request",
          message: "Please provide a jobId",
        },
        { status: 400 }
      );
    }

    // Get the job status from Redis
    // In Phase 1, we just return a generic status since we don't track job status
    return NextResponse.json({
      status: "Processing",
      message: "Sync job is in progress or completed",
      jobId,
    });
  } catch (error) {
    logger.error(
      "Error getting sync job status",
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      LOG_SOURCE
    );

    return NextResponse.json(
      {
        error: "Server error",
        message: "Failed to get sync job status",
      },
      { status: 500 }
    );
  }
}
