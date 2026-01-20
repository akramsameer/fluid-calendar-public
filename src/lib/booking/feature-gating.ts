import { SubscriptionPlan, SubscriptionStatus } from "@prisma/client";

import { isSaasEnabled } from "@/lib/config";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { BookingFeatureAccess } from "@/types/booking";

const LOG_SOURCE = "BookingFeatureGating";

// Plan limits for booking links
const BOOKING_LINK_LIMITS: Record<SubscriptionPlan, number | null> = {
  [SubscriptionPlan.FREE]: 1,
  [SubscriptionPlan.BASIC_MONTHLY]: 3,
  [SubscriptionPlan.BASIC_YEARLY]: 3,
  [SubscriptionPlan.PRO_MONTHLY]: null, // unlimited
  [SubscriptionPlan.PRO_YEARLY]: null,
  [SubscriptionPlan.ADVANCED_MONTHLY]: null,
  [SubscriptionPlan.ADVANCED_YEARLY]: null,
  [SubscriptionPlan.LIFETIME]: null,
};

// Premium features available per plan
const PREMIUM_FEATURES: Record<SubscriptionPlan, {
  videoConferencing: boolean;
  bufferTime: boolean;
  customAvailability: boolean;
}> = {
  [SubscriptionPlan.FREE]: {
    videoConferencing: false,
    bufferTime: false,
    customAvailability: false,
  },
  [SubscriptionPlan.BASIC_MONTHLY]: {
    videoConferencing: true,
    bufferTime: false,
    customAvailability: false,
  },
  [SubscriptionPlan.BASIC_YEARLY]: {
    videoConferencing: true,
    bufferTime: false,
    customAvailability: false,
  },
  [SubscriptionPlan.PRO_MONTHLY]: {
    videoConferencing: true,
    bufferTime: true,
    customAvailability: true,
  },
  [SubscriptionPlan.PRO_YEARLY]: {
    videoConferencing: true,
    bufferTime: true,
    customAvailability: true,
  },
  [SubscriptionPlan.ADVANCED_MONTHLY]: {
    videoConferencing: true,
    bufferTime: true,
    customAvailability: true,
  },
  [SubscriptionPlan.ADVANCED_YEARLY]: {
    videoConferencing: true,
    bufferTime: true,
    customAvailability: true,
  },
  [SubscriptionPlan.LIFETIME]: {
    videoConferencing: true,
    bufferTime: true,
    customAvailability: true,
  },
};

/**
 * Get the user's subscription plan
 */
async function getUserPlan(userId: string): Promise<SubscriptionPlan> {
  // In open-source mode, all features are available
  if (!isSaasEnabled) {
    return SubscriptionPlan.LIFETIME;
  }

  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: { plan: true, status: true },
  });

  // If no subscription or not active, treat as FREE
  if (!subscription) {
    return SubscriptionPlan.FREE;
  }

  // Check if subscription is active
  const activeStatuses: SubscriptionStatus[] = [
    SubscriptionStatus.ACTIVE,
    SubscriptionStatus.TRIALING,
  ];

  if (!activeStatuses.includes(subscription.status)) {
    return SubscriptionPlan.FREE;
  }

  return subscription.plan;
}

/**
 * Check if user can create a new booking link
 */
export async function canCreateBookingLink(
  userId: string
): Promise<{ allowed: boolean; reason?: string }> {
  try {
    // In open-source mode, allow 1 booking link
    if (!isSaasEnabled) {
      const count = await prisma.bookingLink.count({ where: { userId } });
      if (count >= 1) {
        return {
          allowed: false,
          reason: "Open-source version is limited to 1 booking link",
        };
      }
      return { allowed: true };
    }

    const plan = await getUserPlan(userId);
    const limit = BOOKING_LINK_LIMITS[plan];

    // Unlimited
    if (limit === null) {
      return { allowed: true };
    }

    // Check current count
    const count = await prisma.bookingLink.count({ where: { userId } });

    if (count >= limit) {
      return {
        allowed: false,
        reason: `Your plan allows up to ${limit} booking link${limit > 1 ? "s" : ""}. Upgrade to create more.`,
      };
    }

    return { allowed: true };
  } catch (error) {
    logger.error(
      "Failed to check booking link creation permission",
      { error: error instanceof Error ? error.message : String(error), userId },
      LOG_SOURCE
    );
    // Fail open in case of error (allow the action)
    return { allowed: true };
  }
}

/**
 * Check if user can use video conferencing
 */
export async function canUseVideoConferencing(userId: string): Promise<boolean> {
  // In open-source mode, video conferencing is not available
  if (!isSaasEnabled) {
    return false;
  }

  const plan = await getUserPlan(userId);
  return PREMIUM_FEATURES[plan].videoConferencing;
}

/**
 * Check if user can use buffer time between meetings
 */
export async function canUseBufferTime(userId: string): Promise<boolean> {
  // In open-source mode, buffer time is not available
  if (!isSaasEnabled) {
    return false;
  }

  const plan = await getUserPlan(userId);
  return PREMIUM_FEATURES[plan].bufferTime;
}

/**
 * Check if user can use custom availability rules
 */
export async function canUseCustomAvailability(userId: string): Promise<boolean> {
  // In open-source mode, custom availability is not available
  if (!isSaasEnabled) {
    return false;
  }

  const plan = await getUserPlan(userId);
  return PREMIUM_FEATURES[plan].customAvailability;
}

/**
 * Get all booking feature access for a user
 */
export async function getBookingFeatureAccess(userId: string): Promise<BookingFeatureAccess> {
  // In open-source mode, limited features
  if (!isSaasEnabled) {
    return {
      canCreateBookingLink: true, // Can create up to 1
      canUseVideoConferencing: false,
      canUseBufferTime: false,
      canUseCustomAvailability: false,
      maxBookingLinks: 1,
    };
  }

  const plan = await getUserPlan(userId);
  const features = PREMIUM_FEATURES[plan];
  const limit = BOOKING_LINK_LIMITS[plan];

  // Check if user can still create booking links
  const count = await prisma.bookingLink.count({ where: { userId } });
  const canCreate = limit === null || count < limit;

  return {
    canCreateBookingLink: canCreate,
    canUseVideoConferencing: features.videoConferencing,
    canUseBufferTime: features.bufferTime,
    canUseCustomAvailability: features.customAvailability,
    maxBookingLinks: limit,
  };
}
