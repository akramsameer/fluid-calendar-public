import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import {
  SUBSCRIPTION_PLANS,
  SUBSCRIPTION_STATUS,
} from "@saas/lib/stripe/constants";

const LOG_SOURCE = "SubscriptionStatus";

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    const email = token?.email;
    const userId = token?.sub;

    if (!email || !userId) {
      logger.info(
        "Authentication required - no valid JWT token",
        {},
        LOG_SOURCE
      );
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Find user with subscription with timeout
    const user = await Promise.race([
      prisma.user.findUnique({
        where: {
          email: email,
        },
        include: {
          subscription: true,
        },
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Database query timeout")), 5000)
      ),
    ]);

    if (!user) {
      logger.warn("User not found", { email, userId }, LOG_SOURCE);
      return NextResponse.json({
        hasActiveSubscription: false,
        plan: null,
        status: null,
      });
    }

    // Check subscription status
    const subscription = user.subscription;

    if (!subscription) {
      logger.info(
        "No subscription found for user",
        { userId, email },
        LOG_SOURCE
      );
      return NextResponse.json({
        hasActiveSubscription: false,
        plan: null,
        status: null,
      });
    }

    // Check if subscription is active
    const hasActiveSubscription =
      subscription.status === SUBSCRIPTION_STATUS.ACTIVE ||
      subscription.status === SUBSCRIPTION_STATUS.TRIALING;

    // For lifetime subscriptions, they're always active if status is ACTIVE
    // For recurring subscriptions, check if they're not expired
    let isValid = hasActiveSubscription;

    if (
      hasActiveSubscription &&
      subscription.plan !== SUBSCRIPTION_PLANS.LIFETIME
    ) {
      // For recurring subscriptions, check if current period is valid
      if (subscription.currentPeriodEnd) {
        isValid = new Date() < subscription.currentPeriodEnd;
      }
    }

    logger.info(
      "Subscription status checked",
      {
        userId,
        email,
        plan: subscription.plan,
        status: subscription.status,
        hasActiveSubscription: isValid,
        currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() || null,
      },
      LOG_SOURCE
    );

    return NextResponse.json({
      hasActiveSubscription: isValid,
      plan: subscription.plan,
      status: subscription.status,
      currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() || null,
    });
  } catch (error) {
    logger.error(
      "Error checking subscription status",
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      LOG_SOURCE
    );

    // Return 500 server error instead of subscription data
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
