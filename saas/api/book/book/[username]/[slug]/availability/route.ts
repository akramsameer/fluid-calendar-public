import { NextRequest, NextResponse } from "next/server";

import { getAvailableSlots } from "@/lib/availability";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { availabilityRequestSchema } from "@/lib/validations/booking";

const LOG_SOURCE = "public-availability-route";

interface RouteParams {
  params: Promise<{ username: string; slug: string }>;
}

// GET /api/book/[username]/[slug]/availability - Get available time slots
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { username, slug } = await params;
    const { searchParams } = new URL(request.url);

    // Validate query parameters
    const validationResult = availabilityRequestSchema.safeParse({
      startDate: searchParams.get("startDate"),
      endDate: searchParams.get("endDate"),
      timezone: searchParams.get("timezone"),
    });

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation error", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { startDate, endDate, timezone } = validationResult.data;

    // Find the user by username
    const user = await prisma.user.findUnique({
      where: { username: username.toLowerCase() },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Booking link not found" },
        { status: 404 }
      );
    }

    // Find the booking link
    const bookingLink = await prisma.bookingLink.findFirst({
      where: {
        userId: user.id,
        slug: slug.toLowerCase(),
      },
    });

    if (!bookingLink) {
      return NextResponse.json(
        { error: "Booking link not found" },
        { status: 404 }
      );
    }

    if (!bookingLink.enabled) {
      return NextResponse.json(
        { error: "This booking link is currently unavailable" },
        { status: 403 }
      );
    }

    // Get available slots
    const availableSlots = await getAvailableSlots(
      bookingLink,
      startDate,
      endDate,
      timezone
    );

    return NextResponse.json({
      slots: availableSlots,
      duration: bookingLink.duration,
      timezone,
    });
  } catch (error) {
    logger.error(
      "Failed to fetch availability",
      { error: error instanceof Error ? error.message : String(error) },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to fetch availability" },
      { status: 500 }
    );
  }
}
