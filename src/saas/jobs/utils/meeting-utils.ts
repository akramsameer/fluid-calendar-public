import { logger } from "@/lib/logger";
import {
  toZonedTime,
} from "@/lib/date-utils";
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
 * @param targetDate The date to fetch meetings for (ISO string)
 * @returns An array of meetings
 */
export async function getUserDailyMeetings(userId: string, targetDate: string) {
  try {
    const userTimezone = await getUserTimezone(userId);

    // Parse the date components directly to avoid timezone issues
    const [year, month, day] = targetDate.split("-").map(Number);

    // Create date objects for start and end of day in the user's timezone
    // Use the date components to create a Date in the user's timezone
    const dayStart = toZonedTime(
      new Date(year, month - 1, day, 0, 0, 0, 0),
      userTimezone
    );

    const dayEnd = toZonedTime(
      new Date(year, month - 1, day, 23, 59, 59, 999),
      userTimezone
    );

    logger.info(
      `Getting meetings for user ${userId} on ${targetDate} (${userTimezone})`,
      {
        userId,
        targetDate,
        dayStart: dayStart.toISOString(),
        dayEnd: dayEnd.toISOString(),
        dateComponents: [year.toString(), month.toString(), day.toString()],
      },
      LOG_SOURCE
    );

    // In the schema, the model is CalendarEvent, not Event
    const events = await prisma.calendarEvent.findMany({
      where: {
        feed: {
          userId: userId,
        },
        start: {
          gte: dayStart,
        },
        end: {
          lte: dayEnd,
        },
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
    const meetings: Meeting[] = events.map((event) => ({
      id: event.id,
      title: event.title,
      startTime: event.start,
      endTime: event.end,
      location: event.location,
      description: event.description,
      isAllDay: event.allDay,
      calendarName: event.feed?.name,
    }));

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
