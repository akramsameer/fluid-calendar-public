import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { generateUniqueUsername } from "@saas/lib/username";
import { createBookingLinkSchema } from "@saas/lib/validations/booking";
import { canCreateBookingLink } from "@saas/lib/booking/feature-gating";

const LOG_SOURCE = "booking-links-route";

// GET /api/booking-links - List user's booking links
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;

    const bookingLinks = await prisma.bookingLink.findMany({
      where: { userId },
      include: {
        _count: {
          select: { bookings: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Get user's username for building URLs
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true },
    });

    return NextResponse.json({
      bookingLinks,
      username: user?.username,
    });
  } catch (error) {
    logger.error(
      "Failed to fetch booking links",
      { error: error instanceof Error ? error.message : String(error) },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to fetch booking links" },
      { status: 500 }
    );
  }
}

// POST /api/booking-links - Create a new booking link
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;

    // Check if user can create a booking link (tier limit)
    const canCreate = await canCreateBookingLink(userId);
    if (!canCreate.allowed) {
      return NextResponse.json(
        { error: canCreate.reason || "You have reached your booking link limit" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validationResult = createBookingLinkSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation error", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Check if slug is unique for this user
    const existingSlug = await prisma.bookingLink.findFirst({
      where: {
        userId,
        slug: data.slug.toLowerCase(),
      },
    });

    if (existingSlug) {
      return NextResponse.json(
        { error: "A booking link with this slug already exists" },
        { status: 400 }
      );
    }

    // Ensure user has a username (generate if needed)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true, email: true },
    });

    if (!user?.username && user?.email) {
      const newUsername = await generateUniqueUsername(user.email);
      await prisma.user.update({
        where: { id: userId },
        data: { username: newUsername },
      });
    }

    // Create the booking link
    const bookingLink = await prisma.bookingLink.create({
      data: {
        userId,
        name: data.name,
        slug: data.slug.toLowerCase(),
        description: data.description || null,
        duration: data.duration,
        selectedCalendars: JSON.stringify(data.selectedCalendars),
        targetCalendarId: data.targetCalendarId,
        availabilityType: data.availabilityType,
        customAvailability: data.customAvailability
          ? JSON.stringify(data.customAvailability)
          : null,
        bufferBefore: data.bufferBefore,
        bufferAfter: data.bufferAfter,
        minNotice: data.minNotice,
        maxFutureDays: data.maxFutureDays,
        videoProvider: data.videoProvider || null,
      },
    });

    logger.info(
      "Booking link created",
      { bookingLinkId: bookingLink.id, userId },
      LOG_SOURCE
    );

    return NextResponse.json(bookingLink, { status: 201 });
  } catch (error) {
    logger.error(
      "Failed to create booking link",
      { error: error instanceof Error ? error.message : String(error) },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to create booking link" },
      { status: 500 }
    );
  }
}
