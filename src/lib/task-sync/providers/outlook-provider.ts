import { Client } from "@microsoft/microsoft-graph-client";
import { logger } from "@/lib/logger";
import { newDate } from "@/lib/date-utils";
import { convertOutlookRecurrenceToRRule } from "@/lib/outlook-calendar";
import {
  TaskProviderInterface,
  ExternalTaskList,
  ExternalTask,
  TaskToCreate,
  TaskUpdates,
  SyncOptions,
  TaskChange,
} from "./task-provider.interface";
import { TaskStatus, Priority, Task } from "@/types/task";

// Import interfaces from the original OutlookTasksService
interface OutlookDateTime {
  dateTime: string;
  timeZone: string;
}

interface RecurrencePattern {
  type: string;
  interval: number;
  month?: number;
  dayOfMonth?: number;
  daysOfWeek?: string[];
  firstDayOfWeek?: string;
  index?: string;
}

interface RecurrenceRange {
  type: string;
  startDate: string;
  endDate?: string;
  numberOfOccurrences?: number;
  recurrenceTimeZone?: string;
}

interface PatternedRecurrence {
  pattern: RecurrencePattern;
  range: RecurrenceRange;
}

interface OutlookTask {
  id: string;
  title: string;
  status: string;
  importance: string;
  sensitivity: string;
  createdDateTime: string;
  lastModifiedDateTime: string;
  isReminderOn: boolean;
  reminderDateTime?: OutlookDateTime;
  completedDateTime?: OutlookDateTime;
  dueDateTime?: OutlookDateTime;
  startDateTime?: OutlookDateTime;
  body?: {
    content: string;
    contentType: string;
  };
  categories?: string[];
  recurrence?: PatternedRecurrence;
}

interface OutlookTaskListResponse {
  id: string;
  displayName: string;
  wellknownListName?: string;
  parentGroupKey?: string;
}

const LOG_SOURCE = "OutlookTaskProvider";

/**
 * Task provider implementation for Microsoft Outlook Tasks
 * This provider enables synchronization between FluidCalendar tasks and Outlook tasks
 */
export class OutlookTaskProvider implements TaskProviderInterface {
  private client: Client;
  private accountId: string;

  constructor(client: Client, accountId: string) {
    this.client = client;
    this.accountId = accountId;
  }

  /**
   * Returns the provider type identifier
   */
  getType(): string {
    return "OUTLOOK";
  }

  /**
   * Returns a human-readable name for the provider
   */
  getName(): string {
    return "Microsoft Outlook";
  }

  /**
   * Gets all available task lists from Outlook
   */
  async getTaskLists(): Promise<ExternalTaskList[]> {
    try {
      const response = await this.client.api("/me/todo/lists").get();

      if (!response.value || !Array.isArray(response.value)) {
        logger.error(
          "Invalid response format from Outlook API",
          {
            response: JSON.stringify(response),
          },
          LOG_SOURCE
        );
        throw new Error("Invalid response format from Outlook API");
      }

      return response.value.map((list: OutlookTaskListResponse) => ({
        id: list.id,
        name: list.displayName,
        isDefault: list.wellknownListName === "defaultList",
        parentId: list.parentGroupKey,
      }));
    } catch (error) {
      logger.error(
        "Failed to get task lists",
        {
          error: error instanceof Error ? error.message : "Unknown error",
        },
        LOG_SOURCE
      );
      throw error;
    }
  }

