import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { updateBookingLinkSchema } from "@/lib/validations/booking";

const LOG_SOURCE = "booking-links-id-route";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/booking-links/[id] - Get a single booking link
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;
    const { id } = await params;

    const bookingLink = await prisma.bookingLink.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        bookings: {
          where: { status: "confirmed" },
          orderBy: { startTime: "asc" },
          take: 10,
        },
      },
    });

    if (!bookingLink) {
      return NextResponse.json(
        { error: "Booking link not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(bookingLink);
  } catch (error) {
    logger.error(
      "Failed to fetch booking link",
      { error: error instanceof Error ? error.message : String(error) },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to fetch booking link" },
      { status: 500 }
    );
  }
}

// PATCH /api/booking-links/[id] - Update a booking link
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;
    const { id } = await params;

    // Verify the booking link belongs to the user
    const existing = await prisma.bookingLink.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Booking link not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validationResult = updateBookingLinkSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation error", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // If slug is being updated, check for uniqueness
    if (data.slug && data.slug.toLowerCase() !== existing.slug) {
      const existingSlug = await prisma.bookingLink.findFirst({
        where: {
          userId,
          slug: data.slug.toLowerCase(),
          id: { not: id },
        },
      });

      if (existingSlug) {
        return NextResponse.json(
          { error: "A booking link with this slug already exists" },
          { status: 400 }
        );
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.slug !== undefined) updateData.slug = data.slug.toLowerCase();
    if (data.description !== undefined) updateData.description = data.description;
    if (data.duration !== undefined) updateData.duration = data.duration;
    if (data.selectedCalendars !== undefined) {
      updateData.selectedCalendars = JSON.stringify(data.selectedCalendars);
    }
    if (data.targetCalendarId !== undefined) {
      updateData.targetCalendarId = data.targetCalendarId;
    }
    if (data.availabilityType !== undefined) {
      updateData.availabilityType = data.availabilityType;
    }
    if (data.customAvailability !== undefined) {
      updateData.customAvailability = data.customAvailability
        ? JSON.stringify(data.customAvailability)
        : null;
    }
    if (data.bufferBefore !== undefined) updateData.bufferBefore = data.bufferBefore;
    if (data.bufferAfter !== undefined) updateData.bufferAfter = data.bufferAfter;
    if (data.minNotice !== undefined) updateData.minNotice = data.minNotice;
    if (data.maxFutureDays !== undefined) updateData.maxFutureDays = data.maxFutureDays;
    if (data.videoProvider !== undefined) updateData.videoProvider = data.videoProvider;
    if (data.enabled !== undefined) updateData.enabled = data.enabled;

    const bookingLink = await prisma.bookingLink.update({
      where: { id },
      data: updateData,
    });

    logger.info(
      "Booking link updated",
      { bookingLinkId: id, userId },
      LOG_SOURCE
    );

    return NextResponse.json(bookingLink);
  } catch (error) {
    logger.error(
      "Failed to update booking link",
      { error: error instanceof Error ? error.message : String(error) },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to update booking link" },
      { status: 500 }
    );
  }
}

// DELETE /api/booking-links/[id] - Delete a booking link
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;
    const { id } = await params;

    // Verify the booking link belongs to the user
    const existing = await prisma.bookingLink.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Booking link not found" },
        { status: 404 }
      );
    }

    // Delete the booking link (bookings will be cascade deleted)
    await prisma.bookingLink.delete({
      where: { id },
    });

    logger.info(
      "Booking link deleted",
      { bookingLinkId: id, userId },
      LOG_SOURCE
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error(
      "Failed to delete booking link",
      { error: error instanceof Error ? error.message : String(error) },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to delete booking link" },
      { status: 500 }
    );
  }
}
