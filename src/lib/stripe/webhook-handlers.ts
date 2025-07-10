/* eslint-disable */
import { SubscriptionPlan, SubscriptionStatus } from "@prisma/client";
import Stripe from "stripe";

import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { getPlanFromPriceId } from "@/lib/stripe/price-config";
import { getCalendarProviderLimit } from "@/lib/subscription/plan-config";

const LOG_SOURCE = "StripeWebhookHandlers";

/**
 * Handle successful checkout session completion
 * This covers both one-time payments (lifetime) and subscription creation
 * Now also handles user creation for new customers
 */
export async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
) {
  logger.info(
    "🔍 Starting handleCheckoutSessionCompleted",
    {
      sessionId: session.id,
      mode: session.mode,
      paymentStatus: session.payment_status,
    },
    LOG_SOURCE
  );

  let userId = session.metadata?.userId;
  const subscriptionPlan = session.metadata
    ?.subscriptionPlan as SubscriptionPlan;
  const userEmail = session.metadata?.email || session.customer_details?.email;
  const userName = session.metadata?.name || session.customer_details?.name;

  logger.info(
    "📋 Extracted session data",
    {
      userId: userId || null,
      subscriptionPlan: subscriptionPlan || null,
      userEmail: userEmail || null,
      userName: userName || null,
      hasUserId: !!userId,
      hasEmail: !!userEmail,
    },
    LOG_SOURCE
  );

  if (!subscriptionPlan) {
    logger.error(
      "❌ No subscription plan found in checkout session metadata",
      {
        sessionId: session.id,
        userId: userId || null,
        metadata: session.metadata ? JSON.stringify(session.metadata) : null,
        availableMetadataKeys: session.metadata
          ? Object.keys(session.metadata)
          : [],
      },
      LOG_SOURCE
    );
    return;
  }

  logger.info(
    "✅ Subscription plan found",
    {
      plan: subscriptionPlan,
    },
    LOG_SOURCE
  );

  // If no userId but we have email, try to find existing user
  if (!userId && userEmail) {
    logger.info(
      "🔍 No userId in metadata, attempting to find existing user by email",
      {
        sessionId: session.id,
        email: userEmail,
      },
      LOG_SOURCE
    );

    try {
      // Try to find existing user by email
      const user = await prisma.user.findUnique({
        where: { email: userEmail },
      });

      if (!user) {
        logger.error(
          "❌ User not found for checkout session - user must exist before purchase",
          {
            sessionId: session.id,
            email: userEmail,
          },
          LOG_SOURCE
        );
        return;
      }

      logger.info(
        "✅ Found existing user for checkout session",
        {
          userId: user.id,
          email: userEmail,
          sessionId: session.id,
        },
        LOG_SOURCE
      );

      userId = user.id;
      logger.info("📝 User ID set", { userId }, LOG_SOURCE);
    } catch (userLookupError) {
      logger.error(
        "❌ Error during user lookup",
        {
          sessionId: session.id,
          email: userEmail,
          error:
            userLookupError instanceof Error
              ? userLookupError.message
              : "Unknown error",
          stack:
            userLookupError instanceof Error
              ? userLookupError.stack || null
              : null,
        },
        LOG_SOURCE
      );
      return;
    }
  }

  if (!userId) {
    logger.error(
      "❌ No user ID found and unable to determine user from email",
      {
        sessionId: session.id,
        hasEmail: !!userEmail,
        metadata: session.metadata ? JSON.stringify(session.metadata) : null,
        customerDetails: session.customer_details
          ? JSON.stringify(session.customer_details)
          : null,
      },
      LOG_SOURCE
    );
    return;
  }

  logger.info(
    "🚀 Processing checkout session completion with user",
    {
      sessionId: session.id,
      userId,
      subscriptionPlan,
      mode: session.mode,
      paymentStatus: session.payment_status,
    },
    LOG_SOURCE
  );

  try {
    if (session.mode === "subscription") {
      logger.info(
        "💳 Processing subscription checkout",
        {
          sessionId: session.id,
          userId,
          subscriptionPlan,
        },
        LOG_SOURCE
      );
      await handleSubscriptionCheckout(session, userId, subscriptionPlan);
      logger.info(
        "✅ Subscription checkout processed successfully",
        {
          sessionId: session.id,
          userId,
        },
        LOG_SOURCE
      );
    } else if (session.mode === "payment") {
      logger.info(
        "💰 Processing one-time payment checkout",
        {
          sessionId: session.id,
          userId,
          subscriptionPlan,
        },
        LOG_SOURCE
      );
      await handleOneTimePaymentCheckout(session, userId, subscriptionPlan);
      logger.info(
        "✅ One-time payment checkout processed successfully",
        {
          sessionId: session.id,
          userId,
        },
        LOG_SOURCE
      );
    } else {
      logger.warn(
        "⚠️ Unknown session mode",
        {
          sessionId: session.id,
          mode: session.mode,
        },
        LOG_SOURCE
      );
    }
  } catch (error) {
    logger.error(
      "❌ Failed to process checkout session completion",
      {
        sessionId: session.id,
        userId,
        subscriptionPlan,
        mode: session.mode,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack || null : null,
      },
      LOG_SOURCE
    );
    throw error;
  }

  logger.info(
    "🎉 handleCheckoutSessionCompleted finished successfully",
    {
      sessionId: session.id,
      userId,
      subscriptionPlan,
    },
    LOG_SOURCE
  );
}

