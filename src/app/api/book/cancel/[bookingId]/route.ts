import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { cancelBooking } from "@/lib/booking/cancel-booking";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { cancelBookingSchema } from "@/lib/validations/booking";

const LOG_SOURCE = "cancel-booking-route";

interface RouteParams {
  params: Promise<{ bookingId: string }>;
}

// POST /api/book/cancel/[bookingId] - Cancel a booking
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { bookingId } = await params;

    const body = await request.json();
    const validationResult = cancelBookingSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation error", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { cancelToken, reason } = validationResult.data;

    // Find the booking
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        bookingLink: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
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

    if (booking.status === "cancelled") {
      return NextResponse.json(
        { error: "This booking has already been cancelled" },
        { status: 400 }
      );
    }

    // Determine if this is a guest or host cancellation
    let isHostCancellation = false;
    let hostId: string | null = null;

    // Try to authenticate as host
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if (!("response" in auth)) {
      // User is authenticated - check if they are the host
      if (auth.userId === booking.bookingLink.userId) {
        isHostCancellation = true;
        hostId = auth.userId;
      }
    }

    // If not host cancellation, verify cancel token
    if (!isHostCancellation) {
      if (!cancelToken) {
        return NextResponse.json(
          { error: "Cancellation token is required" },
          { status: 401 }
        );
      }

      if (booking.cancelToken !== cancelToken) {
        return NextResponse.json(
          { error: "Invalid cancellation token" },
          { status: 401 }
        );
      }
    }

    // Cancel the booking
    await cancelBooking(
      booking,
      isHostCancellation ? "host" : "guest",
      reason
    );

    logger.info(
      "Booking cancelled",
      {
        bookingId,
        cancelledBy: isHostCancellation ? "host" : "guest",
        hostId,
      },
      LOG_SOURCE
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error(
      "Failed to cancel booking",
      { error: error instanceof Error ? error.message : String(error) },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to cancel booking" },
      { status: 500 }
    );
  }
}
