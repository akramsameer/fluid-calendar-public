import { Booking, BookingLink, User } from "@prisma/client";
import { addMinutes } from "date-fns";

import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { isSlotAvailable } from "@saas/lib/availability";
import {
  sendRescheduleConfirmationToGuest,
  sendRescheduleNotificationToHost,
} from "@saas/lib/booking/emails";

const LOG_SOURCE = "RescheduleBookingService";

type BookingWithRelations = Booking & {
  bookingLink: BookingLink & {
    user: Pick<User, "id" | "name" | "email">;
  };
};

/**
 * Reschedule a booking to a new time
 */
export async function rescheduleBooking(
  originalBooking: BookingWithRelations,
  newStartTime: Date,
  guestTimezone: string,
  rescheduledBy: "host" | "guest"
): Promise<Booking> {
  try {
    const bookingLink = originalBooking.bookingLink;
    const host = bookingLink.user;

    // Calculate new end time based on duration
    const newEndTime = addMinutes(newStartTime, bookingLink.duration);

    // Verify slot availability (excluding the current booking)
    const availability = await isSlotAvailable(
      bookingLink.id,
      newStartTime,
      newEndTime
    );

    if (!availability.available) {
      throw new Error(availability.reason || "This time slot is no longer available");
    }

    // Store old times for email
    const oldStartTime = originalBooking.startTime;
    const oldEndTime = originalBooking.endTime;

    // Delete old calendar event if it exists
    if (originalBooking.calendarEventId) {
      try {
        await deleteCalendarEvent(originalBooking);
      } catch (error) {
        logger.error(
          "Failed to delete old calendar event during reschedule",
          {
            error: error instanceof Error ? error.message : String(error),
            bookingId: originalBooking.id,
            calendarEventId: originalBooking.calendarEventId,
          },
          LOG_SOURCE
        );
        // Continue even if event deletion fails
      }
    }

    // Update booking with new times
    let updatedBooking = await prisma.booking.update({
      where: { id: originalBooking.id },
      data: {
        startTime: newStartTime,
        endTime: newEndTime,
        guestTimezone,
        calendarEventId: null, // Clear old event ID
        videoLink: null, // Clear old video link
      },
    });

    // Create new calendar event
    let calendarEventId: string | null = null;
    let videoLink: string | null = null;

    try {
      const eventResult = await createCalendarEvent(bookingLink, {
        guestName: originalBooking.guestName,
        guestEmail: originalBooking.guestEmail,
        guestNotes: originalBooking.guestNotes,
        guestTimezone,
        startTime: newStartTime,
        endTime: newEndTime,
      });
      calendarEventId = eventResult.eventId;
      videoLink = eventResult.videoLink;

      // Update booking with new event ID and video link
      if (calendarEventId || videoLink) {
        updatedBooking = await prisma.booking.update({
          where: { id: updatedBooking.id },
          data: {
            calendarEventId,
            videoLink,
          },
        });
      }
    } catch (error) {
      logger.error(
        "Failed to create new calendar event during reschedule",
        {
          error: error instanceof Error ? error.message : String(error),
          bookingId: updatedBooking.id,
        },
        LOG_SOURCE
      );
      // Continue even if event creation fails
    }

    // Send notification emails (async, don't block on failure)
    sendRescheduleNotifications({
      booking: updatedBooking,
      bookingLink,
      host,
      oldStartTime,
      oldEndTime,
      guestTimezone,
      videoLink,
      rescheduledBy,
    }).catch((error) => {
      logger.error(
        "Failed to send reschedule notifications",
        {
          error: error instanceof Error ? error.message : String(error),
          bookingId: updatedBooking.id,
        },
        LOG_SOURCE
      );
    });

    logger.info(
      "Booking rescheduled successfully",
      {
        bookingId: updatedBooking.id,
        oldStartTime: oldStartTime.toISOString(),
        newStartTime: newStartTime.toISOString(),
        rescheduledBy,
      },
      LOG_SOURCE
    );

    return {
      ...updatedBooking,
      calendarEventId,
      videoLink,
    };
  } catch (error) {
    logger.error(
      "Failed to reschedule booking",
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
  account: { id: string; accessToken: string; caldavUrl: string | null; caldavUsername: string | null; email: string },
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
}

interface BookingData {
  guestName: string;
  guestEmail: string;
  guestNotes: string | null;
  guestTimezone: string;
  startTime: Date;
  endTime: Date;
}

/**
 * Create a calendar event for the rescheduled booking
 */
async function createCalendarEvent(
  bookingLink: BookingLink,
  data: BookingData
): Promise<{ eventId: string | null; videoLink: string | null }> {
  const targetCalendar = await prisma.calendarFeed.findUnique({
    where: { id: bookingLink.targetCalendarId },
    include: {
      account: true,
    },
  });

  if (!targetCalendar || !targetCalendar.account) {
    logger.warn(
      "Target calendar not found or has no account",
      { targetCalendarId: bookingLink.targetCalendarId },
      LOG_SOURCE
    );
    return { eventId: null, videoLink: null };
  }

  const eventTitle = `${bookingLink.name} with ${data.guestName}`;
  const eventDescription = data.guestNotes
    ? `Notes from ${data.guestName}:\n\n${data.guestNotes}`
    : `Meeting scheduled via FluidCalendar booking link`;

  switch (targetCalendar.type) {
    case "GOOGLE":
      return createGoogleCalendarEvent(
        targetCalendar.account,
        targetCalendar,
        {
          title: eventTitle,
          description: eventDescription,
          startTime: data.startTime,
          endTime: data.endTime,
          attendeeEmail: data.guestEmail,
          attendeeName: data.guestName,
          videoProvider: bookingLink.videoProvider,
        }
      );

    case "OUTLOOK":
      return createOutlookCalendarEvent(
        targetCalendar.account,
        targetCalendar,
        {
          title: eventTitle,
          description: eventDescription,
          startTime: data.startTime,
          endTime: data.endTime,
          attendeeEmail: data.guestEmail,
          attendeeName: data.guestName,
          videoProvider: bookingLink.videoProvider,
        }
      );

    case "CALDAV":
      return createCalDAVCalendarEvent(
        targetCalendar.account,
        targetCalendar,
        {
          title: eventTitle,
          description: eventDescription,
          startTime: data.startTime,
          endTime: data.endTime,
          attendeeEmail: data.guestEmail,
          attendeeName: data.guestName,
        }
      );

    default:
      logger.warn(
        "Unsupported calendar type for event creation",
        { type: targetCalendar.type },
        LOG_SOURCE
      );
      return { eventId: null, videoLink: null };
  }
}

interface EventData {
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  attendeeEmail: string;
  attendeeName: string;
  videoProvider?: string | null;
}

/**
 * Create a Google Calendar event
 */
async function createGoogleCalendarEvent(
  account: { accessToken: string; refreshToken: string | null },
  calendar: { id: string; url: string | null },
  eventData: EventData
): Promise<{ eventId: string | null; videoLink: string | null }> {
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

  const eventBody: Record<string, unknown> = {
    summary: eventData.title,
    description: eventData.description,
    start: {
      dateTime: eventData.startTime.toISOString(),
    },
    end: {
      dateTime: eventData.endTime.toISOString(),
    },
    attendees: [
      {
        email: eventData.attendeeEmail,
        displayName: eventData.attendeeName,
      },
    ],
  };

  if (eventData.videoProvider === "google_meet") {
    eventBody.conferenceData = {
      createRequest: {
        requestId: `booking-${Date.now()}`,
        conferenceSolutionKey: {
          type: "hangoutsMeet",
        },
      },
    };
  }

  const calendarId = calendar.url || "primary";

  const response = await calendarApi.events.insert({
    calendarId,
    requestBody: eventBody,
    conferenceDataVersion: eventData.videoProvider === "google_meet" ? 1 : 0,
    sendUpdates: "all",
  });

  const videoLink =
    response.data.conferenceData?.entryPoints?.find(
      (ep) => ep.entryPointType === "video"
    )?.uri || null;

  return {
    eventId: response.data.id || null,
    videoLink,
  };
}

/**
 * Create an Outlook Calendar event
 */
async function createOutlookCalendarEvent(
  account: { accessToken: string },
  calendar: { id: string; url: string | null },
  eventData: EventData
): Promise<{ eventId: string | null; videoLink: string | null }> {
  const { Client } = await import("@microsoft/microsoft-graph-client");

  const client = Client.init({
    authProvider: (done) => {
      done(null, account.accessToken);
    },
  });

  const eventBody: Record<string, unknown> = {
    subject: eventData.title,
    body: {
      contentType: "text",
      content: eventData.description,
    },
    start: {
      dateTime: eventData.startTime.toISOString(),
      timeZone: "UTC",
    },
    end: {
      dateTime: eventData.endTime.toISOString(),
      timeZone: "UTC",
    },
    attendees: [
      {
        emailAddress: {
          address: eventData.attendeeEmail,
          name: eventData.attendeeName,
        },
        type: "required",
      },
    ],
  };

  if (eventData.videoProvider === "teams") {
    eventBody.isOnlineMeeting = true;
    eventBody.onlineMeetingProvider = "teamsForBusiness";
  }

  const calendarId = calendar.url;
  const apiPath = calendarId
    ? `/me/calendars/${calendarId}/events`
    : `/me/calendar/events`;

  const response = await client.api(apiPath).post(eventBody);

  const videoLink = response.onlineMeeting?.joinUrl || null;

  return {
    eventId: response.id || null,
    videoLink,
  };
}

/**
 * Create a CalDAV Calendar event
 */
async function createCalDAVCalendarEvent(
  account: { id: string; accessToken: string; caldavUrl: string | null; caldavUsername: string | null; email: string },
  calendar: { url: string | null },
  eventData: Omit<EventData, "videoProvider">
): Promise<{ eventId: string | null; videoLink: string | null }> {
  if (!calendar.url || !account.caldavUrl) {
    logger.warn(
      "CalDAV calendar URL not available for event creation",
      { calendarUrl: calendar.url, caldavUrl: account.caldavUrl },
      LOG_SOURCE
    );
    return { eventId: null, videoLink: null };
  }

  const { default: ICAL } = await import("ical.js");

  // Generate a unique ID for the event
  const eventId = crypto.randomUUID();

  // Create iCalendar data
  const calendar_component = new ICAL.Component(["vcalendar", [], []]);
  calendar_component.updatePropertyWithValue("prodid", "-//FluidCalendar//EN");
  calendar_component.updatePropertyWithValue("version", "2.0");

  const vevent = new ICAL.Component(["vevent", [], []]);
  vevent.updatePropertyWithValue("uid", eventId);
  vevent.updatePropertyWithValue("summary", eventData.title);
  vevent.updatePropertyWithValue("description", eventData.description);

  const dtstart = new ICAL.Property("dtstart");
  const dtend = new ICAL.Property("dtend");

  dtstart.setValue(ICAL.Time.fromJSDate(eventData.startTime, false));
  dtend.setValue(ICAL.Time.fromJSDate(eventData.endTime, false));

  vevent.addProperty(dtstart);
  vevent.addProperty(dtend);

  // Add attendee
  const attendee = new ICAL.Property("attendee");
  attendee.setValue(`mailto:${eventData.attendeeEmail}`);
  attendee.setParameter("cn", eventData.attendeeName);
  vevent.addProperty(attendee);

  calendar_component.addSubcomponent(vevent);
  const icalData = calendar_component.toString();

  // Normalize the calendar path
  const normalizedCalendarPath = calendar.url.endsWith("/")
    ? calendar.url.slice(0, -1)
    : calendar.url;

  const eventUrl = `${normalizedCalendarPath}/${eventId}.ics`;

  const response = await fetch(eventUrl, {
    method: "PUT",
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "If-None-Match": "*",
      Authorization:
        "Basic " +
        Buffer.from(
          `${account.caldavUsername || account.email}:${account.accessToken}`
        ).toString("base64"),
    },
    body: icalData,
  });

  if (response.status < 200 || response.status >= 300) {
    throw new Error(`Failed to create CalDAV event: ${response.statusText || response.status}`);
  }

  // CalDAV doesn't support automatic video conferencing
  return {
    eventId,
    videoLink: null,
  };
}

/**
 * Send reschedule notification emails
 */
async function sendRescheduleNotifications(params: {
  booking: Booking;
  bookingLink: BookingLink;
  host: Pick<User, "id" | "name" | "email">;
  oldStartTime: Date;
  oldEndTime: Date;
  guestTimezone: string;
  videoLink: string | null;
  rescheduledBy: "host" | "guest";
}): Promise<void> {
  const {
    booking,
    bookingLink,
    host,
    oldStartTime,
    oldEndTime,
    guestTimezone,
    videoLink,
    rescheduledBy,
  } = params;

  // Always send confirmation to guest
  await sendRescheduleConfirmationToGuest({
    guestEmail: booking.guestEmail,
    guestName: booking.guestName,
    hostName: host.name || "Host",
    meetingTitle: bookingLink.name,
    oldStartTime,
    oldEndTime,
    newStartTime: booking.startTime,
    newEndTime: booking.endTime,
    guestTimezone,
    videoLink,
    cancelToken: booking.cancelToken,
    bookingId: booking.id,
    rescheduledBy,
  });

  // Notify host if rescheduled by guest
  if (rescheduledBy === "guest" && host.email) {
    await sendRescheduleNotificationToHost({
      hostEmail: host.email,
      hostName: host.name || "Host",
      guestName: booking.guestName,
      guestEmail: booking.guestEmail,
      meetingTitle: bookingLink.name,
      oldStartTime,
      newStartTime: booking.startTime,
      newEndTime: booking.endTime,
      videoLink,
    });
  }
}