/**
 * Handle subscription checkout (recurring payments)
 */
async function handleSubscriptionCheckout(
  session: Stripe.Checkout.Session,
  userId: string,
  subscriptionPlan: SubscriptionPlan
) {
  logger.info(
    "🔧 Starting handleSubscriptionCheckout",
    {
      sessionId: session.id,
      userId,
      subscriptionPlan,
    },
    LOG_SOURCE
  );

  const stripeSubscriptionId = session.subscription as string;
  const stripeCustomerId = session.customer as string;

  logger.info(
    "📦 Extracted Stripe IDs",
    {
      stripeSubscriptionId: stripeSubscriptionId || null,
      stripeCustomerId: stripeCustomerId || null,
      sessionId: session.id,
    },
    LOG_SOURCE
  );

  if (!stripeSubscriptionId) {
    logger.error(
      "❌ No subscription ID found in checkout session",
      {
        sessionId: session.id,
        sessionSubscription:
          typeof session.subscription === "string"
            ? session.subscription
            : null,
      },
      LOG_SOURCE
    );
    throw new Error("No subscription ID found in checkout session");
  }

  logger.info(
    "🔍 Retrieving subscription details from Stripe",
    {
      stripeSubscriptionId,
    },
    LOG_SOURCE
  );

  // Retrieve full subscription details from Stripe
  const subscriptionResponse =
    await stripe.subscriptions.retrieve(stripeSubscriptionId);
  const subscription = subscriptionResponse as any; // Type assertion to access properties

  // Log the COMPLETE subscription response for debugging
  logger.info(
    "🔍 COMPLETE SUBSCRIPTION RESPONSE FROM STRIPE",
    {
      subscriptionId: subscription.id,
      completeSubscriptionObject: JSON.stringify(subscription, null, 2),
    },
    LOG_SOURCE
  );

  logger.info(
    "✅ Retrieved subscription from Stripe",
    {
      subscriptionId: subscription.id,
      status: subscription.status,
      customerId:
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer?.id || null,
      // Period dates are on subscription items, not main subscription object
      mainSubscriptionPeriodStart:
        subscription.current_period_start || "NOT_PRESENT",
      mainSubscriptionPeriodEnd:
        subscription.current_period_end || "NOT_PRESENT",
    },
    LOG_SOURCE
  );

  // Get period dates from subscription items (where they actually exist)
  const firstItem = subscription.items?.data?.[0];
  const currentPeriodStart = firstItem?.current_period_start;
  const currentPeriodEnd = firstItem?.current_period_end;

  // Log the raw timestamp values for debugging
  logger.info(
    "🕐 Period dates from subscription items (correct location)",
    {
      currentPeriodStartRaw: currentPeriodStart || null,
      currentPeriodEndRaw: currentPeriodEnd || null,
      currentPeriodStartType: typeof currentPeriodStart,
      currentPeriodEndType: typeof currentPeriodEnd,
      hasFirstItem: !!firstItem,
      itemsCount: subscription.items?.data?.length || 0,
    },
    LOG_SOURCE
  );

  // Log subscription items and pricing details
  logger.info(
    "💰 Stripe subscription items and pricing details",
    {
      subscriptionId: subscription.id,
      itemsCount: subscription.items?.data?.length || 0,
      items:
        subscription.items?.data?.map((item: any) => ({
          id: item.id,
          priceId: item.price?.id,
          productId: item.price?.product,
          interval: item.price?.recurring?.interval,
          intervalCount: item.price?.recurring?.interval_count,
          amount: item.price?.unit_amount,
          currency: item.price?.currency,
          quantity: item.quantity,
          currentPeriodStart: item.current_period_start,
          currentPeriodEnd: item.current_period_end,
        })) || [],
      billingCycleAnchor: subscription.billing_cycle_anchor,
      createdAt: subscription.created,
      startDate: subscription.start_date,
      trialStart: subscription.trial_start,
      trialEnd: subscription.trial_end,
    },
    LOG_SOURCE
  );

  // Safely convert timestamps to dates using the correct source (subscription items)
  const currentPeriodStartDate = currentPeriodStart
    ? new Date(currentPeriodStart * 1000)
    : new Date();

  const currentPeriodEndDate = currentPeriodEnd
    ? new Date(currentPeriodEnd * 1000)
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Default to 30 days from now

  logger.info(
    "📅 Converted dates from subscription items",
    {
      currentPeriodStart: currentPeriodStartDate.toISOString(),
      currentPeriodEnd: currentPeriodEndDate.toISOString(),
      isValidStart: !isNaN(currentPeriodStartDate.getTime()),
      isValidEnd: !isNaN(currentPeriodEndDate.getTime()),
      periodLengthDays: Math.round(
        (currentPeriodEndDate.getTime() - currentPeriodStartDate.getTime()) /
          (1000 * 60 * 60 * 24)
      ),
      expectedForYearly: "~365 days",
    },
    LOG_SOURCE
  );

  // Get calendar provider limit from configuration
  const calendarProviderLimit = getCalendarProviderLimit(subscriptionPlan);

  logger.info(
    "📋 Calendar provider limit for plan",
    {
      subscriptionPlan,
      calendarProviderLimit,
    },
    LOG_SOURCE
  );

  // Create or update subscription record using the correct period dates
  const subscriptionData = {
    userId,
    plan: subscriptionPlan,
    status: mapStripeStatusToOurStatus(subscription.status),
    stripeCustomerId,
    stripeSubscriptionId,
    stripePriceId: subscription.items.data[0]?.price?.id || null,
    currentPeriodStart: currentPeriodStartDate,
    currentPeriodEnd: currentPeriodEndDate,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    calendarProviderLimit,
  };

  logger.info(
    "💾 Prepared subscription data for upsert",
    {
      userId,
      plan: subscriptionData.plan,
      status: subscriptionData.status,
      stripeCustomerId: subscriptionData.stripeCustomerId,
      stripeSubscriptionId: subscriptionData.stripeSubscriptionId,
      currentPeriodStart: subscriptionData.currentPeriodStart.toISOString(),
      currentPeriodEnd: subscriptionData.currentPeriodEnd.toISOString(),
    },
    LOG_SOURCE
  );

  try {
    logger.info(
      "🔄 Performing subscription upsert",
      {
        userId,
      },
      LOG_SOURCE
    );

    // Get existing subscription data before upsert to track changes
    const existingSubscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    logger.info(
      "📋 Existing subscription state",
      {
        userId,
        hasExisting: !!existingSubscription,
        existingPlan: existingSubscription?.plan || "none",
        existingStatus: existingSubscription?.status || "none",
        newPlan: subscriptionPlan,
        newStatus: subscriptionData.status,
        isUpgrade: existingSubscription
          ? existingSubscription.plan !== subscriptionPlan
          : false,
      },
      LOG_SOURCE
    );

    const upsertedSubscription = await prisma.subscription.upsert({
      where: { userId },
      create: subscriptionData,
      update: subscriptionData,
    });

    logger.info(
      "✅ Subscription upsert successful",
      {
        subscriptionId: upsertedSubscription.id,
        userId,
        plan: upsertedSubscription.plan,
        status: upsertedSubscription.status,
      },
      LOG_SOURCE
    );

    // Create subscription history record with proper from/to tracking
    logger.info(
      "📝 Creating subscription history record",
      {
        userId,
        subscriptionId: upsertedSubscription.id,
        isUpgrade: !!existingSubscription,
        fromPlan: existingSubscription?.plan || null,
        toPlan: subscriptionPlan,
      },
      LOG_SOURCE
    );

    const historyReason = existingSubscription
      ? existingSubscription.plan !== subscriptionPlan
        ? "plan_upgrade"
        : "checkout_completed"
      : "checkout_completed";

    await prisma.subscriptionHistory.create({
      data: {
        userId,
        subscriptionId: upsertedSubscription.id,
        fromStatus: existingSubscription?.status || null,
        toStatus: subscriptionData.status,
        fromPlan: existingSubscription?.plan || null,
        toPlan: subscriptionPlan,
        reason: historyReason,
        metadata: {
          sessionId: session.id,
          stripeSubscriptionId,
          trialPeriod: !!subscription.trial_end,
          isUpgrade:
            !!existingSubscription &&
            existingSubscription.plan !== subscriptionPlan,
        },
      },
    });

    logger.info(
      "✅ Subscription history record created",
      {
        userId,
        subscriptionId: upsertedSubscription.id,
      },
      LOG_SOURCE
    );

    logger.info(
      "🎉 Successfully processed subscription checkout",
      {
        userId,
        subscriptionPlan,
        stripeSubscriptionId,
        status: subscriptionData.status,
        subscriptionId: upsertedSubscription.id,
      },
      LOG_SOURCE
    );
  } catch (dbError) {
    logger.error(
      "💥 Database operation failed in handleSubscriptionCheckout",
      {
        userId,
        error: dbError instanceof Error ? dbError.message : "Unknown error",
        stack: dbError instanceof Error ? dbError.stack || null : null,
      },
      LOG_SOURCE
    );
    throw dbError;
  }
}

