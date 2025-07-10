import { SubscriptionPlan } from "@prisma/client";

/**
 * Calendar provider limits for each subscription plan
 * null = unlimited providers
 */
export const CALENDAR_PROVIDER_LIMITS = {
  [SubscriptionPlan.FREE]: 1,
  [SubscriptionPlan.BASIC_MONTHLY]: 1,
  [SubscriptionPlan.BASIC_YEARLY]: 1,
  [SubscriptionPlan.PRO_MONTHLY]: 2,
  [SubscriptionPlan.PRO_YEARLY]: 2,
  [SubscriptionPlan.ADVANCED_MONTHLY]: null, // unlimited
  [SubscriptionPlan.ADVANCED_YEARLY]: null, // unlimited
  [SubscriptionPlan.LIFETIME]: null, // unlimited
} as const;

/**
 * Comprehensive plan configuration including limits and metadata
 */
export const PLAN_CONFIG = {
  [SubscriptionPlan.FREE]: {
    name: "Free",
    isRecurring: false,
    calendarProviderLimit: CALENDAR_PROVIDER_LIMITS[SubscriptionPlan.FREE],
    calendarLimit: CALENDAR_PROVIDER_LIMITS[SubscriptionPlan.FREE], // Legacy field
    requiresPayment: false,
    features: ["1 Calendar Provider", "Basic Calendar Sync", "Task Management"],
  },
  [SubscriptionPlan.BASIC_MONTHLY]: {
    name: "Basic Monthly",
    isRecurring: true,
    calendarProviderLimit:
      CALENDAR_PROVIDER_LIMITS[SubscriptionPlan.BASIC_MONTHLY],
    calendarLimit: CALENDAR_PROVIDER_LIMITS[SubscriptionPlan.BASIC_MONTHLY],
    requiresPayment: true,
    features: [
      "1 Calendar Provider",
      "Basic Calendar Sync",
      "Task Management",
      "Email Support",
    ],
  },
  [SubscriptionPlan.BASIC_YEARLY]: {
    name: "Basic Yearly",
    isRecurring: true,
    calendarProviderLimit:
      CALENDAR_PROVIDER_LIMITS[SubscriptionPlan.BASIC_YEARLY],
    calendarLimit: CALENDAR_PROVIDER_LIMITS[SubscriptionPlan.BASIC_YEARLY],
    requiresPayment: true,
    features: [
      "1 Calendar Provider",
      "Basic Calendar Sync",
      "Task Management",
      "Email Support",
    ],
  },
  [SubscriptionPlan.PRO_MONTHLY]: {
    name: "Pro Monthly",
    isRecurring: true,
    calendarProviderLimit:
      CALENDAR_PROVIDER_LIMITS[SubscriptionPlan.PRO_MONTHLY],
    calendarLimit: CALENDAR_PROVIDER_LIMITS[SubscriptionPlan.PRO_MONTHLY],
    requiresPayment: true,
    features: [
      "2 Calendar Providers",
      "Advanced Scheduling",
      "Priority Support",
      "Calendar Analytics",
    ],
  },
  [SubscriptionPlan.PRO_YEARLY]: {
    name: "Pro Yearly",
    isRecurring: true,
    calendarProviderLimit:
      CALENDAR_PROVIDER_LIMITS[SubscriptionPlan.PRO_YEARLY],
    calendarLimit: CALENDAR_PROVIDER_LIMITS[SubscriptionPlan.PRO_YEARLY],
    requiresPayment: true,
    features: [
      "2 Calendar Providers",
      "Advanced Scheduling",
      "Priority Support",
      "Calendar Analytics",
    ],
  },
  [SubscriptionPlan.ADVANCED_MONTHLY]: {
    name: "Advanced Monthly",
    isRecurring: true,
    calendarProviderLimit:
      CALENDAR_PROVIDER_LIMITS[SubscriptionPlan.ADVANCED_MONTHLY],
    calendarLimit: CALENDAR_PROVIDER_LIMITS[SubscriptionPlan.ADVANCED_MONTHLY],
    requiresPayment: true,
    features: [
      "Unlimited Calendar Providers",
      "Team Collaboration",
      "Advanced Analytics",
      "Custom Integrations",
      "24/7 Support",
    ],
  },
  [SubscriptionPlan.ADVANCED_YEARLY]: {
    name: "Advanced Yearly",
    isRecurring: true,
    calendarProviderLimit:
      CALENDAR_PROVIDER_LIMITS[SubscriptionPlan.ADVANCED_YEARLY],
    calendarLimit: CALENDAR_PROVIDER_LIMITS[SubscriptionPlan.ADVANCED_YEARLY],
    requiresPayment: true,
    features: [
      "Unlimited Calendar Providers",
      "Team Collaboration",
      "Advanced Analytics",
      "Custom Integrations",
      "24/7 Support",
    ],
  },
  [SubscriptionPlan.LIFETIME]: {
    name: "Lifetime Access",
    isRecurring: false,
    calendarProviderLimit: CALENDAR_PROVIDER_LIMITS[SubscriptionPlan.LIFETIME],
    calendarLimit: CALENDAR_PROVIDER_LIMITS[SubscriptionPlan.LIFETIME],
    requiresPayment: true,
    features: [
      "Unlimited Calendar Providers",
      "All Advanced Features",
      "Lifetime Updates",
      "Priority Support",
      "No Monthly Fees",
    ],
  },
} as const;

/**
 * Helper function to get calendar provider limit for a plan
 */
export function getCalendarProviderLimit(
  plan: SubscriptionPlan
): number | null {
  return CALENDAR_PROVIDER_LIMITS[plan];
}

/**
 * Helper function to check if a plan has unlimited calendar providers
 */
export function hasUnlimitedCalendarProviders(plan: SubscriptionPlan): boolean {
  return CALENDAR_PROVIDER_LIMITS[plan] === null;
}
