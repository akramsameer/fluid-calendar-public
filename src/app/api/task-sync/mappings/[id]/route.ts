import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { authenticateRequest } from "@/lib/auth/api-auth";

const LOG_SOURCE = "task-sync-mapping-api";

// Schema for updating a task list mapping
const updateMappingSchema = z.object({
  externalListName: z.string().min(1).optional(),
  projectId: z.string().min(1).optional(),
  syncEnabled: z.boolean().optional(),
  settings: z.record(z.unknown()).optional(),
});

/**
 * GET /api/task-sync/mappings/[id]
 * Get a specific task list mapping
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;

    // Get the mapping
    const mapping = await prisma.taskListMapping.findUnique({
      where: {
        id: params.id,
      },
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            type: true,
            userId: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
            color: true,
            userId: true,
          },
        },
      },
    });

    if (!mapping) {
      return NextResponse.json({ error: "Mapping not found" }, { status: 404 });
    }

    // Verify the mapping belongs to the user (via provider and project)
    if (
      mapping.provider.userId !== userId ||
      mapping.project.userId !== userId
    ) {
      return NextResponse.json(
        { error: "Unauthorized access to mapping" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      mapping: {
        id: mapping.id,
        providerId: mapping.providerId,
        providerName: mapping.provider.name,
        providerType: mapping.provider.type,
        externalListId: mapping.externalListId,
        externalListName: mapping.externalListName,
        projectId: mapping.projectId,
        projectName: mapping.project.name,
        projectColor: mapping.project.color,
        syncEnabled: mapping.syncEnabled,
        lastSyncedAt: mapping.lastSyncedAt,
        settings: mapping.settings,
        createdAt: mapping.createdAt,
        updatedAt: mapping.updatedAt,
      },
    });
  } catch (error) {
    logger.error(
      "Failed to get task list mapping",
      {
        error: error instanceof Error ? error.message : "Unknown error",
        mappingId: params.id,
      },
      LOG_SOURCE
    );

    return NextResponse.json(
      { error: "Failed to get task list mapping" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/task-sync/mappings/[id]
 * Update a task list mapping
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;

    // Get the existing mapping
    const existingMapping = await prisma.taskListMapping.findUnique({
      where: {
        id: params.id,
      },
      include: {
        provider: {
          select: {
            userId: true,
          },
        },
        project: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!existingMapping) {
      return NextResponse.json({ error: "Mapping not found" }, { status: 404 });
    }

    // Verify the mapping belongs to the user (via provider and project)
    if (
      existingMapping.provider.userId !== userId ||
      existingMapping.project.userId !== userId
    ) {
      return NextResponse.json(
        { error: "Unauthorized access to mapping" },
        { status: 403 }
      );
    }

    // Parse and validate the request body
    const body = await request.json();
    const validatedData = updateMappingSchema.parse(body);

    // If projectId is changing, verify it belongs to the user
    if (
      validatedData.projectId &&
      validatedData.projectId !== existingMapping.projectId
    ) {
      const project = await prisma.project.findUnique({
        where: {
          id: validatedData.projectId,
          userId,
        },
      });

      if (!project) {
        return NextResponse.json(
          { error: "Project not found or does not belong to the user" },
          { status: 404 }
        );
      }
    }

    // Update the mapping
    const mapping = await prisma.taskListMapping.update({
      where: {
        id: params.id,
      },
      data: {
        ...(validatedData.externalListName && {
          externalListName: validatedData.externalListName,
        }),
        ...(validatedData.projectId && { projectId: validatedData.projectId }),
        ...(validatedData.syncEnabled !== undefined && {
          syncEnabled: validatedData.syncEnabled,
        }),
        ...(validatedData.settings && { settings: validatedData.settings }),
      },
      include: {
        provider: {
          select: {
            name: true,
            type: true,
          },
        },
        project: {
          select: {
            name: true,
            color: true,
          },
        },
      },
    });

    return NextResponse.json({
      mapping: {
        id: mapping.id,
        providerId: mapping.providerId,
        providerName: mapping.provider.name,
        providerType: mapping.provider.type,
        externalListId: mapping.externalListId,
        externalListName: mapping.externalListName,
        projectId: mapping.projectId,
        projectName: mapping.project.name,
        projectColor: mapping.project.color,
        syncEnabled: mapping.syncEnabled,
        lastSyncedAt: mapping.lastSyncedAt,
        settings: mapping.settings,
        createdAt: mapping.createdAt,
        updatedAt: mapping.updatedAt,
      },
    });
  } catch (error) {
    logger.error(
      "Failed to update task list mapping",
      {
        error: error instanceof Error ? error.message : "Unknown error",
        mappingId: params.id,
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
      { error: "Failed to update task list mapping" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/task-sync/mappings/[id]
 * Delete a task list mapping
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;

    // Get the existing mapping
    const existingMapping = await prisma.taskListMapping.findUnique({
      where: {
        id: params.id,
      },
      include: {
        provider: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!existingMapping) {
      return NextResponse.json({ error: "Mapping not found" }, { status: 404 });
    }

    // Verify the mapping belongs to the user (via provider)
    if (existingMapping.provider.userId !== userId) {
      return NextResponse.json(
        { error: "Unauthorized access to mapping" },
        { status: 403 }
      );
    }

    // Delete the mapping
    await prisma.taskListMapping.delete({
      where: {
        id: params.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Mapping deleted successfully",
    });
  } catch (error) {
    logger.error(
      "Failed to delete task list mapping",
      {
        error: error instanceof Error ? error.message : "Unknown error",
        mappingId: params.id,
      },
      LOG_SOURCE
    );

    return NextResponse.json(
      { error: "Failed to delete task list mapping" },
      { status: 500 }
    );
  }
}