/**
 * Handle one-time payment checkout (lifetime access)
 */
async function handleOneTimePaymentCheckout(
  session: Stripe.Checkout.Session,
  userId: string,
  subscriptionPlan: SubscriptionPlan
) {
  const stripeCustomerId = session.customer as string;
  const stripePaymentIntentId = session.payment_intent as string;

  // Get calendar provider limit from configuration
  const calendarProviderLimit = getCalendarProviderLimit(subscriptionPlan);

  // Get existing subscription data before upsert to track changes
  const existingSubscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  logger.info(
    "📋 Existing subscription state for lifetime purchase",
    {
      userId,
      hasExisting: !!existingSubscription,
      existingPlan: existingSubscription?.plan || "none",
      existingStatus: existingSubscription?.status || "none",
      newPlan: subscriptionPlan,
      isUpgrade: existingSubscription
        ? existingSubscription.plan !== subscriptionPlan
        : false,
    },
    LOG_SOURCE
  );

  // Create or update subscription record for lifetime access
  const subscriptionData = {
    userId,
    plan: subscriptionPlan,
    status: SubscriptionStatus.ACTIVE,
    stripeCustomerId,
    stripePaymentIntentId,
    amount: session.amount_total,
    currency: session.currency || "usd",
    calendarProviderLimit,
  };

  const upsertedSubscription = await prisma.subscription.upsert({
    where: { userId },
    create: subscriptionData,
    update: subscriptionData,
  });

  // Create subscription history record with proper from/to tracking
  const historyReason = existingSubscription
    ? existingSubscription.plan !== subscriptionPlan
      ? "lifetime_upgrade"
      : "lifetime_purchase"
    : "lifetime_purchase";

  await prisma.subscriptionHistory.create({
    data: {
      userId,
      subscriptionId: upsertedSubscription.id,
      fromStatus: existingSubscription?.status || null,
      toStatus: SubscriptionStatus.ACTIVE,
      fromPlan: existingSubscription?.plan || null,
      toPlan: subscriptionPlan,
      reason: historyReason,
      metadata: {
        sessionId: session.id,
        stripePaymentIntentId,
        amount: session.amount_total,
        isUpgrade:
          !!existingSubscription &&
          existingSubscription.plan !== subscriptionPlan,
      },
    },
  });

  logger.info(
    "Successfully processed lifetime payment checkout",
    {
      userId,
      subscriptionPlan,
      stripePaymentIntentId,
      amount: session.amount_total,
    },
    LOG_SOURCE
  );
}

