import { getToken } from "next-auth/jwt";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextRequest } from "next/server";

import { verifyPaymentStatus } from "@/lib/actions/subscription";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import {
  SUBSCRIPTION_PLANS,
  SUBSCRIPTION_STATUS,
} from "@/lib/stripe/constants";

import LifetimeSuccessClient from "./LifetimeSuccessClient";

const LOG_SOURCE = "LifetimeSuccessPage";

interface PaymentResult {
  metadata?: {
    name?: string;
    email?: string;
  };
}

export default async function LifetimeSuccessPage(props: {
  params: Promise<{ [key: string]: string | string[] | undefined }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const sessionId = searchParams.session_id as string | undefined;
  let paymentResult: PaymentResult | null = null;
  let isExistingUser = false;
  let isLoggedIn = false;

  if (!sessionId) {
    redirect("/");
  }

  try {
    // Verify payment status
    const result = await verifyPaymentStatus(sessionId);

    if (!result.isPaid) {
      logger.warn("Payment not completed", { sessionId }, LOG_SOURCE);
      redirect("/");
    }

    paymentResult = {
      metadata: result.metadata ?? {},
    };

    // Get user email from payment metadata
    const userEmail = result.metadata?.email;

    if (!userEmail) {
      logger.error(
        "No email found in payment metadata",
        { sessionId },
        LOG_SOURCE
      );
      redirect("/");
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email: userEmail },
      include: { subscription: true },
    });

    // Get current token using JWT approach
    const cookieHeader = await cookies();
    const req = new NextRequest(process.env.NEXTAUTH_URL as string, {
      headers: { cookie: cookieHeader.toString() },
    });
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (existingUser) {
      isExistingUser = true;
      isLoggedIn = !!token && token.email === userEmail;
      // Update subscription for existing user
      await prisma.subscription.upsert({
        where: { userId: existingUser.id },
        create: {
          userId: existingUser.id,
          plan: SUBSCRIPTION_PLANS.LIFETIME,
          status: SUBSCRIPTION_STATUS.ACTIVE,
          stripeCustomerId: result.customerId,
          stripePaymentIntentId: sessionId,
          amount: result.amount,
          discountApplied: result.isEarlyBird,
        },
        update: {
          plan: SUBSCRIPTION_PLANS.LIFETIME,
          status: SUBSCRIPTION_STATUS.ACTIVE,
          stripeCustomerId: result.customerId,
          stripePaymentIntentId: sessionId,
          amount: result.amount,
          discountApplied: result.isEarlyBird,
        },
      });

      logger.info(
        "Updated subscription for existing user",
        { userId: existingUser.id, email: userEmail },
        LOG_SOURCE
      );
    }

    // Show the success page with appropriate next steps
    return (
      <div className="container relative min-h-screen py-10">
        <LifetimeSuccessClient
          paymentResult={paymentResult}
          isExistingUser={isExistingUser}
          isLoggedIn={isLoggedIn}
        />
      </div>
    );
  } catch (error) {
    // If it's a Next.js redirect, re-throw it so Next.js can handle it
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      throw error;
    }
    logger.error(
      "Error processing lifetime success page",
      {
        error: error instanceof Error ? error.message : "Unknown error",
        sessionId,
      },
      LOG_SOURCE
    );
    redirect("/");
  }
}
