import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { requireAdmin } from "@/lib/auth/api-auth";
import { z } from "zod";

const LOG_SOURCE = "BulkDeleteAPI";

// Validation schema for bulk delete request
const bulkDeleteSchema = z.object({
  ids: z.array(z.string()).min(1, "At least one ID must be provided"),
});

/**
 * POST /api/waitlist/bulk/delete
 * Deletes multiple waitlist entries
 * Admin-only endpoint
 */
export async function POST(request: NextRequest) {
  try {
    // Check if user is admin
    const authResponse = await requireAdmin(request);
    if (authResponse) return authResponse;

    // Parse and validate request body
    const body = await request.json();
    const result = bulkDeleteSchema.safeParse(body);

    if (!result.success) {
      logger.warn(
        "Invalid bulk delete request",
        {
          errorMessages: result.error.errors.map((err) => err.message),
        },
        LOG_SOURCE
      );

      return NextResponse.json(
        {
          message: "Invalid request data",
          errors: result.error.errors,
        },
        { status: 400 }
      );
    }

    const { ids } = result.data;

    // Delete the entries
    const deleteResult = await prisma.waitlist.deleteMany({
      where: {
        id: { in: ids },
      },
    });

    logger.info(
      "Deleted waitlist entries",
      {
        requestedCount: ids.length,
        deletedCount: deleteResult.count,
      },
      LOG_SOURCE
    );

    return NextResponse.json({
      message: "Entries deleted successfully",
      deletedCount: deleteResult.count,
    });
  } catch (error) {
    logger.error(
      "Error deleting waitlist entries",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );

    return NextResponse.json(
      { message: "Failed to delete entries" },
      { status: 500 }
    );
  }
}