/**
 * Handle successful invoice payment (renewal, etc.)
 */
export async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const stripeSubscriptionId = (invoice as any).subscription as string;

  if (!stripeSubscriptionId) {
    logger.info(
      "Invoice payment succeeded but no subscription ID found - likely one-time payment",
      {
        invoiceId: invoice.id || "unknown",
        customerId:
          typeof invoice.customer === "string"
            ? invoice.customer
            : (invoice.customer as any)?.id || "unknown",
      },
      LOG_SOURCE
    );
    return;
  }

  // Find subscription by Stripe subscription ID
  const subscription = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId },
  });

  if (!subscription) {
    logger.error(
      "Subscription not found for successful invoice payment",
      {
        invoiceId: invoice.id || "unknown",
        stripeSubscriptionId,
      },
      LOG_SOURCE
    );
    return;
  }

  // Retrieve updated subscription from Stripe
  const stripeSubscription =
    await stripe.subscriptions.retrieve(stripeSubscriptionId);

  // Update subscription with new period dates
  const updatedSubscription = await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      status: mapStripeStatusToOurStatus(stripeSubscription.status),
      currentPeriodStart: new Date(
        (stripeSubscription as any).current_period_start * 1000
      ),
      currentPeriodEnd: new Date(
        (stripeSubscription as any).current_period_end * 1000
      ),
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
    },
  });

  // Create history record
  await prisma.subscriptionHistory.create({
    data: {
      userId: subscription.userId,
      subscriptionId: subscription.id,
      fromStatus: subscription.status,
      toStatus: mapStripeStatusToOurStatus(stripeSubscription.status),
      fromPlan: subscription.plan,
      toPlan: subscription.plan,
      reason: "payment_succeeded",
      metadata: {
        invoiceId: invoice.id,
        amountPaid: invoice.amount_paid,
      },
    },
  });

  logger.info(
    "Successfully processed invoice payment",
    {
      userId: subscription.userId,
      subscriptionId: subscription.id,
      invoiceId: invoice.id || "unknown",
      amountPaid: invoice.amount_paid || 0,
      newPeriodEnd: updatedSubscription.currentPeriodEnd?.toISOString() || null,
    },
    LOG_SOURCE
  );
}