  /**
   * Gets all tasks from a specific list in Outlook
   *
   * @param listId The ID of the task list to fetch tasks from
   * @param options Optional filtering parameters
   */
  async getTasks(
    listId: string,
    options?: SyncOptions
  ): Promise<ExternalTask[]> {
    try {
      let url = `/me/todo/lists/${listId}/tasks`;
      const allTasks: OutlookTask[] = [];

      // Add filters if specified
      if (options) {
        const filters = [];

        // Filter by completion status if specified
        if (options.includeCompleted === false) {
          filters.push("status ne 'completed'");
        }

        // Add filter query parameter if we have filters
        if (filters.length > 0) {
          url += `?$filter=${filters.join(" and ")}`;
        }
      }

      // Fetch all pages of tasks
      while (url) {
        const response = await this.client
          .api(url.includes("https://") ? url : url)
          .get();

        allTasks.push(...response.value);

        // Get the next page URL if it exists, extract just the path if it's a full URL
        url = response["@odata.nextLink"] || "";
        if (url.includes("https://")) {
          url = url.split("graph.microsoft.com/v1.0")[1];
        }
      }

      // Map Outlook tasks to our ExternalTask interface
      return allTasks.map((task) =>
        this.mapOutlookTaskToExternalTask(task, listId)
      );
    } catch (error) {
      logger.error(
        "Failed to get tasks",
        {
          error: error instanceof Error ? error.message : "Unknown error",
          listId,
        },
        LOG_SOURCE
      );
      throw error;
    }
  }

  /**
   * Creates a new task in Outlook
   *
   * @param listId The ID of the task list to create the task in
   * @param task The task data to create
   */
  async createTask(listId: string, task: TaskToCreate): Promise<ExternalTask> {
    try {
      // Map our task format to Outlook's format
      const outlookTask = {
        title: task.title,
        body: task.description
          ? {
              content: task.description,
              contentType: "text",
            }
          : undefined,
        importance: this.mapPriorityToOutlook(task.priority),
        status: this.mapStatusToOutlook(task.status),
        dueDateTime: task.dueDate
          ? {
              dateTime: new Date(task.dueDate).toISOString(),
              timeZone: "UTC",
            }
          : undefined,
        startDateTime: task.startDate
          ? {
              dateTime: new Date(task.startDate).toISOString(),
              timeZone: "UTC",
            }
          : undefined,
      };

      // Create the task in Outlook
      const response = await this.client
        .api(`/me/todo/lists/${listId}/tasks`)
        .post(outlookTask);

      // Map the response back to our format
      return this.mapOutlookTaskToExternalTask(response, listId);
    } catch (error) {
      logger.error(
        "Failed to create task in Outlook",
        {
          error: error instanceof Error ? error.message : "Unknown error",
          listId,
          // Fix logging issue by stringifying the task
          taskData: JSON.stringify(task),
        },
        LOG_SOURCE
      );
      throw error;
    }
  }

  /**
   * Updates an existing task in Outlook
   *
   * @param listId The ID of the task list the task belongs to
   * @param taskId The ID of the task to update
   * @param updates The task data to update
   */
  async updateTask(
    listId: string,
    taskId: string,
    updates: TaskUpdates
  ): Promise<ExternalTask> {
    try {
      // Map our updates to Outlook's format
      // Define the type instead of using any
      const outlookUpdates: Record<string, unknown> = {};

      if (updates.title !== undefined) {
        outlookUpdates.title = updates.title;
      }

      if (updates.description !== undefined) {
        outlookUpdates.body = {
          content: updates.description,
          contentType: "text",
        };
      }

      if (updates.priority !== undefined) {
        outlookUpdates.importance = this.mapPriorityToOutlook(updates.priority);
      }

      if (updates.status !== undefined) {
        outlookUpdates.status = this.mapStatusToOutlook(updates.status);
      }

      if (updates.dueDate !== undefined) {
        outlookUpdates.dueDateTime = updates.dueDate
          ? {
              dateTime: new Date(updates.dueDate).toISOString(),
              timeZone: "UTC",
            }
          : null;
      }

      if (updates.startDate !== undefined) {
        outlookUpdates.startDateTime = updates.startDate
          ? {
              dateTime: new Date(updates.startDate).toISOString(),
              timeZone: "UTC",
            }
          : null;
      }

      // If task is completed, set completedDateTime
      if (updates.status === TaskStatus.COMPLETED || updates.completedDate) {
        outlookUpdates.completedDateTime = {
          dateTime: new Date(updates.completedDate || new Date()).toISOString(),
          timeZone: "UTC",
        };
      }

      // Update the task in Outlook
      const response = await this.client
        .api(`/me/todo/lists/${listId}/tasks/${taskId}`)
        .patch(outlookUpdates);

      // Map the response back to our format
      return this.mapOutlookTaskToExternalTask(response, listId);
    } catch (error) {
      logger.error(
        "Failed to update task in Outlook",
        {
          error: error instanceof Error ? error.message : "Unknown error",
          listId,
          taskId,
          // Fix logging issue by stringifying the updates
          updatesData: JSON.stringify(updates),
        },
        LOG_SOURCE
      );
      throw error;
    }
  }

