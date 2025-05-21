import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import {
  LIFETIME_ACCESS_DISCOUNTED_PRICE,
  LIFETIME_ACCESS_PRICE,
  MAX_DISCOUNTED_PURCHASES,
  PURCHASE_TYPES,
  STRIPE_METADATA_KEYS,
  SUBSCRIPTION_PLANS,
  SUBSCRIPTION_STATUS,
} from "@/lib/stripe/constants";

const LOG_SOURCE = "SubscriptionActions";

export async function createLifetimeCheckoutSession(
  userId: string | undefined
) {
  try {
    const existingSubscription = await prisma.subscription.findUnique({
      where: {
        userId,
        plan: SUBSCRIPTION_PLANS.LIFETIME,
        status: SUBSCRIPTION_STATUS.ACTIVE,
      },
    });

    if (existingSubscription) {
      throw new Error("User already has lifetime access");
    }

    // Check if user is eligible for early bird discount
    const totalLifetimePurchases = await prisma.subscription.count({
      where: {
        plan: SUBSCRIPTION_PLANS.LIFETIME,
        status: SUBSCRIPTION_STATUS.ACTIVE,
      },
    });

    const price =
      totalLifetimePurchases < MAX_DISCOUNTED_PURCHASES
        ? LIFETIME_ACCESS_DISCOUNTED_PRICE
        : LIFETIME_ACCESS_PRICE;

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Lifetime Access",
              description:
                "One-time payment for lifetime access to all features",
            },
            unit_amount: price,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/subscription/lifetime/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?canceled=true`,
      metadata: {
        ...(userId && { [STRIPE_METADATA_KEYS.USER_ID]: userId }),
        [STRIPE_METADATA_KEYS.PURCHASE_TYPE]: PURCHASE_TYPES.LIFETIME_ACCESS,
        [STRIPE_METADATA_KEYS.SUBSCRIPTION_PLAN]: SUBSCRIPTION_PLANS.LIFETIME,
      },
    });

    return { sessionId: session.id };
  } catch (error) {
    logger.error(
      "Failed to create lifetime checkout session",
      {
        error: error instanceof Error ? error.message : "Unknown error",
        userId: userId ?? "undefined",
      },
      LOG_SOURCE
    );
    throw error;
  }
}

export async function handleLifetimeAccessPurchase(
  userId: string,
  stripeCustomerId: string
) {
  try {
    // Create or update subscription record
    await prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        plan: SUBSCRIPTION_PLANS.LIFETIME,
        status: SUBSCRIPTION_STATUS.ACTIVE,
        stripeCustomerId,
      },
      update: {
        plan: SUBSCRIPTION_PLANS.LIFETIME,
        status: SUBSCRIPTION_STATUS.ACTIVE,
        stripeCustomerId,
      },
    });

    logger.info(
      "Successfully processed lifetime access purchase",
      { userId, stripeCustomerId },
      LOG_SOURCE
    );
  } catch (error) {
    logger.error(
      "Failed to process lifetime access purchase",
      {
        error: error instanceof Error ? error.message : "Unknown error",
        userId,
        stripeCustomerId,
      },
      LOG_SOURCE
    );
    throw error;
  }
}

export async function checkLifetimeAccess(userId: string) {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: {
        userId,
        plan: SUBSCRIPTION_PLANS.LIFETIME,
        status: SUBSCRIPTION_STATUS.ACTIVE,
      },
    });

    return !!subscription;
  } catch (error) {
    logger.error(
      "Failed to check lifetime access",
      {
        error: error instanceof Error ? error.message : "Unknown error",
        userId,
      },
      LOG_SOURCE
    );
    throw error;
  }
}

export async function verifyPaymentStatus(sessionId: string) {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items"],
    });

    const earlyBirdPriceId = process.env.LIFETIME_ACCESS_DISCOUNTED_PRICE_ID;
    const isEarlyBird =
      session.line_items?.data[0]?.price?.id === earlyBirdPriceId;

    return {
      isPaid: session.payment_status === "paid",
      customerId: session.customer as string,
      metadata: session.metadata,
      status: session.status,
      paymentStatus: session.payment_status,
      amount: session.amount_total,
      isEarlyBird,
    };
  } catch (error) {
    logger.error(
      "Failed to verify payment status",
      {
        error: error instanceof Error ? error.message : "Unknown error",
        sessionId,
      },
      LOG_SOURCE
    );
    throw error;
  }
}
