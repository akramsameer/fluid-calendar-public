import { Booking, BookingLink, User } from "@prisma/client";

import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { sendCancellationEmailToGuest, sendCancellationEmailToHost } from "@/lib/booking/emails";

const LOG_SOURCE = "CancelBookingService";

type BookingWithRelations = Booking & {
  bookingLink: BookingLink & {
    user: Pick<User, "id" | "name" | "email">;
  };
};

/**
 * Cancel a booking and send notifications
 */
export async function cancelBooking(
  booking: BookingWithRelations,
  cancelledBy: "host" | "guest",
  reason?: string
): Promise<void> {
  try {
    // Update booking status
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: "cancelled",
        cancelledAt: new Date(),
        cancelReason: reason || null,
      },
    });

    // Delete calendar event if it exists
    if (booking.calendarEventId) {
      try {
        await deleteCalendarEvent(booking);
      } catch (error) {
        logger.error(
          "Failed to delete calendar event for cancelled booking",
          {
            error: error instanceof Error ? error.message : String(error),
            bookingId: booking.id,
            calendarEventId: booking.calendarEventId,
          },
          LOG_SOURCE
        );
        // Continue even if event deletion fails
      }
    }

    // Send notification emails (async, don't block on failure)
    sendCancellationNotifications(booking, cancelledBy, reason).catch(
      (error) => {
        logger.error(
          "Failed to send cancellation notifications",
          {
            error: error instanceof Error ? error.message : String(error),
            bookingId: booking.id,
          },
          LOG_SOURCE
        );
      }
    );

    logger.info(
      "Booking cancelled",
      {
        bookingId: booking.id,
        cancelledBy,
        reason: reason || null,
      },
      LOG_SOURCE
    );
  } catch (error) {
    logger.error(
      "Failed to cancel booking",
      { error: error instanceof Error ? error.message : String(error) },
      LOG_SOURCE
    );
    throw error;
  }
}

/**
 * Delete the calendar event associated with a booking
 */
async function deleteCalendarEvent(booking: BookingWithRelations): Promise<void> {
  const targetCalendar = await prisma.calendarFeed.findUnique({
    where: { id: booking.bookingLink.targetCalendarId },
    include: {
      account: true,
    },
  });

  if (!targetCalendar || !targetCalendar.account || !booking.calendarEventId) {
    return;
  }

  switch (targetCalendar.type) {
    case "GOOGLE":
      await deleteGoogleCalendarEvent(
        targetCalendar.account,
        targetCalendar,
        booking.calendarEventId
      );
      break;

    case "OUTLOOK":
      await deleteOutlookCalendarEvent(
        targetCalendar.account,
        booking.calendarEventId
      );
      break;

    case "CALDAV":
      await deleteCalDAVCalendarEvent(
        targetCalendar.account,
        targetCalendar,
        booking.calendarEventId
      );
      break;

    default:
      logger.warn(
        "Unsupported calendar type for event deletion",
        { type: targetCalendar.type },
        LOG_SOURCE
      );
  }
}

/**
 * Delete a Google Calendar event
 */
async function deleteGoogleCalendarEvent(
  account: { accessToken: string; refreshToken: string | null },
  calendar: { url: string | null },
  eventId: string
): Promise<void> {
  const { google } = await import("googleapis");

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    access_token: account.accessToken,
    refresh_token: account.refreshToken,
  });

  const calendarApi = google.calendar({ version: "v3", auth: oauth2Client });

  const calendarId = calendar.url || "primary";

  await calendarApi.events.delete({
    calendarId,
    eventId,
    sendUpdates: "all",
  });
}

/**
 * Delete an Outlook Calendar event
 */
async function deleteOutlookCalendarEvent(
  account: { accessToken: string },
  eventId: string
): Promise<void> {
  const { Client } = await import("@microsoft/microsoft-graph-client");

  const client = Client.init({
    authProvider: (done) => {
      done(null, account.accessToken);
    },
  });

  await client.api(`/me/events/${eventId}`).delete();
}

/**
 * Delete a CalDAV Calendar event
 */
async function deleteCalDAVCalendarEvent(
  account: { accessToken: string; caldavUrl: string | null; caldavUsername: string | null; email: string },
  calendar: { url: string | null },
  eventId: string
): Promise<void> {
  if (!calendar.url || !account.caldavUrl) {
    logger.warn(
      "CalDAV calendar URL not available for event deletion",
      { calendarUrl: calendar.url, caldavUrl: account.caldavUrl },
      LOG_SOURCE
    );
    return;
  }

  // Normalize the calendar path
  const normalizedCalendarPath = calendar.url.endsWith("/")
    ? calendar.url.slice(0, -1)
    : calendar.url;

  // Create a URL for the event
  const eventUrl = `${normalizedCalendarPath}/${eventId}.ics`;

  const response = await fetch(eventUrl, {
    method: "DELETE",
    headers: {
      Authorization:
        "Basic " +
        Buffer.from(
          `${account.caldavUsername || account.email}:${account.accessToken}`
        ).toString("base64"),
    },
  });

  if (response.status < 200 || response.status >= 300) {
    throw new Error(`Failed to delete CalDAV event: ${response.statusText || response.status}`);
  }

  logger.info(
    "Deleted CalDAV calendar event",
    { eventId, eventUrl },
    LOG_SOURCE
  );
}

/**
 * Send cancellation notification emails
 */
async function sendCancellationNotifications(
  booking: BookingWithRelations,
  cancelledBy: "host" | "guest",
  reason?: string
): Promise<void> {
  const host = booking.bookingLink.user;

  if (cancelledBy === "host") {
    // Host cancelled - notify guest
    await sendCancellationEmailToGuest({
      guestEmail: booking.guestEmail,
      guestName: booking.guestName,
      hostName: host.name || "Host",
      meetingTitle: booking.bookingLink.name,
      startTime: booking.startTime,
      reason,
    });
  } else {
    // Guest cancelled - notify host
    if (host.email) {
      await sendCancellationEmailToHost({
        hostEmail: host.email,
        hostName: host.name || "Host",
        guestName: booking.guestName,
        guestEmail: booking.guestEmail,
        meetingTitle: booking.bookingLink.name,
        startTime: booking.startTime,
      });
    }
  }
}
