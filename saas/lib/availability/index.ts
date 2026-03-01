import { BookingLink, AutoScheduleSettings } from "@prisma/client";
import {
  addMinutes,
  areIntervalsOverlapping,
  startOfDay,
  eachDayOfInterval,
  format,
  parseISO,
  setHours,
  setMinutes,
  isBefore,
  isAfter,
  addDays,
} from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

import { parseSelectedCalendars, parseWorkDays } from "@/lib/autoSchedule";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { CustomAvailability, TimeSlot, AvailableSlots } from "@saas/types/booking";

const LOG_SOURCE = "AvailabilityService";

/**
 * Get all enabled calendar IDs for a user
 */
async function getAllUserCalendarIds(userId: string): Promise<string[]> {
  const calendars = await prisma.calendarFeed.findMany({
    where: { userId, enabled: true },
    select: { id: true },
  });
  return calendars.map((c) => c.id);
}

interface CalendarEvent {
  id: string;
  start: Date;
  end: Date;
  allDay: boolean;
  transparency: string | null;
}

/**
 * Get available time slots for a booking link within a date range
 */
export async function getAvailableSlots(
  bookingLink: BookingLink,
  startDate: string,
  endDate: string,
  guestTimezone: string
): Promise<AvailableSlots[]> {
  try {
    // Get the host's auto-schedule settings for working hours
    const autoScheduleSettings = await prisma.autoScheduleSettings.findUnique({
      where: { userId: bookingLink.userId },
    });

    // Get the host's user settings for their timezone
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId: bookingLink.userId },
    });

    const hostTimezone = userSettings?.timeZone || "UTC";

    // Parse date range
    const start = parseISO(startDate);
    const end = parseISO(endDate);

    // Limit date range to maxFutureDays
    const maxEnd = addDays(new Date(), bookingLink.maxFutureDays);
    const effectiveEnd = isBefore(end, maxEnd) ? end : maxEnd;

    // Get all calendar events in the date range for conflict checking
    // If selectedCalendars is empty or contains only empty array, use ALL user calendars
    const selectedCalendars = parseSelectedCalendars(bookingLink.selectedCalendars);
    const calendarsToCheck = selectedCalendars.length > 0
      ? selectedCalendars
      : await getAllUserCalendarIds(bookingLink.userId);
    const events = await getCalendarEventsInRange(
      calendarsToCheck,
      bookingLink.userId,
      start,
      effectiveEnd
    );

    // Get existing bookings for this booking link
    const existingBookings = await prisma.booking.findMany({
      where: {
        bookingLinkId: bookingLink.id,
        status: "confirmed",
        startTime: {
          gte: start,
          lte: effectiveEnd,
        },
      },
      select: {
        startTime: true,
        endTime: true,
      },
    });

    // Convert existing bookings to CalendarEvent format
    const bookingConflicts: CalendarEvent[] = existingBookings.map((b) => ({
      id: "booking",
      start: b.startTime,
      end: b.endTime,
      allDay: false,
      transparency: "opaque", // Bookings are always busy
    }));

    const allConflicts = [...events, ...bookingConflicts];

    // Generate slots for each day
    const days = eachDayOfInterval({ start, end: effectiveEnd });
    const result: AvailableSlots[] = [];

    for (const day of days) {
      const daySlots = generateSlotsForDay(
        day,
        bookingLink,
        autoScheduleSettings,
        hostTimezone,
        guestTimezone,
        allConflicts
      );

      result.push({
        date: format(day, "yyyy-MM-dd"),
        slots: daySlots,
      });
    }

    return result;
  } catch (error) {
    logger.error(
      "Failed to get available slots",
      { error: error instanceof Error ? error.message : String(error) },
      LOG_SOURCE
    );
    throw error;
  }
}

/**
 * Generate time slots for a single day
 */