/**
 * Handle failed invoice payment
 */
export async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const stripeSubscriptionId = (invoice as any).subscription as string;

  if (!stripeSubscriptionId) {
    logger.info(
      "Invoice payment failed but no subscription ID found",
      {
        invoiceId: invoice.id || "unknown",
        customerId:
          typeof invoice.customer === "string"
            ? invoice.customer
            : (invoice.customer as any)?.id || "unknown",
      },
      LOG_SOURCE
    );
    return;
  }

  // Find subscription by Stripe subscription ID
  const subscription = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId },
  });

  if (!subscription) {
    logger.error(
      "Subscription not found for failed invoice payment",
      {
        invoiceId: invoice.id || "unknown",
        stripeSubscriptionId,
      },
      LOG_SOURCE
    );
    return;
  }

  // Retrieve current subscription status from Stripe
  const stripeSubscription =
    await stripe.subscriptions.retrieve(stripeSubscriptionId);
  const newStatus = mapStripeStatusToOurStatus(stripeSubscription.status);

  // Update subscription status
  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      status: newStatus,
    },
  });

  // Create history record
  await prisma.subscriptionHistory.create({
    data: {
      userId: subscription.userId,
      subscriptionId: subscription.id,
      fromStatus: subscription.status,
      toStatus: newStatus,
      fromPlan: subscription.plan,
      toPlan: subscription.plan,
      reason: "payment_failed",
      metadata: {
        invoiceId: invoice.id,
        attemptCount: invoice.attempt_count,
        nextPaymentAttempt: invoice.next_payment_attempt,
      },
    },
  });

  logger.warn(
    "Invoice payment failed - subscription status updated",
    {
      userId: subscription.userId,
      subscriptionId: subscription.id,
      invoiceId: invoice.id || "unknown",
      newStatus,
      attemptCount: invoice.attempt_count || 0,
    },
    LOG_SOURCE
  );
}

