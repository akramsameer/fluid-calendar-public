import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const LOG_SOURCE = "booking-details-route";

interface RouteParams {
  params: Promise<{ bookingId: string }>;
}

// GET /api/book/booking/[bookingId] - Get booking details (public, minimal info)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { bookingId } = await params;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        bookingLink: {
          select: {
            id: true,
            name: true,
            slug: true,
            duration: true,
            user: {
              select: { name: true, username: true },
            },
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    // Return public info needed for manage page
    return NextResponse.json({
      guestName: booking.guestName,
      guestEmail: booking.guestEmail,
      meetingTitle: booking.bookingLink.name,
      startTime: booking.startTime.toISOString(),
      endTime: booking.endTime.toISOString(),
      hostName: booking.bookingLink.user.name || "Host",
      videoLink: booking.videoLink,
      status: booking.status,
      bookingLink: {
        id: booking.bookingLink.id,
        name: booking.bookingLink.name,
        duration: booking.bookingLink.duration,
        username: booking.bookingLink.user.username,
        slug: booking.bookingLink.slug,
      },
    });
  } catch (error) {
    logger.error(
      "Failed to fetch booking details",
      { error: error instanceof Error ? error.message : String(error) },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to fetch booking details" },
      { status: 500 }
    );
  }
}
