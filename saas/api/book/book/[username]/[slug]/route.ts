import { NextRequest, NextResponse } from "next/server";

import { isSlotAvailable } from "@/lib/availability";
import { createBookingWithEvent } from "@/lib/booking/create-booking";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { createBookingSchema } from "@/lib/validations/booking";

const LOG_SOURCE = "public-booking-route";

interface RouteParams {
  params: Promise<{ username: string; slug: string }>;
}

// GET /api/book/[username]/[slug] - Get public booking link info
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { username, slug } = await params;

    // Find the user by username
    const user = await prisma.user.findUnique({
      where: { username: username.toLowerCase() },
      select: { id: true, name: true },
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
      select: {
        id: true,
        name: true,
        description: true,
        duration: true,
        enabled: true,
        minNotice: true,
        maxFutureDays: true,
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
        {
          error: "This booking link is currently unavailable",
          disabled: true,
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      id: bookingLink.id,
      name: bookingLink.name,
      description: bookingLink.description,
      duration: bookingLink.duration,
      hostName: user.name || username,
      enabled: bookingLink.enabled,
      minNotice: bookingLink.minNotice,
      maxFutureDays: bookingLink.maxFutureDays,
    });
  } catch (error) {
    logger.error(
      "Failed to fetch public booking link",
      { error: error instanceof Error ? error.message : String(error) },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to fetch booking link" },
      { status: 500 }
    );
  }
}

// POST /api/book/[username]/[slug] - Submit a booking
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { username, slug } = await params;

    // Find the user by username
    const user = await prisma.user.findUnique({
      where: { username: username.toLowerCase() },
      select: { id: true, name: true, email: true },
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

    // Validate request body
    const body = await request.json();
    const validationResult = createBookingSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation error", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const data = validationResult.data;
    const startTime = new Date(data.startTime);
    const endTime = new Date(startTime.getTime() + bookingLink.duration * 60 * 1000);

    // Real-time conflict check
    const slotCheck = await isSlotAvailable(bookingLink.id, startTime, endTime);
    if (!slotCheck.available) {
      return NextResponse.json(
        { error: slotCheck.reason || "This time is no longer available" },
        { status: 409 }
      );
    }

    // Create the booking with calendar event
    const booking = await createBookingWithEvent(
      bookingLink,
      {
        guestName: data.guestName,
        guestEmail: data.guestEmail,
        guestNotes: data.guestNotes || null,
        guestTimezone: data.guestTimezone,
        startTime,
        endTime,
      },
      user
    );

    logger.info(
      "Booking created",
      {
        bookingId: booking.id,
        bookingLinkId: bookingLink.id,
        guestEmail: data.guestEmail,
      },
      LOG_SOURCE
    );

    return NextResponse.json(
      {
        success: true,
        booking: {
          id: booking.id,
          startTime: booking.startTime,
          endTime: booking.endTime,
          videoLink: booking.videoLink,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error(
      "Failed to create booking",
      { error: error instanceof Error ? error.message : String(error) },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to create booking" },
      { status: 500 }
    );
  }
}
