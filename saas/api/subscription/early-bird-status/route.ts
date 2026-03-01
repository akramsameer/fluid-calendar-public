import { NextResponse } from "next/server";

import { SubscriptionPlan } from "@prisma/client";

import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { EARLY_BIRD_CONFIG } from "@saas/lib/stripe/price-config";

const LOG_SOURCE = "EarlyBirdStatus";

export async function GET() {
  try {
    // Count existing lifetime subscriptions to determine early bird eligibility
    const lifetimeCount = await prisma.subscription.count({
      where: {
        plan: SubscriptionPlan.LIFETIME,
        status: "ACTIVE",
      },
    });

    const isEarlyBird = EARLY_BIRD_CONFIG.isEligible(lifetimeCount);
    const remainingSlots = EARLY_BIRD_CONFIG.getRemainingSlots(lifetimeCount);

    // Pricing in dollars (using centralized configuration)
    const earlyBirdPrice = EARLY_BIRD_CONFIG.pricing.earlyBird.dollars;
    const regularPrice = EARLY_BIRD_CONFIG.pricing.regular.dollars;
    const currentPrice = EARLY_BIRD_CONFIG.getCurrentPrice(isEarlyBird);

    logger.info(
      "Early bird status checked",
      {
        lifetimeCount,
        isEarlyBird,
        remainingSlots,
        currentPrice,
      },
      LOG_SOURCE
    );

    return NextResponse.json({
      isEarlyBird,
      currentPrice,
      earlyBirdPrice,
      regularPrice,
      remainingSlots,
      lifetimeCount,
    });
  } catch (error) {
    logger.error(
      "Failed to check early bird status",
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      LOG_SOURCE
    );

    return NextResponse.json(
      { error: "Failed to check early bird status" },
      { status: 500 }
    );
  }
}
