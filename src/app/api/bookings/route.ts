import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const LOG_SOURCE = "bookings-route";

// GET /api/bookings - List all bookings for the authenticated host
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;
    const { searchParams } = new URL(request.url);

    // Optional filters
    const status = searchParams.get("status"); // "confirmed", "cancelled", or null for all
    const timeframe = searchParams.get("timeframe"); // "upcoming", "past", or null for all

    // Build where clause
    const where: Record<string, unknown> = {
      hostId: userId,
    };

    if (status) {
      where.status = status;
    }

    const now = new Date();
    if (timeframe === "upcoming") {
      where.startTime = { gte: now };
      // Only show confirmed for upcoming
      if (!status) {
        where.status = "confirmed";
      }
    } else if (timeframe === "past") {
      where.startTime = { lt: now };
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        bookingLink: {
          select: {
            id: true,
            name: true,
            slug: true,
            duration: true,
          },
        },
      },
      orderBy: {
        startTime: timeframe === "past" ? "desc" : "asc",
      },
    });

    return NextResponse.json({ bookings });
  } catch (error) {
    logger.error(
      "Failed to fetch bookings",
      { error: error instanceof Error ? error.message : String(error) },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to fetch bookings" },
      { status: 500 }
    );
  }
}
