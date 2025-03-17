import { getRedisClient } from "../config/redis";
import { logger } from "@/lib/logger";

const LOG_SOURCE = "RedisNotification";
const NOTIFICATION_EXPIRY = 60 * 60; // 1 hour in seconds

/**
 * Notification types
 */
export enum NotificationType {
  TASK_SCHEDULE_COMPLETE = "TASK_SCHEDULE_COMPLETE",
}

/**
 * Notification data structure
 */
export interface Notification {
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp: string;
}

/**
 * Create a notification key for a user
 */
function getNotificationKey(userId: string): string {
  return `notifications:${userId}`;
}

/**
 * Send a notification to a user
 */
export async function sendNotification(
  userId: string,
  notification: Notification
): Promise<void> {
  try {
    const redis = getRedisClient();
    const key = getNotificationKey(userId);

    // Add timestamp if not provided
    if (!notification.timestamp) {
      notification.timestamp = new Date().toISOString();
    }

    // Store notification in Redis list
    await redis.lpush(key, JSON.stringify(notification));

    // Set expiry on the key if not already set
    await redis.expire(key, NOTIFICATION_EXPIRY);

    logger.info(
      "Notification sent",
      { userId, type: notification.type },
      LOG_SOURCE
    );
  } catch (error) {
    logger.error(
      "Failed to send notification",
      {
        error: error instanceof Error ? error.message : String(error),
        userId,
      },
      LOG_SOURCE
    );
  }
}

/**
 * Get notifications for a user
 * @returns Array of notifications, newest first
 */
export async function getNotifications(
  userId: string,
  limit = 10
): Promise<Notification[]> {
  try {
    const redis = getRedisClient();
    const key = getNotificationKey(userId);

    // Get notifications from Redis list (newest first)
    const notifications = await redis.lrange(key, 0, limit - 1);

    // Parse JSON strings to objects
    return notifications.map((item) => JSON.parse(item) as Notification);
  } catch (error) {
    logger.error(
      "Failed to get notifications",
      {
        error: error instanceof Error ? error.message : String(error),
        userId,
      },
      LOG_SOURCE
    );
    return [];
  }
}

/**
 * Clear notifications for a user
 */
export async function clearNotifications(userId: string): Promise<void> {
  try {
    const redis = getRedisClient();
    const key = getNotificationKey(userId);

    // Delete the notifications key
    await redis.del(key);

    logger.info("Notifications cleared", { userId }, LOG_SOURCE);
  } catch (error) {
    logger.error(
      "Failed to clear notifications",
      {
        error: error instanceof Error ? error.message : String(error),
        userId,
      },
      LOG_SOURCE
    );
  }
}
