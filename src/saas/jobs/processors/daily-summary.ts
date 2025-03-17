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
import { parseISO, toZonedTime, newDate, format } from "@/lib/date-utils";
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

      // Fetch meetings and tasks (after rescheduling to get the updated task data)
      const [meetings, tasks] = await Promise.all([
        getUserDailyMeetings(userId, targetDate),
        getUserTopTasks(userId, targetDate),
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

      // Generate email content
      const html = generateDailySummaryHtml(
        user.name || "User",
        zonedDate,
        meetings,
        tasks
      );
      const text = generateDailySummaryText(
        user.name || "User",
        zonedDate,
        meetings,
        tasks
      );

      // Queue email job
      await addEmailJob({
        to: email || user.email || "",
        subject: `Your Daily Summary for ${format(zonedDate, "MMMM d, yyyy")}`,
        html,
        text,
      });

      logger.info(
        `Daily summary email queued for user ${userId}`,
        {
          userId,
          email: email || user.email,
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
