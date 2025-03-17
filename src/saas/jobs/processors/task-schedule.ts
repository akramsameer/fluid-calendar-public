import { Job } from "bullmq";
import { BaseProcessor } from "./base-processor";
import { prisma } from "@/lib/prisma";
import { TaskScheduleJobData } from "../queues";
import { logger } from "@/lib/logger";
import { sendNotification, NotificationType } from "../utils/notification";
import { scheduleAllTasksForUser } from "@/services/scheduling/TaskSchedulingService";

const LOG_SOURCE = "TaskScheduleProcessor";

export class TaskScheduleProcessor extends BaseProcessor<
  TaskScheduleJobData,
  Record<string, unknown>
> {
  constructor() {
    super("task-schedule");
  }

  async process(
    job: Job<TaskScheduleJobData>
  ): Promise<Record<string, unknown>> {
    const { userId } = job.data;

    if (!userId) {
      throw new Error("User ID is required for task scheduling");
    }

    logger.info(
      "Processing task scheduling job",
      { userId: userId as string, jobId: job.id || "unknown" },
      LOG_SOURCE
    );

    try {
      // Use the simplified function to schedule all tasks
      const updatedTasks = await scheduleAllTasksForUser(userId as string);

      // Create result object
      const result = {
        success: true,
        tasksScheduled: updatedTasks.length,
        timestamp: new Date().toISOString(),
      };

      // Send notification via Redis with a clear type identifier
      await sendNotification(userId as string, {
        type: NotificationType.TASK_SCHEDULE_COMPLETE,
        title: "Task Scheduling Complete",
        message: `${updatedTasks.length} tasks have been scheduled`,
        data: {
          timestamp: new Date().toISOString(),
          tasksScheduled: updatedTasks.length,
          jobId: job.id,
        },
        timestamp: new Date().toISOString(),
      });

      // Explicitly update the job record status to ensure it's marked as completed
      // This is a backup in case the BaseProcessor's event handlers miss it
      try {
        await prisma.jobRecord.updateMany({
          where: {
            queueName: job.queueName,
            jobId: {
              startsWith: `schedule-tasks-${userId}`,
            },
            status: {
              in: ["PENDING", "ACTIVE"],
            },
          },
          data: {
            status: "COMPLETED",
            finishedAt: new Date(),
            result: result,
          },
        });
      } catch (dbError) {
        logger.error(
          "Error updating job record status",
          {
            error: dbError instanceof Error ? dbError.message : String(dbError),
            userId,
            jobId: job.id || "unknown",
          },
          LOG_SOURCE
        );
        // Continue execution even if this fails
      }

      logger.info(
        "Task scheduling completed successfully",
        {
          userId: userId as string,
          jobId: job.id || "unknown",
          tasksScheduled: updatedTasks.length,
        },
        LOG_SOURCE
      );

      return result;
    } catch (error) {
      logger.error(
        "Error in task scheduling job",
        {
          error: error instanceof Error ? error.message : String(error),
          userId,
        },
        LOG_SOURCE
      );
      throw error;
    }
  }
}

// Create and export the processor instance
export const taskScheduleProcessor = new TaskScheduleProcessor();
