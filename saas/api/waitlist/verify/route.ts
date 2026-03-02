import { NextRequest, NextResponse } from "next/server";

import { Waitlist } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";

import { addToAudienceAndsendWaitlistConfirmationEmail } from "@saas/email/waitlist";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { getWaitlistPosition } from "@saas/lib/waitlist/position";

const LOG_SOURCE = "WaitlistVerifyAPI";

/**
 * GET /api/waitlist/verify
 * Verifies a waitlist signup email and creates the actual waitlist entry
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      logger.warn("Missing verification token", {}, LOG_SOURCE);
      return NextResponse.json(
        { message: "Verification token is required" },
        { status: 400 }
      );
    }

    // Find pending verification with this token
    const pendingVerification = await prisma.pendingWaitlist.findFirst({
      where: {
        verificationToken: token,
      },
    });

    if (!pendingVerification) {
      logger.warn("Invalid verification token", { token }, LOG_SOURCE);
      return NextResponse.json(
        { message: "Invalid verification token" },
        { status: 400 }
      );
    }

    // Check if token has expired
    if (new Date(pendingVerification.verificationExpiry) < new Date()) {
      logger.warn(
        "Expired verification token",
        {
          token,
          expiry: pendingVerification.verificationExpiry.toISOString(),
        },
        LOG_SOURCE
      );

      return NextResponse.json(
        { message: "This verification link has expired" },
        { status: 400 }
      );
    }

    // Check if user is already on the waitlist (double check)
    const existingEntry = await prisma.waitlist.findUnique({
      where: { email: pendingVerification.email },
    });

    if (existingEntry) {
      // User is already on the waitlist, redirect to status page
      logger.info(
        "User already on waitlist during verification",
        { email: pendingVerification.email },
        LOG_SOURCE
      );

      // Clean up the pending verification
      await prisma.pendingWaitlist.delete({
        where: { id: pendingVerification.id },
      });

      return NextResponse.redirect(
        `${
          process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
        }/beta/status?email=${encodeURIComponent(pendingVerification.email)}`
      );
    }

    // Process referral code if provided
    let referrerId = null;
    if (pendingVerification.referralCode) {
      const referrer = await prisma.waitlist.findFirst({
        where: { referralCode: pendingVerification.referralCode },
      });

      if (referrer) {
        referrerId = referrer.id;
      }
    }

    // Create actual waitlist entry
    const entry = await prisma.waitlist.create({
      data: {
        email: pendingVerification.email,
        name: pendingVerification.name,
        referralCode: uuidv4().substring(0, 8), // Generate a unique referral code
        referredBy: referrerId,
        status: "WAITING",
        priorityScore: pendingVerification.interestedInLifetime ? 1 : 0, // +1 for lifetime interest
        interestedInLifetime: pendingVerification.interestedInLifetime || false,
      },
    });

    // Clean up the pending verification
    await prisma.pendingWaitlist.delete({
      where: { id: pendingVerification.id },
    });

    logger.info(
      "Email verified and waitlist entry created",
      { email: entry.email },
      LOG_SOURCE
    );

    // If this user was referred, update the referrer
    if (referrerId) {
      try {
        // Get the referrer's information
        const referrer = await prisma.waitlist.findUnique({
          where: { id: referrerId },
        });

        if (referrer) {
          // Update referrer's referral count and priority score
          await prisma.waitlist.update({
            where: { id: referrerId },
            data: {
              referralCount: { increment: 1 },
              priorityScore: { increment: 1 }, // Increase priority score by 1 for each referral
            },
          });

          // Process referral notifications (handled by a separate function)
          await processReferralNotifications(referrer, entry);
        }
      } catch (notificationError) {
        // Log error but don't fail the verification
        logger.error(
          "Error processing referral after verification",
          {
            error:
              notificationError instanceof Error
                ? notificationError.message
                : "Unknown error",
            referrerId,
            email: entry.email,
          },
          LOG_SOURCE
        );
      }
    }

    // Get waitlist position
    const position = await getWaitlistPosition(entry.id);

    // Get beta settings
    const betaSettings = await prisma.betaSettings.findUnique({
      where: { id: "default" },
    });

    // Send confirmation email
    try {
      await addToAudienceAndsendWaitlistConfirmationEmail({
        email: entry.email,
        name: entry.name || "there",
        referralCode: entry.referralCode,
        position,
        waitlistTemplate: betaSettings?.waitlistConfirmationTemplate,
      });
    } catch (emailError) {
      logger.error(
        "Failed to send waitlist confirmation email after verification",
        {
          error:
            emailError instanceof Error ? emailError.message : "Unknown error",
        },
        LOG_SOURCE
      );
      // Continue even if email fails
    }

    // Redirect to a verification success page
    return NextResponse.redirect(
      `${
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
      }/beta/verified?email=${encodeURIComponent(entry.email)}`
    );
  } catch (error) {
    logger.error(
      "Error verifying email",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );

    return NextResponse.json(
      { message: "Failed to verify email" },
      { status: 500 }
    );
  }
}

// Helper function to process referral notifications
async function processReferralNotifications(
  referrer: Waitlist,
  newEntry: Waitlist
) {
  const { sendReferralMilestoneEmail } = await import(
    "@saas/email/waitlist"
  );

  // Update referrer's referral count and priority score
  const updatedReferrer = await prisma.waitlist.update({
    where: { id: referrer.id },
    data: {
      referralCount: { increment: 1 },
      priorityScore: { increment: 1 }, // Increase priority score by 1 for each referral
    },
  });

  // Send notification about the new referral
  await sendReferralMilestoneEmail({
    email: referrer.email,
    name: referrer.name || "there",
    referralCount: updatedReferrer.referralCount,
    referredName: newEntry.name || "Someone",
    referredEmail: newEntry.email,
    referralCode: referrer.referralCode,
    notificationType: "NEW_REFERRAL",
  });

  // Check if the referrer has reached a milestone
  const milestoneThresholds = [3, 5, 10, 25, 50, 100];
  const milestone = milestoneThresholds.find(
    (threshold) => updatedReferrer.referralCount === threshold
  );

  if (milestone) {
    // Send milestone notification
    await sendReferralMilestoneEmail({
      email: referrer.email,
      name: referrer.name || "there",
      referralCount: updatedReferrer.referralCount,
      milestoneCount: milestone,
      referralCode: referrer.referralCode,
      notificationType: "MILESTONE",
    });
  }

  // Check for position improvement
  const previousPosition = referrer.lastPosition;

  // Calculate current position
  const currentPosition = await getWaitlistPosition(referrer.id);

  // Update the referrer's last position
  await prisma.waitlist.update({
    where: { id: referrer.id },
    data: {
      lastPosition: currentPosition,
    },
  });

  // If position improved significantly and we have a previous position
  if (previousPosition && previousPosition - currentPosition >= 5) {
    // Send position improvement notification
    await sendReferralMilestoneEmail({
      email: referrer.email,
      name: referrer.name || "there",
      referralCount: updatedReferrer.referralCount,
      currentPosition,
      positionImprovement: previousPosition - currentPosition,
      referralCode: referrer.referralCode,
      notificationType: "POSITION_IMPROVEMENT",
    });
  }
}
