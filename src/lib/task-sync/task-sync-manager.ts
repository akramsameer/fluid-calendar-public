/**
 * TaskSyncManager
 *
 * Central service to coordinate task synchronization across multiple providers.
 * This class is responsible for:
 * - Initializing providers based on their type
 * - Managing sync operations for task lists
 * - Handling task operations that trigger syncs
 * - Resolving conflicts between local and remote tasks
 */

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  TaskProvider as DbTaskProvider,
  TaskListMapping,
} from "@prisma/client";
import { Task, TaskStatus, Priority } from "@/types/task";
import {
  TaskProviderInterface,
  TaskToCreate,
  TaskUpdates,
} from "./providers/task-provider.interface";
import { newDate } from "@/lib/date-utils";

// Import provider implementations
import { OutlookTaskProvider } from "./providers/outlook-provider";
// import { CalDAVTaskProvider } from "./providers/caldav-provider";

// Import utility to get Microsoft Graph client
import { getMsGraphClient } from "@/lib/outlook-utils";

const LOG_SOURCE = "TaskSyncManager";

/**
 * Result of a synchronization operation
 */
export interface SyncResult {
  mappingId: string;
  providerId: string;
  providerType: string;
  success: boolean;
  imported: number;
  updated: number;
  deleted: number;
  skipped: number;
  errors: Array<{ taskId: string; error: string }>;
  timestamp: Date;
}

/**
 * Options for conflict resolution
 */
export type ConflictResolution =
  | { strategy: "USE_LOCAL" }
  | { strategy: "USE_REMOTE" }
  | { strategy: "MERGE"; fields: Record<string, "LOCAL" | "REMOTE"> };

export class TaskSyncManager {
  /**
   * Initialize a provider based on its type
   *
   * @param providerId The database ID of the provider
   * @returns A provider instance implementing TaskProviderInterface
   */
  async getProvider(providerId: string): Promise<TaskProviderInterface> {
    // Fetch provider details from database
    const dbProvider = await prisma.taskProvider.findUnique({
      where: { id: providerId },
      include: {
        // We need to check the account schema
        account: true,
      },
    });

    if (!dbProvider) {
      throw new Error(`Provider not found: ${providerId}`);
    }

    // Initialize the appropriate provider based on type
    // This will be expanded as we add more provider implementations
    switch (dbProvider.type) {
      case "OUTLOOK":
        if (!dbProvider.accountId) {
          throw new Error(
            `Missing account ID for Outlook provider ${providerId}`
          );
        }
        // Get Microsoft Graph client for the account
        const client = await getMsGraphClient(dbProvider.accountId);
        return new OutlookTaskProvider(client, dbProvider.accountId);
      // case "CALDAV":
      //   return new CalDAVTaskProvider(dbProvider);
      default:
        throw new Error(`Unsupported provider type: ${dbProvider.type}`);
    }
  }

  /**
   * Synchronize tasks for a specific mapping between a project and external task list
   *
   * @param mappingId The ID of the TaskListMapping to sync
   * @returns Result of the sync operation
   */
  async syncTaskList(mappingId: string): Promise<SyncResult> {
    logger.info(`Starting sync for mapping ${mappingId}`, {}, LOG_SOURCE);

    // Initialize result object
    const result: SyncResult = {
      mappingId,
      providerId: "",
      providerType: "",
      success: false,
      imported: 0,
      updated: 0,
      deleted: 0,
      skipped: 0,
      errors: [],
      timestamp: newDate(),
    };

    try {
      // Get mapping details
      const mapping = await prisma.taskListMapping.findUnique({
        where: { id: mappingId },
        include: { provider: true },
      });

      if (!mapping) {
        throw new Error(`Mapping not found: ${mappingId}`);
      }

      result.providerId = mapping.providerId;
      result.providerType = mapping.provider.type;

      // Initialize provider
      const provider = await this.getProvider(mapping.providerId);

      // Update mapping status
      await prisma.taskListMapping.update({
        where: { id: mappingId },
        data: {
          syncStatus: "SYNCING",
          // The schema needs to include errorMessage
          errorMessage: null as unknown as undefined,
        },
      });

      // Perform one-way sync from external to local in Phase 1
      // This will be expanded to two-way sync in Phase 2
      await this.syncFromExternalToLocal(provider, mapping, result);

      // Update mapping with success status
      await prisma.taskListMapping.update({
        where: { id: mappingId },
        data: {
          syncStatus: "OK",
          lastSyncedAt: newDate(),
          // The schema needs to include errorMessage
          errorMessage: null as unknown as undefined,
        },
      });

      result.success = true;
      logger.info(
        `Sync completed for mapping ${mappingId}`,
        {
          imported: result.imported,
          updated: result.updated,
          deleted: result.deleted,
          skipped: result.skipped,
          errors: result.errors.length,
        },
        LOG_SOURCE
      );

      return result;
    } catch (error) {
      // Update mapping with error status
      if (result.providerId) {
        await prisma.taskListMapping.update({
          where: { id: mappingId },
          data: {
            syncStatus: "ERROR",
            // The schema needs to include errorMessage
            errorMessage: (error instanceof Error
              ? error.message
              : "Unknown error") as unknown as undefined,
          },
        });
      }

      logger.error(
        `Sync failed for mapping ${mappingId}`,
        {
          error: error instanceof Error ? error.message : "Unknown error",
        },
        LOG_SOURCE
      );

      result.success = false;
      result.errors.push({
        taskId: "general",
        error: error instanceof Error ? error.message : "Unknown error",
      });

      return result;
    }
  }