/**
 * Handle subscription updates (plan changes, status changes, etc.)
 */
export async function handleCustomerSubscriptionUpdated(
  stripeSubscription: Stripe.Subscription
) {
  const subscription = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: stripeSubscription.id },
  });

  if (!subscription) {
    logger.error(
      "Subscription not found for update event",
      {
        stripeSubscriptionId: stripeSubscription.id,
      },
      LOG_SOURCE
    );
    return;
  }

  const oldStatus = subscription.status;
  const oldPlan = subscription.plan;
  const newStatus = mapStripeStatusToOurStatus(stripeSubscription.status);

  // Extract new plan from Stripe subscription items
  const stripePriceId = stripeSubscription.items.data[0]?.price?.id;

  // Map Stripe price ID back to our plan enum using centralized mapping
  let newPlan = oldPlan; // Default to current plan if we can't determine

  if (stripePriceId) {
    const planFromPriceId = getPlanFromPriceId(stripePriceId);
    if (planFromPriceId) {
      newPlan = planFromPriceId;
    }
  }

  logger.info(
    "📋 Subscription update details",
    {
      userId: subscription.userId,
      subscriptionId: subscription.id,
      statusChange:
        oldStatus !== newStatus ? `${oldStatus} -> ${newStatus}` : "no change",
      planChange:
        oldPlan !== newPlan ? `${oldPlan} -> ${newPlan}` : "no change",
      stripePriceId: stripePriceId || "unknown",
      hasStatusChange: oldStatus !== newStatus,
      hasPlanChange: oldPlan !== newPlan,
    },
    LOG_SOURCE
  );

  // Get calendar provider limit for the new plan
  const calendarProviderLimit = getCalendarProviderLimit(newPlan);

  // Update subscription with latest data from Stripe
  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      plan: newPlan,
      status: newStatus,
      stripePriceId,
      calendarProviderLimit,
      currentPeriodStart: new Date(
        (stripeSubscription as any).current_period_start * 1000
      ),
      currentPeriodEnd: new Date(
        (stripeSubscription as any).current_period_end * 1000
      ),
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      canceledAt: stripeSubscription.canceled_at
        ? new Date(stripeSubscription.canceled_at * 1000)
        : null,
    },
  });

  // Create history record if status or plan changed
  if (oldStatus !== newStatus || oldPlan !== newPlan) {
    const reason =
      oldPlan !== newPlan ? "plan_changed" : "subscription_updated";

    await prisma.subscriptionHistory.create({
      data: {
        userId: subscription.userId,
        subscriptionId: subscription.id,
        fromStatus: oldStatus,
        toStatus: newStatus,
        fromPlan: oldPlan,
        toPlan: newPlan,
        reason,
        metadata: {
          stripeSubscriptionId: stripeSubscription.id,
          stripePriceId: stripePriceId || null,
          cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
          isPlanChange: oldPlan !== newPlan,
          isStatusChange: oldStatus !== newStatus,
        },
      },
    });

    logger.info(
      "✅ Created subscription history record for update",
      {
        userId: subscription.userId,
        subscriptionId: subscription.id,
        reason,
        statusChange:
          oldStatus !== newStatus
            ? `${oldStatus} -> ${newStatus}`
            : "no change",
        planChange:
          oldPlan !== newPlan ? `${oldPlan} -> ${newPlan}` : "no change",
      },
      LOG_SOURCE
    );
  }

  logger.info(
    "✅ Successfully updated subscription",
    {
      userId: subscription.userId,
      subscriptionId: subscription.id,
      statusChange:
        oldStatus !== newStatus ? `${oldStatus} -> ${newStatus}` : "no change",
      planChange:
        oldPlan !== newPlan ? `${oldPlan} -> ${newPlan}` : "no change",
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
    },
    LOG_SOURCE
  );
}

