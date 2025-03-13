import { Job } from "bullmq";
import { BaseProcessor } from "./base-processor";
import { TaskReminderJobData, QUEUE_NAMES, addEmailJob } from "../queues";
import { logger } from "@/lib/logger";
import { prisma } from "../utils/prisma-utils";
import {
  generateTaskReminderHtml,
  generateTaskReminderText,
} from "../templates/task-reminder";

const LOG_SOURCE = "TaskReminderProcessor";

/**
 * Task reminder processor for sending task reminder emails
 */
export class TaskReminderProcessor extends BaseProcessor<
  TaskReminderJobData & Record<string, unknown>,
  { success: boolean }
> {
  constructor() {
    super(QUEUE_NAMES.TASK_REMINDER);
  }

  /**
   * Process a task reminder job
   * @param job The task reminder job to process
   */
  protected async process(
    job: Job<TaskReminderJobData & Record<string, unknown>>
  ): Promise<{ success: boolean }> {
    const { userId, taskId, email } = job.data;

    logger.info(
      `Processing task reminder for user ${userId}, task ${taskId}`,
      {
        userId,
        taskId,
        email,
      },
      LOG_SOURCE
    );

    try {
      // Get task details
      const task = await prisma.task.findUnique({
        where: { id: taskId },
        include: {
          project: {
            select: {
              name: true,
            },
          },
        },
      });

      if (!task) {
        throw new Error(`Task ${taskId} not found`);
      }

      // Get user details
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          name: true,
          email: true,
        },
      });

      if (!user) {
        throw new Error(`User ${userId} not found`);
      }

      // Generate email content
      const html = generateTaskReminderHtml(user.name || "User", task);
      const text = generateTaskReminderText(user.name || "User", task);

      // Queue email job
      await addEmailJob({
        to: email || user.email || "",
        subject: `Task Reminder: ${task.title}`,
        html,
        text,
      });

      logger.info(
        `Task reminder email queued for user ${userId}`,
        {
          userId,
          taskId,
          email: email || user.email,
        },
        LOG_SOURCE
      );

      return { success: true };
    } catch (error) {
      logger.error(
        `Failed to process task reminder for user ${userId}, task ${taskId}`,
        {
          userId,
          taskId,
          email,
          error: error instanceof Error ? error.message : "Unknown error",
        },
        LOG_SOURCE
      );

      throw error;
    }
  }
}

// Create and export a singleton instance
export const taskReminderProcessor = new TaskReminderProcessor();
