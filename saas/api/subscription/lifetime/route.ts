import { NextResponse } from "next/server";

import { SubscriptionPlan } from "@prisma/client";

import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { STRIPE_METADATA_KEYS } from "@/lib/stripe/constants";
import {
  EARLY_BIRD_CONFIG,
  LEGACY_LIFETIME_PRICE_IDS,
  getLifetimePriceId,
} from "@/lib/stripe/price-config";

const LOG_SOURCE = "LifetimeSubscription";

export async function POST(request: Request) {
  try {
    const { email, name } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Validate required Stripe price IDs using centralized configuration
    const earlyBirdPriceId = LEGACY_LIFETIME_PRICE_IDS.earlyBird;
    const regularPriceId = LEGACY_LIFETIME_PRICE_IDS.regular;

    if (!earlyBirdPriceId || !regularPriceId) {
      logger.error(
        "Missing Stripe price IDs in environment variables",
        {
          earlyBirdPriceId: !!earlyBirdPriceId,
          regularPriceId: !!regularPriceId,
        },
        LOG_SOURCE
      );
      return NextResponse.json(
        { error: "Subscription service configuration error" },
        { status: 500 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
      include: { subscription: true },
    });

    if (existingUser?.subscription?.plan === SubscriptionPlan.LIFETIME) {
      return NextResponse.json(
        { error: "User already has lifetime access" },
        { status: 400 }
      );
    }

    // Create or update Stripe customer
    let stripeCustomerId = existingUser?.subscription?.stripeCustomerId;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email,
        name: name || undefined,
      });
      stripeCustomerId = customer.id;
    }

    const lifetimeCount = await prisma.subscription.count({
      where: {
        plan: SubscriptionPlan.LIFETIME,
      },
    });

    const isEarlyBird = EARLY_BIRD_CONFIG.isEligible(lifetimeCount);

    // Get the lifetime price ID and validate it
    const lifetimePriceId = getLifetimePriceId(isEarlyBird);

    if (!lifetimePriceId) {
      logger.error(
        "No valid lifetime price ID found",
        {
          isEarlyBird,
          earlyBirdPriceId: LEGACY_LIFETIME_PRICE_IDS.earlyBird,
          regularPriceId: LEGACY_LIFETIME_PRICE_IDS.regular,
        },
        LOG_SOURCE
      );
      return NextResponse.json(
        { error: "Subscription service configuration error" },
        { status: 500 }
      );
    }

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price: lifetimePriceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/beta`,
      metadata: {
        email,
        name: name || "",
        [STRIPE_METADATA_KEYS.SUBSCRIPTION_PLAN]: SubscriptionPlan.LIFETIME,
      },
      allow_promotion_codes: true, // Enable manual promotion code entry
      payment_method_collection: "if_required", // Skip payment method collection for $0 total
    });

    logger.info(
      "Created Stripe checkout session for lifetime subscription",
      {
        email,
        sessionId: session.id,
      },
      LOG_SOURCE
    );

    return NextResponse.json({ url: session.url });
  } catch (error) {
    logger.error(
      "Failed to create lifetime subscription checkout",
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