  /**
   * Deletes a task from Outlook
   *
   * @param listId The ID of the task list the task belongs to
   * @param taskId The ID of the task to delete
   */
  async deleteTask(listId: string, taskId: string): Promise<void> {
    try {
      await this.client
        .api(`/me/todo/lists/${listId}/tasks/${taskId}`)
        .delete();
    } catch (error) {
      logger.error(
        "Failed to delete task from Outlook",
        {
          error: error instanceof Error ? error.message : "Unknown error",
          listId,
          taskId,
        },
        LOG_SOURCE
      );
      throw error;
    }
  }

  /**
   * Gets changes to tasks since a specific time
   * Note: Microsoft Graph API doesn't provide a direct changes API for tasks,
   * so we have to fetch all tasks and filter by modification date
   *
   * @param listId The ID of the task list to get changes for
   * @param since Optional timestamp to get changes since
   */
  async getChanges(listId: string, since?: Date): Promise<TaskChange[]> {
    try {
      // Get all tasks in the list
      const tasks = await this.getTasks(listId);

      // Filter tasks modified since the given date
      const changes: TaskChange[] = [];

      if (since) {
        for (const task of tasks) {
          if (task.lastModified && task.lastModified > since) {
            changes.push({
              id: `change-${task.id}-${Date.now()}`,
              taskId: task.id,
              listId: listId,
              type: "UPDATE", // We can only detect updates this way
              timestamp: task.lastModified,
              changes: { task }, // Include the full task data
            });
          }
        }
      }

      return changes;
    } catch (error) {
      logger.error(
        "Failed to get task changes",
        {
          error: error instanceof Error ? error.message : "Unknown error",
          listId,
          // Fix the logging issue by using a string or null
          sinceDate: since ? since.toISOString() : null,
        },
        LOG_SOURCE
      );
      throw error;
    }
  }

  /**
   * Validates that the Outlook connection is working correctly
   */
  async validateConnection(): Promise<boolean> {
    try {
      // Try to get task lists as a simple validation
      await this.getTaskLists();
      return true;
    } catch (error) {
      logger.error(
        "Failed to validate Outlook connection",
        {
          error: error instanceof Error ? error.message : "Unknown error",
        },
        LOG_SOURCE
      );
      return false;
    }
  }

  /**
   * Maps an external task to our internal Task model
   *
   * @param externalTask The external task to map
   * @param projectId The ID of the project to associate the task with
   */
  mapToInternalTask(
    externalTask: ExternalTask,
    projectId: string
  ): Partial<Task> {
    // Create a task object with the Task type fields
    return {
      title: externalTask.title,
      description: externalTask.description || null,
      status: this.mapStatusFromExternal(externalTask.status),
      priority: this.mapPriorityFromExternal(externalTask.priority),
      projectId: projectId,
      dueDate: externalTask.dueDate || null,
      startDate: externalTask.startDate || null,
      completedAt: externalTask.completedDate || null, // Use completedAt instead of completedDate
      duration: externalTask.duration || null,
      isRecurring: externalTask.isRecurring || false,
      recurrenceRule: externalTask.recurrenceRule || null,
      externalTaskId: externalTask.id,
      externalUrl: externalTask.url || null,
      source: this.getType(),
      lastSyncedAt: new Date(),
      externalUpdatedAt: externalTask.lastModified || null,
      syncStatus: "SYNCED",
      providerId: null, // Will be set by the TaskSyncManager
      isAutoScheduled: false, // Will be determined by TaskSyncManager based on mapping
      scheduleLocked: false,
      scheduledStart: null,
      scheduledEnd: null,
      scheduleScore: null,
      lastScheduled: null,
      postponedUntil: null,
      tags: [], // Required by Task interface
      project: null, // Required by Task interface
      energyLevel: null,
      preferredTime: null,
      focusMode: false,
      lastCompletedDate: externalTask.completedDate || null,
    };
  }

