import { scheduleAllTasksForUser } from "@/services/scheduling/TaskSchedulingService";
import { Job } from "bullmq";

import {
  addDays,
  format,
  newDate,
  newDateFromYMD,
  parseISO,
  toZonedTime,
} from "@/lib/date-utils";
import { logger } from "@/lib/logger";

import {
  DailySummaryJobData,
  QUEUE_NAMES,
  addDailySummaryJob,
  addEmailJob,
} from "../queues";
import {
  generateDailySummaryHtml,
  generateDailySummaryText,
} from "../templates/daily-summary";
import { getUserDailyMeetings } from "../utils/meeting-utils";
import { prisma } from "../utils/prisma-utils";
import { getUserTopTasks } from "../utils/task-utils";
import { BaseProcessor } from "./base-processor";

const LOG_SOURCE = "DailySummaryProcessor";

/**
 * Daily summary processor for generating and sending daily summary emails
 */
export class DailySummaryProcessor extends BaseProcessor<
  DailySummaryJobData & Record<string, unknown>,
  { success: boolean }
> {
  constructor() {
    super(QUEUE_NAMES.DAILY_SUMMARY);
  }

  /**
   * Process a daily summary job
   * @param job The daily summary job to process
   */
  protected async process(
    job: Job<DailySummaryJobData & Record<string, unknown>>
  ): Promise<{ success: boolean }> {
    const { userId, email, date } = job.data;

    logger.info(
      `Generating daily summary for user ${userId}`,
      {
        userId,
        email,
        date: date || null,
      },
      LOG_SOURCE
    );

    try {
      // Get user details
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          name: true,
          email: true,
          userSettings: {
            select: {
              timeZone: true,
            },
          },
          notificationSettings: {
            select: {
              dailyEmailEnabled: true,
            },
          },
        },
      });

      if (!user) {
        throw new Error(`User ${userId} not found`);
      }

      // Check if daily email is enabled for this user
      if (!user.notificationSettings?.dailyEmailEnabled) {
        return { success: true };
      }

      const timezone = user.userSettings?.timeZone || "UTC";

      // Parse the date or use today
      const targetDate = date || format(newDate(), "yyyy-MM-dd");
      const parsedDate = parseISO(targetDate);
      const zonedDate = toZonedTime(parsedDate, timezone);

      let forecastDate: string;
      let showTomorrow: boolean;
      let currentHourInUserTz: number | undefined;
      let currentTimeInUserTz: Date | undefined;

      if (date) {
        // If a specific date was provided, use it directly
        forecastDate = targetDate;
        showTomorrow = false; // Not relevant when date is specified
      } else {
        // If no date provided, use today/tomorrow logic based on current time
        currentTimeInUserTz = toZonedTime(newDate(), timezone);
        currentHourInUserTz = currentTimeInUserTz.getHours();

        // If it's before 8am in user's timezone, show today; otherwise show tomorrow
        showTomorrow = currentHourInUserTz >= 8;

        // Calculate the forecast date based on the determination above
        // Use the current time in user's timezone as the base date to calculate tomorrow
        forecastDate = format(
          showTomorrow
            ? addDays(toZonedTime(newDate(), timezone), 1)
            : toZonedTime(newDate(), timezone),
          "yyyy-MM-dd"
        );
      }

      // Log which day we're showing
      logger.info(
        `Generating ${
          showTomorrow ? "tomorrow's" : date ? "specified date" : "today's"
        } summary for user ${userId}`,
        {
          userId,
          currentHourInUserTz: currentHourInUserTz || null,
          showingTomorrow: showTomorrow,
          forecastDate,
          timezone,
          date: date || null,
          targetDate,
          parsedDate: parsedDate.toISOString(),
          zonedDate: zonedDate.toISOString(),
          newDate: newDate().toISOString(),
          currentTimeInUserTz: currentTimeInUserTz?.toISOString() || null,
        },
        LOG_SOURCE
      );

      // Reschedule all tasks for the user before generating the summary
      try {
        await scheduleAllTasksForUser(userId);
      } catch (scheduleError) {
        // Log the error but continue with the daily summary
        logger.error(
          `Error rescheduling tasks for user ${userId}`,
          {
            userId,
            error:
              scheduleError instanceof Error
                ? scheduleError.message
                : "Unknown error",
          },
          LOG_SOURCE
        );
        // Don't throw here, continue with the daily summary
      }

      // Fetch meetings and tasks for the forecast date
      try {
        const [meetings, tasks] = await Promise.all([
          getUserDailyMeetings(userId, forecastDate),
          getUserTopTasks(userId, forecastDate),
        ]);

        logger.info(
          `Fetched ${meetings.length} meetings and ${tasks.length} tasks for user ${userId}`,
          {
            userId,
            meetingCount: meetings.length,
            taskCount: tasks.length,
          },
          LOG_SOURCE
        );

        // Generate email content with the forecast date
        // Create forecastDateObj directly from the components of the forecastDate
        const [year, month, day] = forecastDate.split("-").map(Number);
        const forecastDateObj = newDateFromYMD(year, month - 1, day);

        const html = generateDailySummaryHtml(
          user.name || "User",
          forecastDateObj,
          meetings,
          tasks,
          timezone
        );
        const text = generateDailySummaryText(
          user.name || "User",
          forecastDateObj,
          meetings,
          tasks,
          timezone
        );

        // Queue email job with appropriate subject
        await addEmailJob({
          to: email || user.email || "",
          subject: `Agenda for ${format(forecastDateObj, "EEEE, MMMM do")}`,
          html,
          text,
        });

        logger.info(
          `Daily summary email queued for user ${userId}`,
          {
            userId,
            email: email || user.email,
            forecastDateObj: forecastDateObj.toISOString(),
          },
          LOG_SOURCE
        );

        return { success: true };
      } catch (error) {
        logger.error(
          `Failed to generate daily summary for user ${userId}`,
          {
            userId,
            email,
            error: error instanceof Error ? error.message : "Unknown error",
          },
          LOG_SOURCE
        );

        throw error;
      }
    } catch (error) {
      logger.error(
        `Failed to generate daily summary for user ${userId}`,
        {
          userId,
          email,
          error: error instanceof Error ? error.message : "Unknown error",
        },
        LOG_SOURCE
      );

      throw error;
    }
  }

  /**
   * Schedule daily summary emails for all users
   */
  public static async scheduleForAllUsers(): Promise<void> {
    try {
      logger.info(
        "Scheduling daily summary emails for all users",
        {},
        LOG_SOURCE
      );

      // Get all users with daily email notifications enabled
      const users = await prisma.user.findMany({
        where: {
          notificationSettings: {
            dailyEmailEnabled: true,
          },
        },
        select: {
          id: true,
          email: true,
        },
      });

      logger.info(
        `Found ${users.length} users for daily summary emails`,
        {
          userCount: users.length,
        },
        LOG_SOURCE
      );

      // Schedule a job for each user
      for (const user of users) {
        await addDailySummaryJob({
          userId: user.id,
          email: user.email || "",
        });

        logger.info(
          `Scheduled daily summary email for user ${user.id}`,
          {
            userId: user.id,
            email: user.email,
          },
          LOG_SOURCE
        );
      }

      logger.info(
        "Finished scheduling daily summary emails",
        {
          scheduledCount: users.length,
        },
        LOG_SOURCE
      );
    } catch (error) {
      logger.error(
        "Failed to schedule daily summary emails",
        {
          error: error instanceof Error ? error.message : "Unknown error",
        },
        LOG_SOURCE
      );

      throw error;
    }
  }
}

// Create and export a singleton instance
export const dailySummaryProcessor = new DailySummaryProcessor();
