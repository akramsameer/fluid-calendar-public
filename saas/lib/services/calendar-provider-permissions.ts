import { SubscriptionPlan, SubscriptionStatus } from "@prisma/client";

import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import {
  getCalendarProviderLimit,
  hasUnlimitedCalendarProviders,
} from "@/lib/subscription/plan-config";

const LOG_SOURCE = "CalendarProviderPermissions";

export interface CalendarProviderPermissionResult {
  canAdd: boolean;
  reason?: string;
  currentUsage: number;
  limit: number | null;
  upgradeRequired?: boolean;
}

/**
 * Check if a user can add a new calendar provider based on their subscription
 */
export async function checkCalendarProviderPermission(
  userId: string
): Promise<CalendarProviderPermissionResult> {
  try {
    // Get user's subscription and current usage
    const [subscription, usage, currentProviders] = await Promise.all([
      prisma.subscription.findUnique({
        where: { userId },
      }),
      prisma.subscriptionUsage.findUnique({
        where: { userId },
      }),
      // Count actual calendar providers (accounts with calendar integration)
      prisma.connectedAccount.count({
        where: {
          userId,
          OR: [
            { provider: "GOOGLE" },
            { provider: "OUTLOOK" },
            { provider: "CALDAV" },
          ],
        },
      }),
    ]);

    // Default to FREE plan if no subscription
    const plan = subscription?.plan || SubscriptionPlan.FREE;
    const status = subscription?.status || SubscriptionStatus.CANCELLED;
    const limit = getCalendarProviderLimit(plan);

    logger.debug(
      "Checking calendar provider permission",
      {
        userId,
        plan,
        status,
        limit,
        currentProviders,
        usageRecordExists: !!usage,
      },
      LOG_SOURCE
    );

    // Check if subscription is active
    if (
      !subscription ||
      (status !== SubscriptionStatus.ACTIVE &&
        status !== SubscriptionStatus.TRIALING)
    ) {
      return {
        canAdd: false,
        reason: "Active subscription required to add calendar providers",
        currentUsage: currentProviders,
        limit,
        upgradeRequired: true,
      };
    }

    // Update usage record with current count
    await prisma.subscriptionUsage.upsert({
      where: { userId },
      create: {
        userId,
        subscriptionId: subscription.id,
        calendarProvidersUsed: currentProviders,
        lastCalculatedAt: new Date(),
      },
      update: {
        calendarProvidersUsed: currentProviders,
        lastCalculatedAt: new Date(),
      },
    });

    // Check if user has unlimited providers
    if (hasUnlimitedCalendarProviders(plan)) {
      return {
        canAdd: true,
        currentUsage: currentProviders,
        limit: null,
      };
    }

    // Check if user has reached their limit
    if (limit !== null && currentProviders >= limit) {
      return {
        canAdd: false,
        reason: `You've reached your limit of ${limit} calendar provider${limit === 1 ? "" : "s"} for the ${plan.replace("_", " ")} plan`,
        currentUsage: currentProviders,
        limit,
        upgradeRequired: true,
      };
    }

    // User can add more providers
    return {
      canAdd: true,
      currentUsage: currentProviders,
      limit,
    };
  } catch (error) {
    logger.error(
      "Failed to check calendar provider permission",
      {
        userId,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      LOG_SOURCE
    );

    // Fail closed - deny the action when permission check fails
    return {
      canAdd: false,
      reason: "Permission check failed, access denied for security",
      currentUsage: 0,
      limit: 1, // Conservative default
      upgradeRequired: false,
    };
  }
}

/**
 * Increment calendar provider usage count
 */
export async function incrementCalendarProviderUsage(
  userId: string
): Promise<void> {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      logger.warn(
        "No subscription found when incrementing calendar provider usage",
        { userId },
        LOG_SOURCE
      );
      return;
    }

    await prisma.subscriptionUsage.upsert({
      where: { userId },
      create: {
        userId,
        subscriptionId: subscription.id,
        calendarProvidersUsed: 1,
        lastCalculatedAt: new Date(),
      },
      update: {
        calendarProvidersUsed: {
          increment: 1,
        },
        lastCalculatedAt: new Date(),
      },
    });

    logger.debug("Incremented calendar provider usage", { userId }, LOG_SOURCE);
  } catch (error) {
    logger.error(
      "Failed to increment calendar provider usage",
      {
        userId,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      LOG_SOURCE
    );
  }
}

/**
 * Decrement calendar provider usage count
 */
export async function decrementCalendarProviderUsage(
  userId: string
): Promise<void> {
  try {
    const usage = await prisma.subscriptionUsage.findUnique({
      where: { userId },
    });

    if (!usage) {
      logger.warn(
        "No usage record found when decrementing calendar provider usage",
        { userId },
        LOG_SOURCE
      );
      return;
    }

    // Don't let usage go below 0
    const newUsage = Math.max(0, usage.calendarProvidersUsed - 1);

    await prisma.subscriptionUsage.update({
      where: { userId },
      data: {
        calendarProvidersUsed: newUsage,
        lastCalculatedAt: new Date(),
      },
    });

    logger.debug(
      "Decremented calendar provider usage",
      { userId, newUsage },
      LOG_SOURCE
    );
  } catch (error) {
    logger.error(
      "Failed to decrement calendar provider usage",
      {
        userId,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      LOG_SOURCE
    );
  }
}

/**
 * Recalculate and sync calendar provider usage with actual account count
 */
export async function syncCalendarProviderUsage(userId: string): Promise<void> {
  try {
    const [subscription, actualCount] = await Promise.all([
      prisma.subscription.findUnique({
        where: { userId },
      }),
      prisma.connectedAccount.count({
        where: {
          userId,
          OR: [
            { provider: "GOOGLE" },
            { provider: "OUTLOOK" },
            { provider: "CALDAV" },
          ],
        },
      }),
    ]);

    if (!subscription) {
      logger.warn(
        "No subscription found when syncing calendar provider usage",
        { userId },
        LOG_SOURCE
      );
      return;
    }

    await prisma.subscriptionUsage.upsert({
      where: { userId },
      create: {
        userId,
        subscriptionId: subscription.id,
        calendarProvidersUsed: actualCount,
        lastCalculatedAt: new Date(),
      },
      update: {
        calendarProvidersUsed: actualCount,
        lastCalculatedAt: new Date(),
      },
    });

    logger.debug(
      "Synced calendar provider usage",
      { userId, actualCount },
      LOG_SOURCE
    );
  } catch (error) {
    logger.error(
      "Failed to sync calendar provider usage",
      {
        userId,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      LOG_SOURCE
    );
  }
}