  /**
   * Synchronize all task lists for a user
   *
   * @param userId The ID of the user
   * @returns Results of all sync operations
   */
  async syncAllForUser(userId: string): Promise<SyncResult[]> {
    logger.info(
      `Starting sync for all providers for user ${userId}`,
      {},
      LOG_SOURCE
    );

    const results: SyncResult[] = [];

    try {
      // Get all active mappings for the user
      const mappings = await prisma.taskListMapping.findMany({
        where: {
          provider: {
            userId,
            enabled: true,
            syncEnabled: true,
          },
        },
      });

      // Sync each mapping
      for (const mapping of mappings) {
        try {
          const result = await this.syncTaskList(mapping.id);
          results.push(result);
        } catch (error) {
          logger.error(
            `Failed to sync mapping ${mapping.id}`,
            {
              error: error instanceof Error ? error.message : "Unknown error",
            },
            LOG_SOURCE
          );

          results.push({
            mappingId: mapping.id,
            providerId: mapping.providerId,
            providerType: "", // Will be filled in by syncTaskList if it gets far enough
            success: false,
            imported: 0,
            updated: 0,
            deleted: 0,
            skipped: 0,
            errors: [
              {
                taskId: "general",
                error: error instanceof Error ? error.message : "Unknown error",
              },
            ],
            timestamp: newDate(),
          });
        }
      }

      return results;
    } catch (error) {
      logger.error(
        `Failed to sync all providers for user ${userId}`,
        {
          error: error instanceof Error ? error.message : "Unknown error",
        },
        LOG_SOURCE
      );

      throw error;
    }
  }

  /**
   * Internal method to sync tasks from external provider to local database
   * This is used in Phase 1 for one-way sync
   */
  private async syncFromExternalToLocal(
    provider: TaskProviderInterface,
    mapping: TaskListMapping & { provider: DbTaskProvider },
    result: SyncResult
  ): Promise<void> {
    try {
      // Get tasks from external provider
      const externalTasks = await provider.getTasks(mapping.externalListId);

      // Get existing tasks in our database for this mapping
      const existingTasks = await prisma.task.findMany({
        where: {
          projectId: mapping.projectId,
          // We need to update the task schema to include providerId
          providerId: mapping.providerId as unknown as undefined,
          source: mapping.provider.type,
        },
      });

      // Create a map of existing tasks by externalTaskId for efficient lookup
      const existingTaskMap = new Map(
        existingTasks.map((task) => [task.externalTaskId, task])
      );

      // Process each external task
      for (const externalTask of externalTasks) {
        try {
          const existingTask = existingTaskMap.get(externalTask.id);

          if (existingTask) {
            // Task exists - update it if needed
            // In Phase 1, we'll always update local tasks with external data
            // In Phase 2, we'll implement conflict detection and resolution

            // Map external task to our internal format
            const updatedTaskData = provider.mapToInternalTask(
              externalTask,
              mapping.projectId
            );

            // Update the task
            await prisma.task.update({
              where: { id: existingTask.id },
              data: {
                ...updatedTaskData,
                lastSyncedAt: newDate(),
                syncStatus: "SYNCED",
              },
            });

            result.updated++;
          } else {
            // New task - create it
            const newTaskData = provider.mapToInternalTask(
              externalTask,
              mapping.projectId
            );

            await prisma.task.create({
              data: {
                ...newTaskData,
                isAutoScheduled: mapping.isAutoScheduled,
                scheduleLocked: false,
                source: mapping.provider.type,
                // We need to update the task schema to include providerId
                providerId: mapping.providerId as unknown as undefined,
                externalTaskId: externalTask.id,
                lastSyncedAt: newDate(),
                syncStatus: "SYNCED",
                userId: mapping.provider.userId,
              },
            });

            result.imported++;
          }
        } catch (error) {
          result.errors.push({
            taskId: externalTask.id,
            error: error instanceof Error ? error.message : "Unknown error",
          });
          result.skipped++;
        }
      }

      // In Phase 2, we'll implement handling deleted tasks in the external system
      // For now, we just import and update
    } catch (error) {
      logger.error(
        `Failed to sync from external to local`,
        {
          mappingId: mapping.id,
          error: error instanceof Error ? error.message : "Unknown error",
        },
        LOG_SOURCE
      );

      throw error;
    }
  }

  // These methods will be implemented in Phase 2

  /**
   * Placeholder for creating a task that triggers sync
   * This will be implemented in Phase 2
   */
  async createTask(_task: TaskToCreate): Promise<Task> {
    // TODO: Implement in Phase 2
    throw new Error("Not implemented in Phase 1");
  }

  /**
   * Placeholder for updating a task that triggers sync
   * This will be implemented in Phase 2
   */
  async updateTask(_taskId: string, _updates: TaskUpdates): Promise<Task> {
    // TODO: Implement in Phase 2
    throw new Error("Not implemented in Phase 1");
  }

  /**
   * Placeholder for deleting a task that triggers sync
   * This will be implemented in Phase 2
   */
  async deleteTask(_taskId: string): Promise<void> {
    // TODO: Implement in Phase 2
    throw new Error("Not implemented in Phase 1");
  }

  /**
   * Placeholder for resolving conflicts between local and remote tasks
   * This will be implemented in Phase 2
   */
  async resolveConflict(
    _taskId: string,
    _resolution: ConflictResolution
  ): Promise<Task> {
    // TODO: Implement in Phase 2
    throw new Error("Not implemented in Phase 1");
  }
}
