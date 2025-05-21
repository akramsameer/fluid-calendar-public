import { NextResponse } from "next/server";

import { SubscriptionPlan } from "@prisma/client";

import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import stripe from "@/lib/stripe.saas";

const LOG_SOURCE = "LifetimeSubscription";

export async function POST(request: Request) {
  try {
    const { email, name } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Validate required Stripe price IDs
    const earlyBirdPriceId = process.env.LIFETIME_ACCESS_DISCOUNTED_PRICE_ID;
    const regularPriceId = process.env.LIFETIME_ACCESS_PRICE_ID;

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

    const isEarlyBird =
      (await prisma.subscription.count({
        where: {
          plan: SubscriptionPlan.LIFETIME,
        },
      })) < 100;

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price: isEarlyBird ? earlyBirdPriceId : regularPriceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/subscription/lifetime/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/beta`,
      metadata: {
        email,
        name: name || "",
      },
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