  /**
   * Maps an internal task to the format expected by the external service
   *
   * @param task The internal task to map
   */
  mapToExternalTask(task: Partial<Task>): TaskToCreate {
    return {
      title: task.title!,
      description: task.description || undefined,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      startDate: task.startDate,
      duration: task.duration,
    };
  }

  /**
   * Maps an Outlook task to our ExternalTask interface
   *
   * @param outlookTask The Outlook task to map
   * @param listId The ID of the task list
   */
  private mapOutlookTaskToExternalTask(
    outlookTask: OutlookTask,
    listId: string
  ): ExternalTask {
    const task: ExternalTask = {
      id: outlookTask.id,
      title: outlookTask.title,
      description: outlookTask.body?.content,
      status: outlookTask.status,
      priority: outlookTask.importance,
      listId: listId,
      lastModified: outlookTask.lastModifiedDateTime
        ? new Date(outlookTask.lastModifiedDateTime)
        : undefined,
      url: `https://outlook.office.com/tasks/id/${outlookTask.id}`,
    };

    // Set dates if present
    if (outlookTask.dueDateTime?.dateTime) {
      task.dueDate = newDate(outlookTask.dueDateTime.dateTime);
    }

    if (outlookTask.startDateTime?.dateTime) {
      task.startDate = newDate(outlookTask.startDateTime.dateTime);
    }

    if (outlookTask.completedDateTime?.dateTime) {
      task.completedDate = newDate(outlookTask.completedDateTime.dateTime);
    }

    // Handle recurrence if present
    if (outlookTask.recurrence) {
      task.isRecurring = true;
      task.recurrenceRule = convertOutlookRecurrenceToRRule({
        pattern: outlookTask.recurrence.pattern,
        range: outlookTask.recurrence.range,
      });
    }

    // Add any categories as tags
    if (outlookTask.categories && outlookTask.categories.length > 0) {
      task.tags = outlookTask.categories;
    }

    return task;
  }

  /**
   * Maps our priority to Outlook importance
   */
  private mapPriorityToOutlook(priority?: Priority | null): string {
    if (!priority) return "normal";

    switch (priority) {
      case Priority.HIGH:
        return "high";
      case Priority.LOW:
        return "low";
      default:
        return "normal";
    }
  }

  /**
   * Maps Outlook importance to our priority
   */
  private mapPriorityFromExternal(importance?: string | null): Priority {
    if (!importance) return Priority.MEDIUM;

    switch (importance.toLowerCase()) {
      case "high":
        return Priority.HIGH;
      case "low":
        return Priority.LOW;
      default:
        return Priority.MEDIUM;
    }
  }

  /**
   * Maps our status to Outlook status
   */
  private mapStatusToOutlook(status?: TaskStatus | null): string {
    if (!status) return "notStarted";

    switch (status) {
      case TaskStatus.COMPLETED:
        return "completed";
      case TaskStatus.IN_PROGRESS:
        return "inProgress";
      default:
        return "notStarted";
    }
  }

  /**
   * Maps Outlook status to our status
   */
  private mapStatusFromExternal(status?: string | null): TaskStatus {
    if (!status) return TaskStatus.TODO;

    switch (status.toLowerCase()) {
      case "completed":
        return TaskStatus.COMPLETED;
      case "inprogress":
        return TaskStatus.IN_PROGRESS;
      default:
        return TaskStatus.TODO;
    }
  }
}
