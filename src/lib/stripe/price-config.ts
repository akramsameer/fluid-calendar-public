import { SubscriptionPlan } from "@prisma/client";

/**
 * Centralized Stripe Price ID mapping
 * Single source of truth for all price ID mappings
 */
export const STRIPE_PRICE_MAP: Record<SubscriptionPlan, string | null> = {
  [SubscriptionPlan.FREE]: null,
  [SubscriptionPlan.BASIC_MONTHLY]:
    process.env.STRIPE_PRICE_BASIC_MONTHLY || null,
  [SubscriptionPlan.BASIC_YEARLY]:
    process.env.STRIPE_PRICE_BASIC_YEARLY || null,
  [SubscriptionPlan.PRO_MONTHLY]: process.env.STRIPE_PRICE_PRO_MONTHLY || null,
  [SubscriptionPlan.PRO_YEARLY]: process.env.STRIPE_PRICE_PRO_YEARLY || null,
  [SubscriptionPlan.ADVANCED_MONTHLY]:
    process.env.STRIPE_PRICE_ADVANCED_MONTHLY || null,
  [SubscriptionPlan.ADVANCED_YEARLY]:
    process.env.STRIPE_PRICE_ADVANCED_YEARLY || null,
  [SubscriptionPlan.LIFETIME]: process.env.STRIPE_PRICE_LIFETIME || null,
};

/**
 * Centralized Early Bird Configuration
 * Single source of truth for all early bird logic
 */
export const EARLY_BIRD_CONFIG = {
  // Threshold for early bird eligibility
  threshold: 100,

  // Pricing (in dollars for display, cents for Stripe)
  pricing: {
    earlyBird: {
      dollars: 200,
      cents: 20000,
    },
    regular: {
      dollars: 400,
      cents: 40000,
    },
  },

  // Helper functions
  isEligible: (lifetimeCount: number) => lifetimeCount < 100,
  getRemainingSlots: (lifetimeCount: number) =>
    Math.max(0, 100 - lifetimeCount),
  getCurrentPrice: (isEarlyBird: boolean) => (isEarlyBird ? 200 : 400),
  getCurrentPriceCents: (isEarlyBird: boolean) => (isEarlyBird ? 20000 : 40000),
} as const;

/**
 * Legacy lifetime price IDs for backward compatibility
 * Used by the beta lifetime flow
 */
export const LEGACY_LIFETIME_PRICE_IDS = {
  earlyBird: process.env.LIFETIME_ACCESS_DISCOUNTED_PRICE_ID || null,
  regular: process.env.LIFETIME_ACCESS_PRICE_ID || null,
} as const;

/**
 * Create reverse price mapping (Price ID -> Plan)
 * Dynamically generated from the forward mapping
 */
function createReversePriceMap(): Record<string, SubscriptionPlan> {
  const reverseMap: Record<string, SubscriptionPlan> = {};

  Object.entries(STRIPE_PRICE_MAP).forEach(([plan, priceId]) => {
    if (priceId && priceId.trim()) {
      reverseMap[priceId] = plan as SubscriptionPlan;
    }
  });

  // Add legacy lifetime price IDs for reverse lookup
  if (LEGACY_LIFETIME_PRICE_IDS.earlyBird) {
    reverseMap[LEGACY_LIFETIME_PRICE_IDS.earlyBird] = SubscriptionPlan.LIFETIME;
  }
  if (LEGACY_LIFETIME_PRICE_IDS.regular) {
    reverseMap[LEGACY_LIFETIME_PRICE_IDS.regular] = SubscriptionPlan.LIFETIME;
  }

  return reverseMap;
}

/**
 * Reverse mapping for webhook handlers
 * Maps Stripe Price ID back to SubscriptionPlan enum
 */
export const REVERSE_PRICE_MAP = createReversePriceMap();

/**
 * Get subscription plan from Stripe price ID
 */
export function getPlanFromPriceId(priceId: string): SubscriptionPlan | null {
  return REVERSE_PRICE_MAP[priceId] || null;
}

/**
 * Get Stripe price ID from subscription plan
 */
export function getPriceIdFromPlan(plan: SubscriptionPlan): string | null {
  return STRIPE_PRICE_MAP[plan] || null;
}

/**
 * Check if a price ID is a legacy lifetime price
 */
export function isLegacyLifetimePriceId(priceId: string): boolean {
  return (
    priceId === LEGACY_LIFETIME_PRICE_IDS.earlyBird ||
    priceId === LEGACY_LIFETIME_PRICE_IDS.regular
  );
}

/**
 * Get the appropriate lifetime price ID based on early bird eligibility
 */
export function getLifetimePriceId(isEarlyBird: boolean): string | null {
  if (isEarlyBird && LEGACY_LIFETIME_PRICE_IDS.earlyBird) {
    return LEGACY_LIFETIME_PRICE_IDS.earlyBird;
  }

  return (
    LEGACY_LIFETIME_PRICE_IDS.regular ||
    STRIPE_PRICE_MAP[SubscriptionPlan.LIFETIME]
  );
}
