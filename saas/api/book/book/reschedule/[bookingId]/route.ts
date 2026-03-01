import { NextRequest, NextResponse } from "next/server";

import { getServerSession } from "next-auth";

import { getAuthOptions } from "@/lib/auth/auth-options";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { rescheduleBooking } from "@saas/lib/booking/reschedule-booking";
import { rescheduleBookingSchema } from "@saas/lib/validations/booking";

const LOG_SOURCE = "reschedule-booking-route";

interface RouteParams {
  params: Promise<{ bookingId: string }>;
}

// POST /api/book/reschedule/[bookingId] - Reschedule a booking
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { bookingId } = await params;
    const body = await request.json();

    // Validate request body
    const validationResult = rescheduleBookingSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0]?.message || "Invalid request" },
        { status: 400 }
      );
    }

    const { cancelToken, startTime, guestTimezone } = validationResult.data;

    // Get the booking with related data
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

    // Verify authorization
    // Either the guest's cancel token must match, or the host must be authenticated
    const authOptions = await getAuthOptions();
    const session = await getServerSession(authOptions);
    const isHost = session?.user?.id === booking.hostId;
    const isGuestWithToken = cancelToken && booking.cancelToken === cancelToken;

    if (!isHost && !isGuestWithToken) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Reschedule the booking
    const newBooking = await rescheduleBooking(
      booking,
      new Date(startTime),
      guestTimezone,
      isHost ? "host" : "guest"
    );

    logger.info(
      "Booking rescheduled",
      {
        oldBookingId: booking.id,
        newBookingId: newBooking.id,
        rescheduledBy: isHost ? "host" : "guest",
      },
      LOG_SOURCE
    );

    return NextResponse.json({
      success: true,
      booking: {
        id: newBooking.id,
        startTime: newBooking.startTime.toISOString(),
        endTime: newBooking.endTime.toISOString(),
        videoLink: newBooking.videoLink,
      },
    });
  } catch (error) {
    logger.error(
      "Failed to reschedule booking",
      { error: error instanceof Error ? error.message : String(error) },
      LOG_SOURCE
    );

    // Return specific error messages for known errors
    if (error instanceof Error) {
      if (error.message.includes("no longer available") ||
          error.message.includes("not available")) {
        return NextResponse.json(
          { error: error.message },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to reschedule booking" },
      { status: 500 }
    );
  }
}
