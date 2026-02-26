import { SubscriptionPlan } from "@prisma/client";

/**
 * Plan tier hierarchy for comparison
 * Higher number = higher tier
 */
export const PLAN_TIERS: Record<SubscriptionPlan, number> = {
  [SubscriptionPlan.FREE]: 0,
  [SubscriptionPlan.BASIC_MONTHLY]: 1,
  [SubscriptionPlan.BASIC_YEARLY]: 1,
  [SubscriptionPlan.PRO_MONTHLY]: 2,
  [SubscriptionPlan.PRO_YEARLY]: 2,
  [SubscriptionPlan.ADVANCED_MONTHLY]: 3,
  [SubscriptionPlan.ADVANCED_YEARLY]: 3,
  [SubscriptionPlan.LIFETIME]: 4, // Highest tier
};

/**
 * Get the tier level of a subscription plan
 */
export function getPlanTier(plan: SubscriptionPlan): number {
  return PLAN_TIERS[plan];
}

/**
 * Check if a plan change is a valid upgrade
 */
export function isValidPlanUpgrade(
  currentPlan: SubscriptionPlan,
  requestedPlan: SubscriptionPlan
): boolean {
  const currentTier = getPlanTier(currentPlan);
  const requestedTier = getPlanTier(requestedPlan);

  // Allow upgrades (higher tier) and same tier (for plan switches like monthly to yearly)
  return requestedTier >= currentTier;
}

/**
 * Compare two plans and return the relationship
 */
export function comparePlans(
  currentPlan: SubscriptionPlan,
  targetPlan: SubscriptionPlan
): "lower" | "equal" | "higher" {
  const currentTier = getPlanTier(currentPlan);
  const targetTier = getPlanTier(targetPlan);

  if (targetTier < currentTier) return "lower";
  if (targetTier > currentTier) return "higher";
  return "equal";
}

/**
 * Map plan names to SubscriptionPlan enum values
 */
export function getPlanEnum(
  planName: string,
  isAnnual: boolean
): SubscriptionPlan {
  const planMap: Record<
    string,
    { monthly: SubscriptionPlan; yearly: SubscriptionPlan }
  > = {
    BASIC: {
      monthly: SubscriptionPlan.BASIC_MONTHLY,
      yearly: SubscriptionPlan.BASIC_YEARLY,
    },
    PRO: {
      monthly: SubscriptionPlan.PRO_MONTHLY,
      yearly: SubscriptionPlan.PRO_YEARLY,
    },
    ADVANCED: {
      monthly: SubscriptionPlan.ADVANCED_MONTHLY,
      yearly: SubscriptionPlan.ADVANCED_YEARLY,
    },
  };

  return isAnnual ? planMap[planName].yearly : planMap[planName].monthly;
}

/**
 * Get button state for a plan based on current subscription
 */
export function getButtonState(
  currentPlan: SubscriptionPlan | null,
  targetPlan: SubscriptionPlan,
  hasActiveSubscription: boolean,
  isTrialing?: boolean
): {
  text: string;
  disabled: boolean;
  variant?: "default" | "outline" | "secondary";
} {
  // If no active subscription, all buttons are enabled
  if (!hasActiveSubscription || !currentPlan) {
    return {
      text: "Subscribe",
      disabled: false,
    };
  }

  const comparison = comparePlans(currentPlan, targetPlan);

  switch (comparison) {
    case "equal":
      return {
        text: isTrialing ? "Subscribe" : "Current Plan",
        disabled: !isTrialing,
        variant: isTrialing ? "default" : "secondary",
      };
    case "lower":
      // If user is trialing a higher plan, allow subscribing to lower plans
      if (isTrialing) {
        return {
          text: "Subscribe",
          disabled: false,
        };
      }
      // If user has an active (non-trial) subscription, disable lower plans
      return {
        text: "Subscribe",
        disabled: true,
        variant: "outline",
      };
    case "higher":
      return {
        text: "Subscribe",
        disabled: false,
      };
    default:
      return {
        text: "Subscribe",
        disabled: false,
      };
  }
}
