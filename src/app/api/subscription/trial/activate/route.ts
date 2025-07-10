import { NextRequest, NextResponse } from "next/server";

import { SubscriptionPlan, SubscriptionStatus } from "@prisma/client";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { getCalendarProviderLimit } from "@/lib/subscription/plan-config";

const LOG_SOURCE = "TrialActivation";

export async function POST(request: NextRequest) {
  try {
    // Authenticate the request
    const authResult = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in authResult) {
      return authResult.response;
    }
    const { userId } = authResult;

    // Check if user already has an active subscription
    const existingSubscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    if (existingSubscription) {
      // Check if user already has an active or trialing subscription
      if (
        existingSubscription.status === SubscriptionStatus.ACTIVE ||
        existingSubscription.status === SubscriptionStatus.TRIALING
      ) {
        logger.warn(
          "User already has active subscription",
          { userId, currentPlan: existingSubscription.plan },
          LOG_SOURCE
        );
        return NextResponse.json(
          { error: "You already have an active subscription" },
          { status: 400 }
        );
      }

      // Check if user has already used a trial
      if (existingSubscription.trialStart) {
        logger.warn(
          "User has already used trial period",
          { userId },
          LOG_SOURCE
        );
        return NextResponse.json(
          { error: "Trial period has already been used" },
          { status: 400 }
        );
      }
    }

    // Calculate trial period (14 days from now)
    const trialStart = new Date();
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 14);

    // Get calendar provider limit for the trial plan
    const trialPlan = SubscriptionPlan.ADVANCED_MONTHLY;
    const calendarProviderLimit = getCalendarProviderLimit(trialPlan);

    // Create or update subscription with trial
    const subscription = await prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        plan: trialPlan, // Default to monthly for trial
        status: SubscriptionStatus.TRIALING,
        trialStart,
        trialEnd,
        calendarProviderLimit,
        currency: "usd",
      },
      update: {
        plan: trialPlan,
        status: SubscriptionStatus.TRIALING,
        trialStart,
        trialEnd,
        calendarProviderLimit,
        currency: "usd",
      },
    });

    // Create subscription history record
    await prisma.subscriptionHistory.create({
      data: {
        userId,
        subscriptionId: subscription.id,
        fromStatus: existingSubscription?.status || null,
        toStatus: SubscriptionStatus.TRIALING,
        fromPlan: existingSubscription?.plan || null,
        toPlan: SubscriptionPlan.ADVANCED_MONTHLY,
        reason: "trial_activation",
        metadata: {
          trialDays: 14,
          activatedAt: trialStart.toISOString(),
          expiresAt: trialEnd.toISOString(),
        },
      },
    });

    // Create or update subscription usage record
    await prisma.subscriptionUsage.upsert({
      where: { userId },
      create: {
        userId,
        subscriptionId: subscription.id,
        calendarProvidersUsed: 0,
        lastCalculatedAt: new Date(),
      },
      update: {
        subscriptionId: subscription.id,
        lastCalculatedAt: new Date(),
      },
    });

    logger.info(
      "Trial activated successfully",
      {
        userId,
        subscriptionId: subscription.id,
        trialStart: trialStart.toISOString(),
        trialEnd: trialEnd.toISOString(),
      },
      LOG_SOURCE
    );

    return NextResponse.json({
      success: true,
      message: "14-day trial activated successfully",
      subscription: {
        id: subscription.id,
        plan: subscription.plan,
        status: subscription.status,
        trialStart: subscription.trialStart,
        trialEnd: subscription.trialEnd,
        calendarProviderLimit: subscription.calendarProviderLimit,
      },
    });
  } catch (error) {
    logger.error(
      "Failed to activate trial",
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      LOG_SOURCE
    );

    return NextResponse.json(
      { error: "Failed to activate trial. Please try again." },
      { status: 500 }
    );
  }
}
