import { Job } from "bullmq";
import { BaseProcessor } from "./base-processor";
import {
  DailySummaryJobData,
  QUEUE_NAMES,
  addEmailJob,
  addDailySummaryJob,
} from "../queues";
import { getUserDailyMeetings } from "../utils/meeting-utils";
import { getUserTopTasks } from "../utils/task-utils";
import {
  generateDailySummaryHtml,
  generateDailySummaryText,
} from "../templates/daily-summary";
import { logger } from "@/lib/logger";
import { prisma } from "../utils/prisma-utils";
import {
  parseISO,
  toZonedTime,
  newDate,
  format,
  newDateFromYMD,
} from "@/lib/date-utils";
import { scheduleAllTasksForUser } from "@/services/scheduling/TaskSchedulingService";

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
        },
      });

      if (!user) {
        throw new Error(`User ${userId} not found`);
      }

      const timezone = user.userSettings?.timeZone || "UTC";

      // Parse the date or use today
      const targetDate = date || format(newDate(), "yyyy-MM-dd");
      const parsedDate = parseISO(targetDate);
      const zonedDate = toZonedTime(parsedDate, timezone);

      // Determine if we should show today or tomorrow based on current time in user's timezone
      const currentTimeInUserTz = toZonedTime(newDate(), timezone);
      const currentHourInUserTz = currentTimeInUserTz.getHours();

      // If it's before 8am in user's timezone, show today; otherwise show tomorrow
      const showTomorrow = currentHourInUserTz >= 8;

      // Calculate the forecast date based on the determination above
      // Use the current time in user's timezone as the base date to calculate tomorrow
      const forecastDate = format(
        newDateFromYMD(
          currentTimeInUserTz.getFullYear(),
          currentTimeInUserTz.getMonth(),
          currentTimeInUserTz.getDate() + (showTomorrow ? 1 : 0)
        ),
        "yyyy-MM-dd"
      );

      // Log which day we're showing
      logger.info(
        `Generating ${
          showTomorrow ? "tomorrow's" : "today's"
        } summary for user ${userId}`,
        {
          userId,
          currentHourInUserTz,
          showingTomorrow: showTomorrow,
          forecastDate,
          timezone,
          date: date || null,
          targetDate,
          parsedDate: parsedDate.toISOString(),
          zonedDate: zonedDate.toISOString(),
          newDate: newDate().toISOString(),
          currentTimeInUserTz: currentTimeInUserTz.toISOString(),
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
      const forecastDateObj = toZonedTime(parseISO(forecastDate), timezone);

      const html = generateDailySummaryHtml(
        user.name || "User",
        forecastDateObj,
        meetings,
        tasks
      );
      const text = generateDailySummaryText(
        user.name || "User",
        forecastDateObj,
        meetings,
        tasks
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

      // Get all users with email notifications enabled
      const users = await prisma.user.findMany({
        where: {
          // Add any conditions for users who should receive daily summaries
          // For example, if you have a user preference for daily summaries:
          // preferences: {
          //   dailySummaryEnabled: true,
          // },
        },
        select: {
          id: true,
          email: true,
          // If you have user preferences:
          // preferences: {
          //   select: {
          //     timezone: true,
          //   },
          // },
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
