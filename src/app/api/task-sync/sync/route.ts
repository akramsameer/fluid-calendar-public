import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { addTaskSyncJob } from "@/saas/jobs/queues";

const LOG_SOURCE = "task-sync-api";

// Schema for triggering a sync
const syncSchema = z.object({
  mappingId: z.string().optional(),
  providerId: z.string().optional(),
  fullSync: z.boolean().optional().default(false),
});

/**
 * POST /api/task-sync/sync
 * Trigger a task synchronization
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;

    // Parse and validate the request body
    const body = await request.json();
    const validatedData = syncSchema.parse(body);

    // If neither mappingId nor providerId is provided, sync all for the user
    if (!validatedData.mappingId && !validatedData.providerId) {
      // Get all providers for the user
      const providers = await prisma.taskProvider.findMany({
        where: {
          userId,
          syncEnabled: true,
        },
        select: {
          id: true,
        },
      });

      // Add a sync job for each provider
      for (const provider of providers) {
        await addTaskSyncJob({
          userId,
          providerId: provider.id,
          syncAll: true,
          fullSync: validatedData.fullSync,
        });
      }

      return NextResponse.json({
        message: "Sync jobs added for all providers",
        count: providers.length,
      });
    }

    // If providerId is provided, sync all mappings for that provider
    if (validatedData.providerId) {
      // Verify the provider exists and belongs to the user
      const provider = await prisma.taskProvider.findUnique({
        where: {
          id: validatedData.providerId,
          userId,
        },
      });

      if (!provider) {
        return NextResponse.json(
          { error: "Provider not found or does not belong to the user" },
          { status: 404 }
        );
      }

      // Add the sync job
      await addTaskSyncJob({
        userId,
        providerId: validatedData.providerId,
        syncAll: true,
        fullSync: validatedData.fullSync,
      });

      return NextResponse.json({
        message: "Sync job added for provider",
        providerId: validatedData.providerId,
      });
    }

    // If mappingId is provided, sync just that mapping
    if (validatedData.mappingId) {
      // Verify the mapping exists and belongs to the user (via provider)
      const mapping = await prisma.taskListMapping.findUnique({
        where: {
          id: validatedData.mappingId,
        },
        include: {
          provider: {
            select: {
              id: true,
              userId: true,
            },
          },
        },
      });

      if (!mapping) {
        return NextResponse.json(
          { error: "Mapping not found" },
          { status: 404 }
        );
      }

      if (mapping.provider.userId !== userId) {
        return NextResponse.json(
          { error: "Unauthorized access to mapping" },
          { status: 403 }
        );
      }

      // Add the sync job
      await addTaskSyncJob({
        userId,
        providerId: mapping.provider.id,
        mappingId: validatedData.mappingId,
        syncAll: false,
        fullSync: validatedData.fullSync,
      });

      return NextResponse.json({
        message: "Sync job added for mapping",
        mappingId: validatedData.mappingId,
      });
    }

    // This should never be reached due to the validations above
    return NextResponse.json(
      { error: "Invalid request - missing required parameters" },
      { status: 400 }
    );
  } catch (error) {
    logger.error(
      "Failed to trigger task sync",
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      LOG_SOURCE
    );

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to trigger task sync" },
      { status: 500 }
    );
  }
}