/**
 * Handle subscription deletion/cancellation
 */
export async function handleCustomerSubscriptionDeleted(
  stripeSubscription: Stripe.Subscription
) {
  const subscription = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: stripeSubscription.id },
  });

  if (!subscription) {
    logger.error(
      "Subscription not found for deletion event",
      {
        stripeSubscriptionId: stripeSubscription.id,
      },
      LOG_SOURCE
    );
    return;
  }

  const oldStatus = subscription.status;

  // Update subscription to cancelled status
  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      status: SubscriptionStatus.CANCELLED,
      canceledAt: new Date(),
    },
  });

  // Create history record
  await prisma.subscriptionHistory.create({
    data: {
      userId: subscription.userId,
      subscriptionId: subscription.id,
      fromStatus: oldStatus,
      toStatus: SubscriptionStatus.CANCELLED,
      fromPlan: subscription.plan,
      toPlan: subscription.plan,
      reason: "subscription_deleted",
      metadata: {
        stripeSubscriptionId: stripeSubscription.id,
      },
    },
  });

  logger.info(
    "Successfully processed subscription deletion",
    {
      userId: subscription.userId,
      subscriptionId: subscription.id,
      stripeSubscriptionId: stripeSubscription.id,
    },
    LOG_SOURCE
  );
}

/**
 * Handle trial ending notification
 */
export async function handleCustomerSubscriptionTrialWillEnd(
  stripeSubscription: Stripe.Subscription
) {
  const subscription = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: stripeSubscription.id },
  });

  if (!subscription) {
    logger.error(
      "Subscription not found for trial ending event",
      {
        stripeSubscriptionId: stripeSubscription.id,
      },
      LOG_SOURCE
    );
    return;
  }

  logger.info(
    "Trial ending notification received",
    {
      userId: subscription.userId,
      subscriptionId: subscription.id,
      trialEnd: stripeSubscription.trial_end
        ? new Date(stripeSubscription.trial_end * 1000).toISOString()
        : null,
    },
    LOG_SOURCE
  );

  // Here you could add logic to send notifications to the user
  // about their trial ending, or perform other business logic
}

/**
 * Map Stripe subscription status to our internal status enum
 */
function mapStripeStatusToOurStatus(
  stripeStatus: Stripe.Subscription.Status
): SubscriptionStatus {
  switch (stripeStatus) {
    case "active":
      return SubscriptionStatus.ACTIVE;
    case "trialing":
      return SubscriptionStatus.TRIALING;
    case "past_due":
      return SubscriptionStatus.PAST_DUE;
    case "canceled":
      return SubscriptionStatus.CANCELLED;
    case "unpaid":
      return SubscriptionStatus.UNPAID;
    case "incomplete":
    case "incomplete_expired":
      return SubscriptionStatus.PAYMENT_PENDING;
    default:
      logger.warn(
        "Unknown Stripe subscription status",
        { stripeStatus },
        LOG_SOURCE
      );
      return SubscriptionStatus.PAYMENT_PENDING;
  }
}
