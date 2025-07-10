import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import {
  SUBSCRIPTION_PLANS,
  SUBSCRIPTION_STATUS,
} from "@/lib/stripe/constants";
import { LEGACY_LIFETIME_PRICE_IDS } from "@/lib/stripe/price-config";

const LOG_SOURCE = "LifetimeVerify";

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    const userId = token?.sub;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sessionId } = await request.json();
    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    // Retrieve the Stripe session
    const stripeSession = await stripe.checkout.sessions.retrieve(sessionId);

    // Verify the session is completed and belongs to the current user
    if (stripeSession.status !== "complete") {
      return NextResponse.json(
        { error: "Payment not completed" },
        { status: 400 }
      );
    }

    if (stripeSession.metadata?.userId !== userId) {
      return NextResponse.json({ error: "Invalid session" }, { status: 400 });
    }

    // Check if subscription already exists
    const existingSubscription = await prisma.subscription.findUnique({
      where: {
        userId: userId,
        plan: SUBSCRIPTION_PLANS.LIFETIME,
        status: SUBSCRIPTION_STATUS.ACTIVE,
      },
    });

    if (existingSubscription) {
      return NextResponse.json({ message: "Subscription already active" });
    }

    // Check if early bird discount was applied based on the price ID used (centralized config)
    const discountApplied =
      stripeSession.line_items?.data[0]?.price?.id ===
      LEGACY_LIFETIME_PRICE_IDS.earlyBird;

    // Create or update subscription
    await prisma.subscription.upsert({
      where: { userId: userId },
      create: {
        userId: userId,
        plan: SUBSCRIPTION_PLANS.LIFETIME,
        status: SUBSCRIPTION_STATUS.ACTIVE,
        stripeCustomerId: stripeSession.customer as string,
        stripePaymentIntentId: stripeSession.payment_intent as string,
        amount: stripeSession.amount_total,
        discountApplied,
      },
      update: {
        plan: SUBSCRIPTION_PLANS.LIFETIME,
        status: SUBSCRIPTION_STATUS.ACTIVE,
        stripeCustomerId: stripeSession.customer as string,
        stripePaymentIntentId: stripeSession.payment_intent as string,
        amount: stripeSession.amount_total,
        discountApplied,
      },
    });

    logger.info(
      "Successfully verified lifetime subscription",
      {
        userId: userId,
        sessionId,
        discountApplied,
      },
      LOG_SOURCE
    );

    return NextResponse.json({ message: "Subscription activated" });
  } catch (error) {
    logger.error(
      "Failed to verify lifetime subscription",
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      LOG_SOURCE
    );

    return NextResponse.json(
      { error: "Failed to verify subscription" },
      { status: 500 }
    );
  }
}
