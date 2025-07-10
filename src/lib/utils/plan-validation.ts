import { SubscriptionPlan } from "@prisma/client";

// Plan limits for calendar providers
const PLAN_LIMITS = {
  [SubscriptionPlan.FREE]: 0, // Free plan has no calendar providers
  [SubscriptionPlan.BASIC_MONTHLY]: 1,
  [SubscriptionPlan.BASIC_YEARLY]: 1,
  [SubscriptionPlan.PRO_MONTHLY]: 2,
  [SubscriptionPlan.PRO_YEARLY]: 2,
  [SubscriptionPlan.ADVANCED_MONTHLY]: null, // unlimited
  [SubscriptionPlan.ADVANCED_YEARLY]: null, // unlimited
  [SubscriptionPlan.LIFETIME]: null, // unlimited
} as const;

interface ValidationResult {
  isValid: boolean;
  message?: string;
  suggestedAction?: string;
}

export function validatePlanDowngrade(
  targetPlan: SubscriptionPlan,
  currentCalendarProviderCount: number,
  isTrialing: boolean = false
): ValidationResult {
  // Only validate for trialing users trying to downgrade
  if (!isTrialing) {
    return { isValid: true };
  }

  const planLimit = PLAN_LIMITS[targetPlan];

  // If plan has unlimited providers, it's always valid
  if (planLimit === null) {
    return { isValid: true };
  }

  // Check if current usage exceeds the target plan's limit
  if (currentCalendarProviderCount > planLimit) {
    const planName = getPlanDisplayName(targetPlan);
    const providerWord = planLimit === 1 ? "provider" : "providers";

    return {
      isValid: false,
      message: `You cannot upgrade to ${planName} as you have ${currentCalendarProviderCount} calendar providers, but ${planName} only supports ${planLimit} calendar ${providerWord}.`,
      suggestedAction: `Please remove ${currentCalendarProviderCount - planLimit} calendar ${currentCalendarProviderCount - planLimit === 1 ? "provider" : "providers"} or choose a higher plan.`,
    };
  }

  return { isValid: true };
}

function getPlanDisplayName(plan: SubscriptionPlan): string {
  switch (plan) {
    case SubscriptionPlan.BASIC_MONTHLY:
    case SubscriptionPlan.BASIC_YEARLY:
      return "Basic";
    case SubscriptionPlan.PRO_MONTHLY:
    case SubscriptionPlan.PRO_YEARLY:
      return "Pro";
    case SubscriptionPlan.ADVANCED_MONTHLY:
    case SubscriptionPlan.ADVANCED_YEARLY:
      return "Advanced";
    case SubscriptionPlan.LIFETIME:
      return "Lifetime";
    default:
      return "Selected Plan";
  }
}

export function getCalendarProviderLimit(
  plan: SubscriptionPlan
): number | null {
  return PLAN_LIMITS[plan];
}
