import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { SubscriptionPlan } from "@prisma/client";

import { getAuthOptions } from "@/lib/auth/auth-options";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

const LOG_SOURCE = "BillingActions";

export async function createLifetimeCheckoutSession() {
  try {
    const authOptions = await getAuthOptions();
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return { error: "Not authenticated" };
    }

    // Check if user already has lifetime access
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { subscription: true },
    });

    if (user?.subscription?.plan === SubscriptionPlan.LIFETIME) {
      return { error: "Already have lifetime access" };
    }

    // Count total lifetime purchases to determine if early bird is available
    const lifetimeCount = await prisma.user.count({
      where: { subscription: { plan: SubscriptionPlan.LIFETIME } },
    });

    const price = lifetimeCount < 100 ? 20000 : 40000; // $200 or $400 in cents

    // Create Stripe checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
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
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?canceled=true`,
      metadata: {
        userEmail: session.user.email,
      },
    });

    if (!checkoutSession.url) {
      throw new Error("Failed to create checkout session");
    }

    return { url: checkoutSession.url };
  } catch (error) {
    logger.error(
      "Failed to create checkout session",
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      LOG_SOURCE
    );
    return { error: "Failed to create checkout session" };
  }
}

export async function handleLifetimeSuccess() {
  const authOptions = await getAuthOptions();
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect("/auth/signin");
  }

  try {
    await prisma.user.update({
      where: { email: session.user.email },
      data: {
        subscription: {
          update: {
            plan: SubscriptionPlan.LIFETIME,
          },
        },
      },
    });

    logger.info(
      "User upgraded to lifetime plan",
      { userEmail: session.user.email },
      LOG_SOURCE
    );
  } catch (error) {
    logger.error(
      "Failed to update user subscription",
      {
        error: error instanceof Error ? error.message : "Unknown error",
        userEmail: session.user.email,
      },
      LOG_SOURCE
    );
  }
}
