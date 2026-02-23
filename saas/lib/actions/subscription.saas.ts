/* eslint-disable */
import { logger } from "@/lib/logger";
import { stripe } from "@/lib/stripe";
import { STRIPE_METADATA_KEYS } from "@/lib/stripe/constants";
import { LEGACY_LIFETIME_PRICE_IDS } from "@/lib/stripe/price-config";

const LOG_SOURCE = "SubscriptionActions";

export async function verifyPaymentStatus(sessionId: string) {
  try {
    logger.info(
      "Retrieving Stripe checkout session",
      { sessionId },
      LOG_SOURCE
    );

    // First try retrieving the session without expansion to avoid any potential issues
    const basicSession = await stripe.checkout.sessions.retrieve(sessionId);

    logger.info(
      "Basic session data",
      {
        sessionId,
        status: basicSession.status,
        paymentStatus: basicSession.payment_status,
        hasCustomer: !!basicSession.customer,
        hasMetadata: !!basicSession.metadata,
        mode: basicSession.mode,
      },
      LOG_SOURCE
    );

    // Then retrieve with expanded data based on session mode
    const expandOptions = ["line_items", "payment_intent"];
    if (basicSession.mode === "subscription") {
      expandOptions.push("subscription");
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: expandOptions,
    });

    // Check if this is an early bird purchase for lifetime access using centralized config
    const isEarlyBird =
      session.line_items?.data[0]?.price?.id ===
      LEGACY_LIFETIME_PRICE_IDS.earlyBird;

    // Dump all metadata to see what we're working with
    logger.info(
      "Session metadata",
      {
        sessionId,
        metadata: session.metadata ? JSON.stringify(session.metadata) : null,
        lineItems: session.line_items?.data?.length || 0,
        mode: session.mode,
      },
      LOG_SOURCE
    );

    // Get subscription plan from metadata
    let subscriptionPlan = session.metadata?.subscriptionPlan;

    // If not found in standard field, try custom field
    if (
      !subscriptionPlan &&
      session.metadata?.[STRIPE_METADATA_KEYS.SUBSCRIPTION_PLAN]
    ) {
      subscriptionPlan =
        session.metadata[STRIPE_METADATA_KEYS.SUBSCRIPTION_PLAN];
    }

    // Include email and name from customer_details if available but not in metadata
    const email = session.metadata?.email || session.customer_details?.email;
    const name = session.metadata?.name || session.customer_details?.name;

    // Get subscription data for recurring subscriptions
    let subscriptionId: string | null = null;
    let subscriptionData: any = null;
    let paymentIntentId: string | null = null;

    if (session.mode === "subscription" && session.subscription) {
      if (typeof session.subscription === "string") {
        subscriptionId = session.subscription;
        // Fetch the full subscription object
        try {
          subscriptionData =
            await stripe.subscriptions.retrieve(subscriptionId);
          logger.info(
            "Retrieved subscription data",
            {
              subscriptionId,
              status: subscriptionData.status,
              currentPeriodStart: subscriptionData.current_period_start,
              currentPeriodEnd: subscriptionData.current_period_end,
            },
            LOG_SOURCE
          );

          // For subscriptions, get payment intent from latest invoice
          if (subscriptionData.latest_invoice) {
            try {
              const invoiceId =
                typeof subscriptionData.latest_invoice === "string"
                  ? subscriptionData.latest_invoice
                  : subscriptionData.latest_invoice.id;

              const invoice = await stripe.invoices.retrieve(invoiceId);
              paymentIntentId =
                typeof (invoice as any).payment_intent === "string"
                  ? (invoice as any).payment_intent
                  : (invoice as any).payment_intent?.id || null;

              logger.info(
                "Retrieved payment intent from subscription invoice",
                {
                  subscriptionId,
                  invoiceId,
                  paymentIntentId: paymentIntentId || null,
                },
                LOG_SOURCE
              );
            } catch (invoiceError) {
              logger.warn(
                "Failed to retrieve invoice for payment intent",
                {
                  subscriptionId,
                  error:
                    invoiceError instanceof Error
                      ? invoiceError.message
                      : "Unknown error",
                },
                LOG_SOURCE
              );
            }
          }
        } catch (subError) {
          logger.warn(
            "Failed to retrieve subscription details",
            {
              subscriptionId,
              error:
                subError instanceof Error ? subError.message : "Unknown error",
            },
            LOG_SOURCE
          );
        }
      } else {
        // session.subscription is already the expanded object
        subscriptionData = session.subscription;
        subscriptionId = subscriptionData.id;

        // Get payment intent from latest invoice for expanded subscription
        if (subscriptionData.latest_invoice) {
          try {
            const invoiceId =
              typeof subscriptionData.latest_invoice === "string"
                ? subscriptionData.latest_invoice
                : subscriptionData.latest_invoice.id;

            const invoice = await stripe.invoices.retrieve(invoiceId);
            paymentIntentId =
              typeof (invoice as any).payment_intent === "string"
                ? (invoice as any).payment_intent
                : (invoice as any).payment_intent?.id || null;

            logger.info(
              "Retrieved payment intent from expanded subscription invoice",
              {
                subscriptionId,
                invoiceId,
                paymentIntentId: paymentIntentId || null,
              },
              LOG_SOURCE
            );
          } catch (invoiceError) {
            logger.warn(
              "Failed to retrieve invoice for expanded subscription",
              {
                subscriptionId,
                error:
                  invoiceError instanceof Error
                    ? invoiceError.message
                    : "Unknown error",
              },
              LOG_SOURCE
            );
          }
        }
      }
    } else if (session.mode === "payment") {
      // For one-time payments, get payment intent directly from session
      paymentIntentId =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id || null;

      logger.info(
        "Retrieved payment intent from payment session",
        {
          sessionMode: session.mode,
          paymentIntentId: paymentIntentId || null,
        },
        LOG_SOURCE
      );
    }

    logger.info(
      "Extracted subscription info",
      {
        subscriptionPlan: subscriptionPlan || null,
        email: email || null,
        customerId:
          typeof session.customer === "string" ? session.customer : null,
        customerDetails: !!session.customer_details,
        subscriptionId: subscriptionId || null,
        hasSubscriptionData: !!subscriptionData,
        paymentIntentId: paymentIntentId || null,
        sessionMode: session.mode,
      },
      LOG_SOURCE
    );

    // Prepare complete metadata
    const metadata = {
      ...session.metadata,
      subscriptionPlan,
      email,
      name,
    };

    const result = {
      isPaid: session.payment_status === "paid",
      customerId: session.customer as string,
      metadata,
      status: session.status,
      paymentStatus: session.payment_status,
      amount: session.amount_total,
      isEarlyBird,
      paymentIntentId: paymentIntentId,
      subscriptionId: subscriptionId,
      subscription: subscriptionData,
    };

    logger.info(
      "Verification result",
      {
        isPaid: result.isPaid,
        sessionId,
        status: result.status,
        paymentStatus: result.paymentStatus,
        subscriptionId: result.subscriptionId || null,
        paymentIntentId: result.paymentIntentId || null,
        sessionMode: session.mode,
      },
      LOG_SOURCE
    );

    return result;
  } catch (error) {
    // Add more detailed error logging
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;

    logger.error(
      "Failed to verify payment status",
      {
        error: errorMessage,
        stack: errorStack || null,
        sessionId,
      },
      LOG_SOURCE
    );

    // Re-throw the error with more context
    if (error instanceof Error) {
      error.message = `Payment verification failed for session ${sessionId}: ${error.message}`;
      throw error;
    }
    throw new Error(
      `Payment verification failed for session ${sessionId}: ${errorMessage}`
    );
  }
}
