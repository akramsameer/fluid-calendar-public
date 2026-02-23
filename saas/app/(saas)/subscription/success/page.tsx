import { getToken } from "next-auth/jwt";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextRequest } from "next/server";

import { verifyPaymentStatus } from "@/lib/actions/subscription.saas";
import { logger } from "@/lib/logger";
import {
    SUBSCRIPTION_PLANS,
} from "@/lib/stripe/constants";

import SuccessClient from "./SuccessClient";

const LOG_SOURCE = "UniversalSuccessPage";

/**
 * SUCCESS PAGE - READ-ONLY ARCHITECTURE
 * 
 * This page is now read-only and does NOT perform any database writes.
 * All subscription-related database changes are handled by Stripe webhooks:
 * 
 * ✅ User Creation: Handled by checkout.session.completed webhook
 * ✅ Subscription Creation: Handled by checkout.session.completed webhook  
 * ✅ Subscription Updates: Handled by customer.subscription.updated webhook
 * ✅ Subscription Cancellation: Handled by customer.subscription.deleted webhook
 * ✅ Payment Failures: Handled by invoice.payment_failed webhook
 * ✅ Renewals: Handled by invoice.payment_succeeded webhook
 * 
 * This page only:
 * - Verifies payment status with Stripe
 * - Shows success confirmation to user
 * - Trusts that webhooks will handle all DB changes
 */

interface PaymentResult {
    metadata?: {
        name?: string;
        email?: string;
        subscriptionPlan?: string;
    };
    isLifetime?: boolean;
    isSubscription?: boolean;
    amount?: number;
    subscriptionId?: string;
    subscription?: object;
}

export default async function UniversalSuccessPage(props: {
    params: Promise<{ [key: string]: string | string[] | undefined }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const searchParams = await props.searchParams;
    const sessionId = searchParams.session_id as string | undefined;
    const redirectUrl = searchParams.redirect as string | undefined;
    let paymentResult: PaymentResult | null = null;
    let isLoggedIn = false;

    logger.info("Success page accessed", {
        hasSessionId: !!sessionId
    }, LOG_SOURCE);

    if (!sessionId) {
        logger.warn("No session ID provided", {}, LOG_SOURCE);
        redirect("/");
    }

    try {
        logger.info("Starting payment verification", { sessionId }, LOG_SOURCE);

        // Verify payment status from Stripe (read-only)
        const result = await verifyPaymentStatus(sessionId);

        logger.info("Payment verification result", {
            sessionId,
            paymentStatus: result.paymentStatus,
            isPaid: result.isPaid,
        }, LOG_SOURCE);

        if (!result.isPaid) {
            logger.warn("Payment not completed", { sessionId }, LOG_SOURCE);
            redirect("/");
        }

        // Determine if this is a subscription or one-time payment
        const plan = result.metadata?.subscriptionPlan;
        const isLifetime = plan === SUBSCRIPTION_PLANS.LIFETIME;
        const isSubscription = plan && plan !== SUBSCRIPTION_PLANS.FREE && !isLifetime;

        logger.info("Plan information", {
            plan: plan || null,
            isLifetime,
            isSubscription: !!isSubscription
        }, LOG_SOURCE);

        paymentResult = {
            metadata: {
                name: result.metadata?.name || undefined,
                email: result.metadata?.email || undefined,
                subscriptionPlan: result.metadata?.subscriptionPlan,
            },
            isLifetime,
            isSubscription: !!isSubscription,
            amount: result.amount || undefined,
            subscriptionId: result.subscriptionId || undefined,
            subscription: result.subscription || undefined,
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

        // Get current token to check if user is logged in
        const cookieHeader = await cookies();
        const req = new NextRequest(process.env.NEXTAUTH_URL as string, {
            headers: { cookie: cookieHeader.toString() },
        });
        const token = await getToken({
            req,
            secret: process.env.NEXTAUTH_SECRET,
        });

        isLoggedIn = !!token && token.email === userEmail;

        logger.info("Payment success page ready", {
            userEmail,
            isLoggedIn,
            plan: plan || null,
        }, LOG_SOURCE);

        // Show the success page - webhooks will handle all DB changes
        if (!paymentResult) {
            logger.error("Payment result is null", { sessionId }, LOG_SOURCE);
            redirect("/");
        }

        return (
            <div className="container relative min-h-screen py-10">
                <SuccessClient
                    paymentResult={paymentResult}
                    isLoggedIn={isLoggedIn}
                    redirectUrl={redirectUrl}
                />
            </div>
        );
    } catch (error) {
        // If it's a Next.js redirect, re-throw it so Next.js can handle it
        if (error instanceof Error && error.message === "NEXT_REDIRECT") {
            throw error;
        }

        logger.error(
            "Error processing payment success page",
            {
                errorMessage: error instanceof Error ? error.message : "Unknown error",
                sessionId,
            },
            LOG_SOURCE
        );
        redirect("/");
    }
} 