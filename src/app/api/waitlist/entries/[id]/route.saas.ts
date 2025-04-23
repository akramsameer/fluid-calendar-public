import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { requireAdmin } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const LOG_SOURCE = "WaitlistEntryAPI";

// Validation schema for updating a waitlist entry
const updateEntrySchema = z.object({
  notes: z.string().optional(),
  priorityScore: z.number().int().min(0).max(1000).optional(),
  status: z.enum(["WAITING", "INVITED", "REGISTERED"]).optional(),
});

/**
 * GET /api/waitlist/entries/[id]
 * Retrieves detailed information about a specific waitlist entry
 * Admin-only endpoint
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if user is admin
    const authResponse = await requireAdmin(request);
    if (authResponse) return authResponse;

    const { id } = params;
    if (!id) {
      return NextResponse.json(
        { message: "Missing waitlist entry ID" },
        { status: 400 }
      );
    }

    // Fetch the waitlist entry
    const entry = await prisma.waitlist.findUnique({
      where: { id },
    });

    if (!entry) {
      return NextResponse.json(
        { message: "Waitlist entry not found" },
        { status: 404 }
      );
    }

    // Fetch referrals and referrer separately
    const referrals = await prisma.waitlist.findMany({
      where: { referredBy: id },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        createdAt: true,
      },
    });

    let referredBy = null;
    if (entry.referredBy) {
      referredBy = await prisma.waitlist.findUnique({
        where: { id: entry.referredBy },
        select: {
          id: true,
          email: true,
          name: true,
        },
      });
    }

    // Combine the data
    const entryWithRelations = {
      ...entry,
      referrals,
      referredBy,
    };

    logger.info("Fetched waitlist entry", { id }, LOG_SOURCE);

    return NextResponse.json(entryWithRelations);
  } catch (error) {
    logger.error(
      "Error fetching waitlist entry",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );

    return NextResponse.json(
      { message: "Failed to fetch waitlist entry" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/waitlist/entries/[id]
 * Updates a specific waitlist entry
 * Admin-only endpoint
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if user is admin
    const authResponse = await requireAdmin(request);
    if (authResponse) return authResponse;

    const { id } = params;
    if (!id) {
      return NextResponse.json(
        { message: "Missing waitlist entry ID" },
        { status: 400 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const result = updateEntrySchema.safeParse(body);

    if (!result.success) {
      logger.warn(
        "Invalid waitlist entry update request",
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

    // Check if the entry exists
    const existingEntry = await prisma.waitlist.findUnique({
      where: { id },
    });

    if (!existingEntry) {
      return NextResponse.json(
        { message: "Waitlist entry not found" },
        { status: 404 }
      );
    }

    // Update the entry
    const updatedEntry = await prisma.waitlist.update({
      where: { id },
      data: result.data,
    });

    logger.info(
      "Updated waitlist entry",
      {
        id,
        updatedFields: Object.keys(result.data),
      },
      LOG_SOURCE
    );

    return NextResponse.json({
      message: "Waitlist entry updated successfully",
      entry: updatedEntry,
    });
  } catch (error) {
    logger.error(
      "Error updating waitlist entry",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );

    return NextResponse.json(
      { message: "Failed to update waitlist entry" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/waitlist/entries/[id]
 * Deletes a specific waitlist entry
 * Admin-only endpoint
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if user is admin
    const authResponse = await requireAdmin(request);
    if (authResponse) return authResponse;

    const { id } = params;
    if (!id) {
      return NextResponse.json(
        { message: "Missing waitlist entry ID" },
        { status: 400 }
      );
    }

    // Check if the entry exists
    const existingEntry = await prisma.waitlist.findUnique({
      where: { id },
    });

    if (!existingEntry) {
      return NextResponse.json(
        { message: "Waitlist entry not found" },
        { status: 404 }
      );
    }

    // Delete the entry
    await prisma.waitlist.delete({
      where: { id },
    });

    logger.info("Deleted waitlist entry", { id }, LOG_SOURCE);

    return NextResponse.json({
      message: "Waitlist entry deleted successfully",
    });
  } catch (error) {
    logger.error(
      "Error deleting waitlist entry",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );

    return NextResponse.json(
      { message: "Failed to delete waitlist entry" },
      { status: 500 }
    );
  }
}
