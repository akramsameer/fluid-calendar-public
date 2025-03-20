import { logger } from "@/lib/logger";
import { prisma } from "./prisma-utils";
import {
  toZonedTime,
  newDate,
} from "@/lib/date-utils";

const LOG_SOURCE = "TaskUtils";

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  dueDate?: Date | null;
  priority: "LOW" | "MEDIUM" | "HIGH";
  status: "TODO" | "IN_PROGRESS" | "DONE";
  projectName?: string | null;
  scheduledStart?: Date | null;
}

/**
 * Fetch a user's top tasks
 * @param userId The user ID
 * @param targetDate The date to fetch tasks for (ISO string)
 * @returns An array of tasks
 */
export async function getUserTopTasks(userId: string, targetDate: string) {
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
      `Getting tasks for user ${userId} on ${targetDate} (${userTimezone})`,
      {
        userId,
        targetDate,
        dayStart: dayStart.toISOString(),
        dayEnd: dayEnd.toISOString(),
        dateComponents: [year.toString(), month.toString(), day.toString()],
      },
      LOG_SOURCE
    );

    // Get tasks that are:
    // 1. Not completed
    // 2. Not postponed (or postponed until date is in the past)
    // 3. Sorted by scheduled start time (earliest first)
    const tasks = await prisma.task.findMany({
      where: {
        userId,
        status: {
          not: "completed",
        },
        OR: [
          {
            postponedUntil: null,
          },
          {
            postponedUntil: {
              lte: newDate(),
            },
          },
        ],
      },
      include: {
        project: {
          select: {
            name: true,
          },
        },
      },
      orderBy: [
        {
          scheduledStart: "asc",
        },
        {
          priority: "desc",
        },
        {
          dueDate: "asc",
        },
      ],
      take: 3,
    });

    // Transform to Task interface
    const topTasks: Task[] = tasks.map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      dueDate: task.dueDate,
      priority: (task.priority || "low").toUpperCase() as
        | "LOW"
        | "MEDIUM"
        | "HIGH",
      status:
        task.status === "todo"
          ? "TODO"
          : task.status === "in_progress"
          ? "IN_PROGRESS"
          : "DONE",
      projectName: task.project?.name,
      scheduledStart: task.scheduledStart,
    }));

    logger.debug(
      `Retrieved ${topTasks.length} top tasks for user ${userId}`,
      {
        taskIds: topTasks.map((t) => t.id),
      },
      LOG_SOURCE
    );

    return topTasks;
  } catch (error) {
    logger.error(
      `Error getting tasks for user ${userId}`,
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
