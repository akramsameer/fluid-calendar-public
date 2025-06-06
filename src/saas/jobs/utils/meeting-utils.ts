import { parseISO } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

import { logger } from "@/lib/logger";

import { prisma } from "./prisma-utils";

const LOG_SOURCE = "MeetingUtils";

export interface Meeting {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  location?: string | null;
  description?: string | null;
  isAllDay: boolean;
  calendarName?: string;
}

/**
 * Fetch a user's meetings for a specific day
 * @param userId The user ID
 * @param targetDate The date to fetch meetings for (ISO string YYYY-MM-DD)
 * @returns An array of meetings
 */
export async function getUserDailyMeetings(userId: string, targetDate: string) {
  try {
    const userTimezone = await getUserTimezone(userId);

    // For timed events: define the day's window in user's timezone, then convert to UTC
    const localDayStartString = `${targetDate}T00:00:00`;
    const localDayEndString = `${targetDate}T23:59:59.999`;

    // Convert local time string in user's timezone to a UTC Date object
    const dayStartStringInUserTZWithOffset = formatInTimeZone(
      parseISO(localDayStartString),
      userTimezone,
      "yyyy-MM-dd'T'HH:mm:ssXXX"
    );
    const dayEndStringInUserTZWithOffset = formatInTimeZone(
      parseISO(localDayEndString),
      userTimezone,
      "yyyy-MM-dd'T'HH:mm:ss.SSSXXX"
    ); // Added .SSS for milliseconds

    const dayStart = parseISO(dayStartStringInUserTZWithOffset);
    const dayEnd = parseISO(dayEndStringInUserTZWithOffset);

    // For all-day events query: parse targetDate for year, month, day
    const [year, monthNum, dayNum] = targetDate.split("-").map(Number);
    const monthIndex = monthNum - 1;

    logger.info(
      `Getting meetings for user ${userId} on ${targetDate} (userTZ: ${userTimezone})`,
      {
        userId,
        targetDate,
        userTimezone,
        localDayStartInput: localDayStartString,
        localDayEndInput: localDayEndString,
        dayStartStringWithOffset: dayStartStringInUserTZWithOffset,
        dayEndStringWithOffset: dayEndStringInUserTZWithOffset,
        calculatedDayStartUTC_forTimedEvents: dayStart.toISOString(),
        calculatedDayEndUTC_forTimedEvents: dayEnd.toISOString(),
      },
      LOG_SOURCE
    );

    const events = await prisma.calendarEvent.findMany({
      where: {
        feed: {
          userId: userId,
        },
        OR: [
          // Regular (timed) events that overlap with the day in user's timezone
          {
            AND: [{ start: { lte: dayEnd } }, { end: { gte: dayStart } }],
          },
          // All-day events: query for events on the UTC date corresponding to targetDate
          {
            allDay: true,
            start: {
              gte: new Date(Date.UTC(year, monthIndex, dayNum, 0, 0, 0, 0)),
              lt: new Date(Date.UTC(year, monthIndex, dayNum + 1, 0, 0, 0, 0)),
            },
          },
        ],
      },
      include: {
        feed: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        start: "asc",
      },
    });

    // Transform to Meeting interface
    const meetings: Meeting[] = events.map((event) => {
      return {
        id: event.id,
        title: event.title,
        startTime: event.start, // Keep in UTC - no conversion here
        endTime: event.end, // Keep in UTC - no conversion here
        location: event.location,
        description: event.description,
        isAllDay: event.allDay,
        calendarName: event.feed?.name,
      };
    });

    logger.info(
      `Found ${meetings.length} meetings for user ${userId}`,
      {
        userId,
        date: targetDate,
        meetingCount: meetings.length,
      },
      LOG_SOURCE
    );

    return meetings;
  } catch (error) {
    logger.error(
      `Error getting meetings for user ${userId}`,
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );
    throw error;
  }
}

async function getUserTimezone(userId: string): Promise<string> {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        userSettings: {
          select: {
            timeZone: true,
          },
        },
      },
    });
    return user?.userSettings?.timeZone || "UTC";
  } catch (error) {
    logger.error(
      `Error getting timezone for user ${userId}`,
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );
    return "UTC";
  }
}
