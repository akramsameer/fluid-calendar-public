// Legacy constants - DEPRECATED: Use EARLY_BIRD_CONFIG from price-config.ts instead
// These are kept for backward compatibility with old code
export const LIFETIME_ACCESS_PRICE = 40000; // $400 in cents
export const LIFETIME_ACCESS_DISCOUNTED_PRICE = 20000; // $200 in cents
// Corrected threshold to match centralized config
export const MAX_DISCOUNTED_PURCHASES = 100;

export const SUBSCRIPTION_PLANS = {
  FREE: "FREE",
  LIFETIME: "LIFETIME",
} as const;

export const SUBSCRIPTION_STATUS = {
  ACTIVE: "ACTIVE",
  INCOMPLETE: "INCOMPLETE",
  INCOMPLETE_EXPIRED: "INCOMPLETE_EXPIRED",
  TRIALING: "TRIALING",
} as const;

export const STRIPE_METADATA_KEYS = {
  PURCHASE_TYPE: "purchaseType",
  USER_ID: "userId",
  SUBSCRIPTION_PLAN: "subscriptionPlan",
} as const;

export const PURCHASE_TYPES = {
  LIFETIME_ACCESS: "lifetime_access",
} as const;

export const SUBSCRIPTION_FEATURES = {
  [SUBSCRIPTION_PLANS.LIFETIME]: [
    "Unlimited calendars",
    "Advanced task management",
    "Priority support",
    "Early access to new features",
    "Custom integrations",
    "API access",
    "Team collaboration features",
    "No monthly fees - ever!",
  ],
} as const;
