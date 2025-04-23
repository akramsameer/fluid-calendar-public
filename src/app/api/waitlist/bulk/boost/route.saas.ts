import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { requireAdmin } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const LOG_SOURCE = "BulkBoostAPI";

// Validation schema for bulk boost request
const bulkBoostSchema = z.object({
  ids: z.array(z.string()).min(1, "At least one ID must be provided"),
  amount: z.number().positive("Boost amount must be positive").default(1),
});

/**
 * POST /api/waitlist/bulk/boost
 * Boosts priority score for multiple waitlist entries
 * Admin-only endpoint
 */
export async function POST(request: NextRequest) {
  try {
    // Check if user is admin
    const authResponse = await requireAdmin(request);
    if (authResponse) return authResponse;

    // Parse and validate request body
    const body = await request.json();
    const result = bulkBoostSchema.safeParse(body);

    if (!result.success) {
      logger.warn(
        "Invalid bulk boost request",
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

    const { ids, amount } = result.data;

    // Get beta settings for max boost
    const settings = await prisma.betaSettings.findUnique({
      where: { id: "default" },
    });

    const maxBoost = settings?.maxReferralBoost || 10;

    // Boost entries one by one to respect max boost limit
    const results = [];

    for (const id of ids) {
      // Get current entry
      const entry = await prisma.waitlist.findUnique({
        where: { id },
        select: { priorityScore: true },
      });

      if (!entry) continue;

      // Calculate new priority score, respecting max boost
      const newScore = Math.min(entry.priorityScore + amount, maxBoost);

      // Update entry
      const updated = await prisma.waitlist.update({
        where: { id },
        data: {
          priorityScore: newScore,
        },
        select: {
          id: true,
          email: true,
          priorityScore: true,
        },
      });

      results.push(updated);
    }

    logger.info(
      "Boosted waitlist entries",
      {
        requestedCount: ids.length,
        boostedCount: results.length,
        boostAmount: amount,
      },
      LOG_SOURCE
    );

    return NextResponse.json({
      message: "Entries boosted successfully",
      boostedCount: results.length,
      entries: results,
    });
  } catch (error) {
    logger.error(
      "Error boosting waitlist entries",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );

    return NextResponse.json(
      { message: "Failed to boost entries" },
      { status: 500 }
    );
  }
}
