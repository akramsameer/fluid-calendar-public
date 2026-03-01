import { NextRequest, NextResponse } from "next/server";

import { SubscriptionPlan } from "@prisma/client";
import Stripe from "stripe";
import { z } from "zod";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { stripe } from "@saas/lib/stripe";
import { STRIPE_METADATA_KEYS } from "@saas/lib/stripe/constants";
import {
  EARLY_BIRD_CONFIG,
  LEGACY_LIFETIME_PRICE_IDS,
  STRIPE_PRICE_MAP,
  getLifetimePriceId,
} from "@saas/lib/stripe/price-config";
import { PLAN_CONFIG } from "@saas/lib/subscription/plan-config";
import { isValidPlanUpgrade } from "@saas/lib/utils/plan-comparison";

const LOG_SOURCE = "UniversalCheckout";

// Input validation schema
const checkoutRequestSchema = z.object({
  plan: z.nativeEnum(SubscriptionPlan),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
  trialDays: z.number().min(0).max(30).optional(),
});

// Plan configuration imported from shared constants

// Plan upgrade validation logic is imported from @/lib/utils/plan-comparison

export async function POST(request: NextRequest) {
  try {
    // Authenticate the request
    const authResult = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in authResult) {
      return authResult.response;
    }
    const { userId } = authResult;

    // Parse and validate request body
    const body = await request.json();
    const validationResult = checkoutRequestSchema.safeParse(body);

    if (!validationResult.success) {
      logger.error(
        "Invalid checkout request",
        {
          errors: validationResult.error.errors.map((err) => err.message),
          userId,
        },
        LOG_SOURCE
      );
      return NextResponse.json(
        {
          error: "Invalid request",
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const { plan, successUrl, cancelUrl, trialDays } = validationResult.data;

    // Handle FREE plan (no payment required)
    if (plan === SubscriptionPlan.FREE) {
      return handleFreePlanSubscription(userId);
    }

    // Validate plan configuration
    const planConfig = PLAN_CONFIG[plan];
    const stripePriceId = STRIPE_PRICE_MAP[plan];

    logger.info(
      "Checkout request details",
      {
        userId,
        plan,
        stripePriceId: stripePriceId || "null",
        isRecurring: planConfig.isRecurring,
        calendarLimit: planConfig.calendarLimit,
        requiresPayment: planConfig.requiresPayment,
        isLifetime: plan === SubscriptionPlan.LIFETIME,
      },
      LOG_SOURCE
    );

    if (!stripePriceId) {
      logger.error(
        "Missing Stripe price ID for plan",
        {
          plan,
          userId,
          allPriceIds: JSON.stringify(STRIPE_PRICE_MAP),
        },
        LOG_SOURCE
      );
      return NextResponse.json(
        { error: "Plan configuration error" },
        { status: 500 }
      );
    }

    // Check for existing active subscription and validate upgrade/downgrade
    const existingSubscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    if (existingSubscription?.status === "ACTIVE") {
      const currentPlan = existingSubscription.plan;
      const requestedPlan = plan;

      // Allow the same plan (for reactivation scenarios)
      if (currentPlan === requestedPlan) {
        logger.info(
          "User requesting same plan - allowing for reactivation",
          {
            userId,
            plan: currentPlan,
          },
          LOG_SOURCE
        );
      }
      // Check if this is a valid upgrade
      else if (!isValidPlanUpgrade(currentPlan, requestedPlan)) {
        logger.warn(
          "Invalid plan change attempt",
          {
            userId,
            currentPlan,
            requestedPlan,
          },
          LOG_SOURCE
        );
        return NextResponse.json(
          {
            error: `Cannot change from ${currentPlan.replace("_", " ")} to ${requestedPlan.replace("_", " ")}. Only upgrades are allowed.`,
            currentPlan,
            requestedPlan,
          },
          { status: 400 }
        );
      } else {
        logger.info(
          "Valid plan upgrade requested",
          {
            userId,
            currentPlan,
            requestedPlan,
          },
          LOG_SOURCE
        );
      }
    }

    // Get or create Stripe customer
    const stripeCustomerId = await getOrCreateStripeCustomer(userId);

    // Create checkout session based on plan type
    if (plan === SubscriptionPlan.LIFETIME) {
      return createLifetimeCheckoutSession(
        userId,
        stripeCustomerId,
        stripePriceId,
        successUrl,
        cancelUrl
      );
    } else {
      return createRecurringCheckoutSession(
        userId,
        stripeCustomerId,
        stripePriceId,
        plan,
        successUrl,
        cancelUrl,
        trialDays
      );
    }
  } catch (error) {
    logger.error(
      "Failed to create checkout session",
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      LOG_SOURCE
    );

    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}

/**
 * Handle FREE plan subscription (no payment required)
 */
async function handleFreePlanSubscription(userId: string) {
  try {
    await prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        plan: SubscriptionPlan.FREE,
        status: "ACTIVE",
        calendarProviderLimit: PLAN_CONFIG[SubscriptionPlan.FREE].calendarLimit,
      },
      update: {
        plan: SubscriptionPlan.FREE,
        status: "ACTIVE",
        calendarProviderLimit: PLAN_CONFIG[SubscriptionPlan.FREE].calendarLimit,
      },
    });

    logger.info("Successfully activated free plan", { userId }, LOG_SOURCE);

    return NextResponse.json({
      success: true,
      message: "Free plan activated",
      redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/calendar`,
    });
  } catch (error) {
    logger.error(
      "Failed to activate free plan",
      {
        error: error instanceof Error ? error.message : "Unknown error",
        userId,
      },
      LOG_SOURCE
    );
    throw error;
  }
}

/**
 * Create Stripe checkout session for lifetime plans (one-time payment)
 * Includes early bird discount logic from existing implementation
 */
async function createLifetimeCheckoutSession(
  userId: string,
  stripeCustomerId: string,
  stripePriceId: string,
  successUrl?: string,
  cancelUrl?: string
) {
  const defaultSuccessUrl = `${process.env.NEXT_PUBLIC_APP_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`;
  const defaultCancelUrl = `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`;

  // Early bird discount logic using centralized configuration
  const lifetimeCount = await prisma.subscription.count({
    where: {
      plan: SubscriptionPlan.LIFETIME,
      status: "ACTIVE",
    },
  });

  const isEarlyBird = EARLY_BIRD_CONFIG.isEligible(lifetimeCount);

  // Get the appropriate price ID using centralized function
  const finalPriceId = getLifetimePriceId(isEarlyBird) || stripePriceId;

  // Validate the final price ID
  if (!finalPriceId) {
    logger.error(
      "Invalid or missing Stripe price ID for lifetime plan",
      {
        userId,
        isEarlyBird,
        earlyBirdPriceId: LEGACY_LIFETIME_PRICE_IDS.earlyBird || "null",
        regularPriceId: LEGACY_LIFETIME_PRICE_IDS.regular || "null",
        stripePriceId: stripePriceId || "null",
        finalPriceId: finalPriceId || "null",
      },
      LOG_SOURCE
    );
    throw new Error("Lifetime plan configuration error");
  }

  try {
    // Get user information to include in metadata if available
    let userEmail = "";
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true },
      });

      if (user) {
        userEmail = user.email || "";
        logger.info(
          "Retrieved user info for checkout metadata",
          {
            userId,
            email: user.email,
          },
          LOG_SOURCE
        );
      }
    } catch (userError) {
      logger.warn(
        "Failed to retrieve user info for metadata",
        {
          userId,
          error:
            userError instanceof Error ? userError.message : "Unknown error",
        },
        LOG_SOURCE
      );
    }

    const sessionMetadata = {
      userId,
      plan: SubscriptionPlan.LIFETIME,
      subscriptionType: "lifetime",
      [STRIPE_METADATA_KEYS.SUBSCRIPTION_PLAN]: SubscriptionPlan.LIFETIME,
      isEarlyBird: isEarlyBird.toString(),
      ...(userEmail ? { email: userEmail } : {}),
    };

    logger.info(
      "Creating lifetime checkout session with metadata",
      {
        metadataKeys: Object.keys(sessionMetadata),
        userId,
      },
      LOG_SOURCE
    );

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ["card"],
      mode: "payment", // One-time payment for lifetime
      line_items: [
        {
          price: finalPriceId,
          quantity: 1,
        },
      ],
      success_url: successUrl || defaultSuccessUrl,
      cancel_url: cancelUrl || defaultCancelUrl,
      metadata: sessionMetadata,
      allow_promotion_codes: true, // Enable manual promotion code entry
    });

    logger.info(
      "Created lifetime checkout session",
      {
        userId,
        sessionId: session.id,
        stripePriceId: finalPriceId,
        isEarlyBird,
        lifetimeCount,
      },
      LOG_SOURCE
    );

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
      plan: SubscriptionPlan.LIFETIME,
      isEarlyBird,
    });
  } catch (stripeError) {
    logger.error(
      "Stripe checkout session creation failed",
      {
        error:
          stripeError instanceof Error
            ? stripeError.message
            : "Unknown Stripe error",
        userId,
        finalPriceId,
        isEarlyBird,
      },
      LOG_SOURCE
    );
    throw stripeError;
  }
}

/**
 * Create Stripe checkout session for recurring plans (monthly/yearly)
 */
async function createRecurringCheckoutSession(
  userId: string,
  stripeCustomerId: string,
  stripePriceId: string,
  plan: SubscriptionPlan,
  successUrl?: string,
  cancelUrl?: string,
  trialDays?: number
) {
  const defaultSuccessUrl = `${process.env.NEXT_PUBLIC_APP_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`;
  const defaultCancelUrl = `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`;

  // Validate the price ID
  if (!stripePriceId) {
    logger.error(
      "Missing Stripe price ID for recurring plan",
      { userId, plan },
      LOG_SOURCE
    );
    throw new Error("Plan configuration error");
  }

  // Get user information to include in metadata if available
  let userEmail = "";
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (user) {
      userEmail = user.email || "";
      logger.info(
        "Retrieved user email for recurring checkout metadata",
        {
          userId,
          email: user.email,
        },
        LOG_SOURCE
      );
    }
  } catch (userError) {
    logger.warn(
      "Failed to retrieve user info for recurring metadata",
      {
        userId,
        error: userError instanceof Error ? userError.message : "Unknown error",
      },
      LOG_SOURCE
    );
  }

  const sessionMetadata = {
    userId,
    plan,
    [STRIPE_METADATA_KEYS.SUBSCRIPTION_PLAN]: plan,
    subscriptionType: "recurring",
    ...(userEmail ? { email: userEmail } : {}),
  };

  logger.info(
    "Creating recurring checkout session with metadata",
    {
      metadataKeys: Object.keys(sessionMetadata),
      userId,
      plan,
    },
    LOG_SOURCE
  );

  const sessionConfig: Stripe.Checkout.SessionCreateParams = {
    customer: stripeCustomerId,
    payment_method_types: ["card"],
    mode: "subscription", // Recurring subscription
    line_items: [
      {
        price: stripePriceId,
        quantity: 1,
      },
    ],
    success_url: successUrl || defaultSuccessUrl,
    cancel_url: cancelUrl || defaultCancelUrl,
    metadata: sessionMetadata,
  };

  // Add trial period if specified
  if (trialDays && trialDays > 0) {
    sessionConfig.subscription_data = {
      trial_period_days: trialDays,
    };
  }

  // Enable manual promotion code entry
  sessionConfig.allow_promotion_codes = true;

  // Skip payment method collection for $0 total (e.g., 100% discount coupons)
  sessionConfig.payment_method_collection = "if_required";

  try {
    const session = await stripe.checkout.sessions.create(sessionConfig);

    logger.info(
      "Created recurring checkout session",
      {
        userId,
        sessionId: session.id,
        stripePriceId,
        plan,
        trialDays: trialDays || 0,
      },
      LOG_SOURCE
    );

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
      plan,
      trialDays: trialDays || 0,
    });
  } catch (stripeError) {
    logger.error(
      "Stripe recurring checkout session creation failed",
      {
        error:
          stripeError instanceof Error
            ? stripeError.message
            : "Unknown Stripe error",
        userId,
        stripePriceId,
        plan,
        trialDays: trialDays || 0,
      },
      LOG_SOURCE
    );
    throw stripeError;
  }
}

/**
 * Get existing Stripe customer or create a new one
 */
async function getOrCreateStripeCustomer(userId: string): Promise<string> {
  // Check if user already has a Stripe customer ID
  const existingSubscription = await prisma.subscription.findUnique({
    where: { userId },
    select: { stripeCustomerId: true },
  });

  if (existingSubscription?.stripeCustomerId) {
    return existingSubscription.stripeCustomerId;
  }

  // Get user details for customer creation
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });

  if (!user?.email) {
    throw new Error("User email not found");
  }

  // Create new Stripe customer
  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name || undefined,
    metadata: {
      userId,
    },
  });

  logger.info(
    "Created new Stripe customer",
    {
      userId,
      stripeCustomerId: customer.id,
      email: user.email,
    },
    LOG_SOURCE
  );

  return customer.id;
}
