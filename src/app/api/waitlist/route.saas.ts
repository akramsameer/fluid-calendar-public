import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import { logger } from "@/lib/logger";
import { Resend } from "resend";
import {
  sendWaitlistConfirmationEmail,
  sendReferralMilestoneEmail,
} from "@/lib/email/waitlist.saas";

const LOG_SOURCE = "WaitlistAPI";
const prisma = new PrismaClient();
const resend = new Resend(process.env.RESEND_API_KEY);

// Input validation schema
const waitlistSchema = z.object({
  email: z.string().email("Please provide a valid email address"),
  name: z.string().optional().nullable(),
  referralCode: z.string().optional().nullable(),
  acceptTerms: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    logger.info("Received waitlist request", { body }, LOG_SOURCE);

    // Validate input
    const result = waitlistSchema.safeParse(body);
    if (!result.success) {
      logger.error(
        "Invalid waitlist request",
        { errorMessages: result.error.errors.map((err) => err.message) },
        LOG_SOURCE
      );
      return NextResponse.json(
        { message: "Invalid input", errors: result.error.errors },
        { status: 400 }
      );
    }

    const { email, name, referralCode } = result.data;

    // Check if user is already on the waitlist
    const existingEntry = await prisma.waitlist.findUnique({
      where: { email },
    });

    if (existingEntry) {
      // If user is already on the waitlist, return their status
      return NextResponse.json(
        {
          message: "You're already on the waitlist",
          status: existingEntry.status,
          isExisting: true,
        },
        { status: 200 }
      );
    }

    // If referral code is provided, find the referrer
    let referrerId = null;
    if (referralCode) {
      const referrer = await prisma.waitlist.findFirst({
        where: { referralCode },
      });

      if (referrer) {
        referrerId = referrer.id;
      }
    }

    // Create waitlist entry
    const entry = await prisma.waitlist.create({
      data: {
        email,
        name,
        referralCode: uuidv4().substring(0, 8), // Generate a unique referral code
        referredBy: referrerId,
        status: "WAITING",
        priorityScore: 0, // Will be updated based on referrals
      },
    });

    // If this user was referred, send a notification to the referrer
    if (referrerId) {
      try {
        // Get the referrer's information
        const referrer = await prisma.waitlist.findUnique({
          where: { id: referrerId },
        });

        if (referrer) {
          // Update referrer's referral count and priority score
          const updatedReferrer = await prisma.waitlist.update({
            where: { id: referrerId },
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
            referredName: entry.name || "Someone",
            referredEmail: entry.email,
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
          const waitlistCount = await prisma.waitlist.count({
            where: {
              status: "WAITING",
              priorityScore: {
                gt: updatedReferrer.priorityScore,
              },
            },
          });

          const currentPosition = waitlistCount + 1;

          // Update the referrer's last position
          await prisma.waitlist.update({
            where: { id: referrerId },
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
      } catch (notificationError) {
        // Log error but don't fail the waitlist signup
        logger.error(
          "Error sending referral notification",
          {
            error:
              notificationError instanceof Error
                ? notificationError.message
                : "Unknown error",
            referrerId,
            referredId: entry.id,
          },
          LOG_SOURCE
        );
      }
    }

    // Get waitlist position (simple count-based position)
    const position = await getWaitlistPosition(entry.id);

    // Get beta settings
    const betaSettings = await prisma.betaSettings.findUnique({
      where: { id: "default" },
    });

    // Send confirmation email
    if (entry.email) {
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
          "Failed to send waitlist confirmation email",
          {
            error:
              emailError instanceof Error
                ? emailError.message
                : "Unknown error",
          },
          LOG_SOURCE
        );
        // Continue even if email fails
      }
    }

    return NextResponse.json(
      {
        message: "Successfully joined the waitlist",
        position,
        referralCode: entry.referralCode,
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error(
      "Error processing waitlist request",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );

    return NextResponse.json(
      { message: "Failed to join waitlist" },
      { status: 500 }
    );
  }
}

// Helper function to get waitlist position based on priority score
async function getWaitlistPosition(userId: string): Promise<number> {
  const userEntry = await prisma.waitlist.findUnique({
    where: { id: userId },
    select: { priorityScore: true },
  });

  if (!userEntry) return 0;

  // Count entries with higher or equal priority score
  // This is a simple implementation - could be optimized for large waitlists
  const position = await prisma.waitlist.count({
    where: {
      status: "WAITING",
      priorityScore: {
        gte: userEntry.priorityScore,
      },
    },
  });

  return position;
}

// Email sending function
interface WaitlistConfirmationEmailProps {
  email: string;
  name: string;
  referralCode: string;
  position: number;
  waitlistTemplate?: string;
}

async function addToAudienceAndsendWaitlistConfirmationEmail({
  email,
  name,
  referralCode,
  position,
  waitlistTemplate,
}: WaitlistConfirmationEmailProps) {
  try {
    // Create contact in Resend audience
    try {
      await resend.contacts.create({
        email,
        firstName: name || undefined,
        unsubscribed: false,
        audienceId:
          process.env.RESEND_AUDIENCE_ID ||
          "5eeff6c8-df9f-4dfe-9fb2-e93130d93686",
      });

      logger.info("Added contact to Resend audience", { email }, LOG_SOURCE);
    } catch (contactError) {
      // Log but continue if contact creation fails
      logger.error(
        "Failed to add contact to Resend audience",
        {
          error:
            contactError instanceof Error
              ? contactError.message
              : "Unknown error",
          email,
        },
        LOG_SOURCE
      );
    }
    await sendWaitlistConfirmationEmail({
      email,
      name,
      referralCode,
      position,
      waitlistTemplate,
    });
  } catch (error) {
    logger.error(
      "Error adding to audience and sending waitlist confirmation email",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );
  }
}
