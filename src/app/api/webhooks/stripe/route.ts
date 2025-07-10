/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";

import Stripe from "stripe";

import { logger } from "@/lib/logger";
import { stripe } from "@/lib/stripe";
import {
  handleCheckoutSessionCompleted,
  handleCustomerSubscriptionDeleted,
  handleCustomerSubscriptionTrialWillEnd,
  handleCustomerSubscriptionUpdated,
  handleInvoicePaymentFailed,
  handleInvoicePaymentSucceeded,
} from "@/lib/stripe/webhook-handlers";

const LOG_SOURCE = "StripeWebhook";

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

if (!endpointSecret) {
  throw new Error("Missing STRIPE_WEBHOOK_SECRET environment variable");
}

export async function POST(req: Request) {
  logger.info(
    "🔴🔴🔴🔴🔴🔴 Stripe webhook received 🔴🔴🔴🔴🔴🔴",
    {
      method: "POST",
      url: req.url,
    },
    LOG_SOURCE
  );
  const body = await req.text();
  const sig = req.headers.get("stripe-signature") as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret);

    logger.info(
      "✅ Webhook signature verified successfully",
      {
        eventType: event.type,
        eventId: event.id,
        created: event.created,
      },
      LOG_SOURCE
    );
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    logger.error(
      "❌ Webhook signature verification failed",
      {
        error: errorMessage,
        hasSignature: !!sig,
        bodyLength: body.length,
      },
      LOG_SOURCE
    );

    return NextResponse.json(
      { error: `Webhook Error: ${errorMessage}` },
      { status: 400 }
    );
  }

  // Handle the event
  try {
    switch (event.type) {
      case "checkout.session.completed":
        const session = event.data.object as Stripe.Checkout.Session;

        logger.info(
          "💳 Starting checkout.session.completed processing",
          {
            sessionId: session.id,
            mode: session.mode,
            paymentStatus: session.payment_status,
            hasMetadata: !!session.metadata,
          },
          LOG_SOURCE
        );

        // Log the full session for debugging
        logger.info(
          "📋 Session details",
          {
            sessionData: JSON.stringify({
              id: session.id,
              metadata: session.metadata,
              customer_details: session.customer_details,
              customer: session.customer,
              subscription: session.subscription,
              payment_intent: session.payment_intent,
            }),
          },
          LOG_SOURCE
        );

        try {
          logger.info(
            "🚀 Calling handleCheckoutSessionCompleted",
            {
              sessionId: session.id,
            },
            LOG_SOURCE
          );

          await handleCheckoutSessionCompleted(session);

          logger.info(
            "✅ handleCheckoutSessionCompleted completed successfully",
            {
              sessionId: session.id,
            },
            LOG_SOURCE
          );
        } catch (handlerError) {
          logger.error(
            "💥 handleCheckoutSessionCompleted failed",
            {
              sessionId: session.id,
              error:
                handlerError instanceof Error
                  ? handlerError.message
                  : "Unknown error",
              stack:
                handlerError instanceof Error
                  ? handlerError.stack || null
                  : null,
            },
            LOG_SOURCE
          );
          throw handlerError;
        }
        break;

      case "invoice.payment_succeeded":
        const successfulInvoice = event.data.object as Stripe.Invoice;
        logger.info(
          "💰 Processing invoice.payment_succeeded",
          {
            invoiceId: successfulInvoice.id || "unknown",
            subscriptionId:
              // @ts-expect-error - Stripe Invoice.subscription exists but type definition may be incomplete
              (successfulInvoice.subscription as string) || "unknown",
            amount: successfulInvoice.amount_paid,
          },
          LOG_SOURCE
        );
        await handleInvoicePaymentSucceeded(successfulInvoice);
        break;

      case "invoice.payment_failed":
        const failedInvoice = event.data.object as Stripe.Invoice;
        logger.info(
          "💸 Processing invoice.payment_failed",
          {
            invoiceId: failedInvoice.id || "unknown",
            subscriptionId: (failedInvoice as any).subscription || "unknown",
            attemptCount: failedInvoice.attempt_count,
          },
          LOG_SOURCE
        );
        await handleInvoicePaymentFailed(failedInvoice);
        break;

      case "customer.subscription.updated":
        const updatedSubscription = event.data.object as Stripe.Subscription;
        logger.info(
          "🔄 Processing customer.subscription.updated",
          {
            subscriptionId: updatedSubscription.id,
            status: updatedSubscription.status,
            priceId: updatedSubscription.items.data[0]?.price?.id,
          },
          LOG_SOURCE
        );
        await handleCustomerSubscriptionUpdated(updatedSubscription);
        break;

      case "customer.subscription.deleted":
        const deletedSubscription = event.data.object as Stripe.Subscription;
        logger.info(
          "❌ Processing customer.subscription.deleted",
          {
            subscriptionId: deletedSubscription.id,
            status: deletedSubscription.status,
          },
          LOG_SOURCE
        );
        await handleCustomerSubscriptionDeleted(deletedSubscription);
        break;

      case "customer.subscription.trial_will_end":
        const trialEndingSubscription = event.data
          .object as Stripe.Subscription;
        logger.info(
          "⏰ Processing customer.subscription.trial_will_end",
          {
            subscriptionId: trialEndingSubscription.id,
            trialEnd: trialEndingSubscription.trial_end,
          },
          LOG_SOURCE
        );
        await handleCustomerSubscriptionTrialWillEnd(trialEndingSubscription);
        break;

      default:
        logger.info(
          "⚠️ Unhandled webhook event type",
          {
            eventType: event.type,
            eventId: event.id,
          },
          LOG_SOURCE
        );
    }

    logger.info(
      "🎉 Webhook event processed successfully",
      {
        eventType: event.type,
        eventId: event.id,
      },
      LOG_SOURCE
    );

    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error(
      "💥 Webhook event processing failed",
      {
        eventType: event.type,
        eventId: event.id,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack || null : null,
      },
      LOG_SOURCE
    );

    // Return 200 to avoid Stripe retries for our application errors
    // but log the error for investigation
    return NextResponse.json({
      received: true,
      error: "Processing failed - logged for investigation",
    });
  }
}
