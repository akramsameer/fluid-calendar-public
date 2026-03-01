import { BookingLink, Booking } from "@prisma/client";

import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { sendBookingConfirmationToGuest, sendBookingNotificationToHost } from "@saas/lib/booking/emails";

const LOG_SOURCE = "CreateBookingService";

interface BookingData {
  guestName: string;
  guestEmail: string;
  guestNotes: string | null;
  guestTimezone: string;
  startTime: Date;
  endTime: Date;
}

interface Host {
  id: string;
  name: string | null;
  email: string | null;
}

/**
 * Create a booking with associated calendar event and send notifications
 */
export async function createBookingWithEvent(
  bookingLink: BookingLink,
  data: BookingData,
  host: Host
): Promise<Booking> {
  try {
    // Create the booking record
    const booking = await prisma.booking.create({
      data: {
        bookingLinkId: bookingLink.id,
        hostId: bookingLink.userId,
        guestName: data.guestName,
        guestEmail: data.guestEmail,
        guestNotes: data.guestNotes,
        guestTimezone: data.guestTimezone,
        startTime: data.startTime,
        endTime: data.endTime,
        status: "confirmed",
      },
    });

    // Create calendar event in the target calendar
    let calendarEventId: string | null = null;
    let videoLink: string | null = null;

    try {
      const eventResult = await createCalendarEvent(
        bookingLink,
        data
      );
      calendarEventId = eventResult.eventId;
      videoLink = eventResult.videoLink;

      // Update booking with event ID and video link
      if (calendarEventId || videoLink) {
        await prisma.booking.update({
          where: { id: booking.id },
          data: {
            calendarEventId,
            videoLink,
          },
        });
      }
    } catch (error) {
      logger.error(
        "Failed to create calendar event for booking",
        {
          error: error instanceof Error ? error.message : String(error),
          bookingId: booking.id,
        },
        LOG_SOURCE
      );
      // Continue with booking even if event creation fails
    }

    // Send notification emails (async, don't block on failure)
    sendNotifications(bookingLink, booking, data, host, videoLink).catch(
      (error) => {
        logger.error(
          "Failed to send booking notifications",
          {
            error: error instanceof Error ? error.message : String(error),
            bookingId: booking.id,
          },
          LOG_SOURCE
        );
      }
    );

    return {
      ...booking,
      calendarEventId,
      videoLink,
    };
  } catch (error) {
    logger.error(
      "Failed to create booking",
      { error: error instanceof Error ? error.message : String(error) },
      LOG_SOURCE
    );
    throw error;
  }
}

/**
 * Create a calendar event for the booking
 */
async function createCalendarEvent(
  bookingLink: BookingLink,
  data: BookingData
): Promise<{ eventId: string | null; videoLink: string | null }> {
  // Get the target calendar
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

  // Create event based on calendar provider
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
  try {
    // Get fresh access token
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

    // Build event body
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

    // Add Google Meet if requested
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

    // Determine calendar ID (use 'primary' if no specific calendar URL)
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
  } catch (error) {
    logger.error(
      "Failed to create Google Calendar event",
      { error: error instanceof Error ? error.message : String(error) },
      LOG_SOURCE
    );
    throw error;
  }
}

/**
 * Create an Outlook Calendar event
 */
async function createOutlookCalendarEvent(
  account: { accessToken: string },
  calendar: { id: string; url: string | null },
  eventData: EventData
): Promise<{ eventId: string | null; videoLink: string | null }> {
  try {
    const { Client } = await import("@microsoft/microsoft-graph-client");

    const client = Client.init({
      authProvider: (done) => {
        done(null, account.accessToken);
      },
    });

    // Build event body
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

    // Add Teams meeting if requested
    if (eventData.videoProvider === "teams") {
      eventBody.isOnlineMeeting = true;
      eventBody.onlineMeetingProvider = "teamsForBusiness";
    }

    // Use the calendar ID from the url field (that's where Outlook calendar IDs are stored)
    // Format: /me/calendars/{calendarId}/events
    const calendarId = calendar.url;
    const apiPath = calendarId
      ? `/me/calendars/${calendarId}/events`
      : `/me/calendar/events`;

    const response = await client
      .api(apiPath)
      .post(eventBody);

    // Extract Teams meeting link if present
    const videoLink = response.onlineMeeting?.joinUrl || null;

    return {
      eventId: response.id || null,
      videoLink,
    };
  } catch (error) {
    logger.error(
      "Failed to create Outlook Calendar event",
      { error: error instanceof Error ? error.message : String(error) },
      LOG_SOURCE
    );
    throw error;
  }
}

/**
 * Create a CalDAV Calendar event
 * Note: CalDAV doesn't support automatic video conferencing generation
 */
async function createCalDAVCalendarEvent(
  account: { id: string; accessToken: string; caldavUrl: string | null; caldavUsername: string | null; email: string },
  calendar: { url: string | null },
  eventData: Omit<EventData, "videoProvider">
): Promise<{ eventId: string | null; videoLink: string | null }> {
  try {
    if (!calendar.url || !account.caldavUrl) {
      logger.warn(
        "CalDAV calendar URL not available for event creation",
        { calendarUrl: calendar.url, caldavUrl: account.caldavUrl },
        LOG_SOURCE
      );
      return { eventId: null, videoLink: null };
    }

    const ICAL = (await import("ical.js")).default;

    // Generate a unique ID for the event
    const eventId = crypto.randomUUID();

    // Create iCalendar data
    const calendarComponent = new ICAL.Component(["vcalendar", [], []]);
    calendarComponent.updatePropertyWithValue("prodid", "-//FluidCalendar//EN");
    calendarComponent.updatePropertyWithValue("version", "2.0");

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

    calendarComponent.addSubcomponent(vevent);
    const icalData = calendarComponent.toString();

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

    logger.info(
      "Created CalDAV calendar event",
      { eventId, eventUrl },
      LOG_SOURCE
    );

    // CalDAV doesn't support automatic video conferencing
    return {
      eventId,
      videoLink: null,
    };
  } catch (error) {
    logger.error(
      "Failed to create CalDAV Calendar event",
      { error: error instanceof Error ? error.message : String(error) },
      LOG_SOURCE
    );
    throw error;
  }
}

/**
 * Send notification emails for a booking
 */
async function sendNotifications(
  bookingLink: BookingLink,
  booking: Booking,
  data: BookingData,
  host: Host,
  videoLink: string | null
): Promise<void> {
  // Send confirmation to guest
  await sendBookingConfirmationToGuest({
    guestEmail: data.guestEmail,
    guestName: data.guestName,
    hostName: host.name || "Host",
    meetingTitle: bookingLink.name,
    startTime: data.startTime,
    endTime: data.endTime,
    guestTimezone: data.guestTimezone,
    videoLink,
    cancelToken: booking.cancelToken,
    bookingId: booking.id,
  });

  // Send notification to host
  if (host.email) {
    await sendBookingNotificationToHost({
      hostEmail: host.email,
      hostName: host.name || "Host",
      guestName: data.guestName,
      guestEmail: data.guestEmail,
      guestNotes: data.guestNotes,
      meetingTitle: bookingLink.name,
      startTime: data.startTime,
      endTime: data.endTime,
      videoLink,
    });
  }
}