function generateSlotsForDay(
  day: Date,
  bookingLink: BookingLink,
  autoScheduleSettings: AutoScheduleSettings | null,
  hostTimezone: string,
  guestTimezone: string,
  conflicts: CalendarEvent[]
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const now = new Date();

  // Get working hours for this day
  const dayOfWeek = day.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const dayName = dayNames[dayOfWeek] as keyof CustomAvailability;

  let workStart: number;
  let workEnd: number;
  let isWorkDay: boolean;

  if (bookingLink.availabilityType === "custom" && bookingLink.customAvailability) {
    // Use custom availability
    const customAvailability = JSON.parse(bookingLink.customAvailability) as CustomAvailability;
    const dayConfig = customAvailability[dayName];

    if (!dayConfig.enabled) {
      return []; // Not available on this day
    }

    // Parse custom times (HH:mm format)
    const [startHour, startMinute] = dayConfig.startTime.split(":").map(Number);
    const [endHour, endMinute] = dayConfig.endTime.split(":").map(Number);

    workStart = startHour + startMinute / 60;
    workEnd = endHour + endMinute / 60;
    isWorkDay = true;
  } else if (autoScheduleSettings) {
    // Use working hours from auto-schedule settings
    const workDays = parseWorkDays(autoScheduleSettings.workDays);
    isWorkDay = workDays.includes(dayOfWeek);

    if (!isWorkDay) {
      return []; // Not a work day
    }

    workStart = autoScheduleSettings.workHourStart;
    workEnd = autoScheduleSettings.workHourEnd;
  } else {
    // Default working hours: 9 AM - 5 PM, Monday-Friday
    isWorkDay = dayOfWeek >= 1 && dayOfWeek <= 5;

    if (!isWorkDay) {
      return [];
    }

    workStart = 9;
    workEnd = 17;
  }

  // Convert working hours to host timezone
  const dayInHostTz = toZonedTime(day, hostTimezone);
  const slotStartHour = Math.floor(workStart);
  const slotStartMinute = Math.round((workStart - slotStartHour) * 60);
  const slotEndHour = Math.floor(workEnd);
  const slotEndMinute = Math.round((workEnd - slotEndHour) * 60);

  let currentSlotStart = setMinutes(setHours(dayInHostTz, slotStartHour), slotStartMinute);
  const dayEnd = setMinutes(setHours(dayInHostTz, slotEndHour), slotEndMinute);

  // Generate slots at 30-minute intervals
  while (isBefore(currentSlotStart, dayEnd)) {
    const slotEnd = addMinutes(currentSlotStart, bookingLink.duration);

    // Don't generate slots that extend past work hours
    if (isAfter(slotEnd, dayEnd)) {
      break;
    }

    // Convert to UTC for storage and comparison
    const slotStartUtc = fromZonedTime(currentSlotStart, hostTimezone);
    const slotEndUtc = fromZonedTime(slotEnd, hostTimezone);

    // Check minimum notice
    const minNoticeTime = addMinutes(now, bookingLink.minNotice);
    if (isBefore(slotStartUtc, minNoticeTime)) {
      currentSlotStart = addMinutes(currentSlotStart, 30);
      continue;
    }

    // Check buffers and conflicts
    const bufferStart = addMinutes(slotStartUtc, -bookingLink.bufferBefore);
    const bufferEnd = addMinutes(slotEndUtc, bookingLink.bufferAfter);

    const hasConflict = conflicts.some((event) => {
      // Skip events marked as "free" (transparent) - they don't block availability
      if (event.transparency === "transparent") {
        return false;
      }

      // For all-day events, check if they overlap with this day
      if (event.allDay) {
        const eventDay = startOfDay(event.start);
        const slotDay = startOfDay(slotStartUtc);
        return eventDay.getTime() === slotDay.getTime();
      }

      // Check if there's an overlap with buffer times
      return areIntervalsOverlapping(
        { start: bufferStart, end: bufferEnd },
        { start: event.start, end: event.end }
      );
    });

    slots.push({
      startTime: slotStartUtc,
      endTime: slotEndUtc,
      available: !hasConflict,
    });

    // Move to next slot (30-minute intervals for slot display)
    currentSlotStart = addMinutes(currentSlotStart, 30);
  }

  return slots;
}

/**
 * Get calendar events in a date range for conflict checking
 */
async function getCalendarEventsInRange(
  calendarIds: string[],
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<CalendarEvent[]> {
  if (calendarIds.length === 0) {
    return [];
  }

  const events = await prisma.calendarEvent.findMany({
    where: {
      feedId: { in: calendarIds },
      feed: { userId },
      start: { lte: endDate },
      end: { gte: startDate },
      status: { not: "CANCELLED" },
    },
    select: {
      id: true,
      start: true,
      end: true,
      allDay: true,
      transparency: true,
    },
  });

  return events;
}

/**
 * Check if a specific time slot is still available (real-time conflict check)
 */
export async function isSlotAvailable(
  bookingLinkId: string,
  startTime: Date,
  endTime: Date
): Promise<{ available: boolean; reason?: string }> {
  try {
    const bookingLink = await prisma.bookingLink.findUnique({
      where: { id: bookingLinkId },
    });

    if (!bookingLink) {
      return { available: false, reason: "Booking link not found" };
    }

    if (!bookingLink.enabled) {
      return { available: false, reason: "This booking link is currently unavailable" };
    }

    // Check minimum notice
    const now = new Date();
    const minNoticeTime = addMinutes(now, bookingLink.minNotice);
    if (isBefore(startTime, minNoticeTime)) {
      return { available: false, reason: "This time slot is too soon" };
    }

    // Check max future days
    const maxDate = addDays(now, bookingLink.maxFutureDays);
    if (isAfter(startTime, maxDate)) {
      return { available: false, reason: "This time slot is too far in the future" };
    }

    // Check for calendar conflicts
    // If selectedCalendars is empty, use ALL user calendars
    const selectedCalendars = parseSelectedCalendars(bookingLink.selectedCalendars);
    const calendarsToCheck = selectedCalendars.length > 0
      ? selectedCalendars
      : await getAllUserCalendarIds(bookingLink.userId);
    const bufferStart = addMinutes(startTime, -bookingLink.bufferBefore);
    const bufferEnd = addMinutes(endTime, bookingLink.bufferAfter);

    const calendarConflicts = await prisma.calendarEvent.findFirst({
      where: {
        feedId: { in: calendarsToCheck },
        feed: { userId: bookingLink.userId },
        status: { not: "CANCELLED" },
        // Exclude "transparent" (free) events - they don't block availability
        OR: [
          { transparency: null },
          { transparency: { not: "transparent" } },
        ],
        AND: [
          // Event overlaps with the slot (including buffers)
          {
            start: { lt: bufferEnd },
            end: { gt: bufferStart },
          },
        ],
      },
    });

    if (calendarConflicts) {
      return { available: false, reason: "This time is no longer available" };
    }

    // Check for existing bookings
    const existingBooking = await prisma.booking.findFirst({
      where: {
        bookingLinkId: bookingLink.id,
        status: "confirmed",
        OR: [
          // Booking overlaps with the slot (including buffers)
          {
            startTime: { lt: bufferEnd },
            endTime: { gt: bufferStart },
          },
        ],
      },
    });

    if (existingBooking) {
      return { available: false, reason: "This time is no longer available" };
    }

    return { available: true };
  } catch (error) {
    logger.error(
      "Failed to check slot availability",
      { error: error instanceof Error ? error.message : String(error) },
      LOG_SOURCE
    );
    return { available: false, reason: "An error occurred while checking availability" };
  }
}
