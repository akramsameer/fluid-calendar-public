import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { logger } from "@/lib/logger";
import { requireAdmin } from "@/lib/auth/api-auth";
import { z } from "zod";

const LOG_SOURCE = "BetaSettingsAPI";
const prisma = new PrismaClient();

// Validation schema for settings update
const settingsSchema = z.object({
  maxActiveUsers: z.number().int().positive().optional(),
  invitationValidDays: z.number().int().positive().max(30).optional(),
  autoInviteEnabled: z.boolean().optional(),
  autoInviteCount: z.number().int().positive().max(100).optional(),
  autoInviteFrequency: z.enum(["DAILY", "WEEKLY", "MONTHLY"]).optional(),
  referralBoostAmount: z.number().positive().max(10).optional(),
  maxReferralBoost: z.number().positive().max(100).optional(),
  showQueuePosition: z.boolean().optional(),
  showTotalWaitlist: z.boolean().optional(),
  invitationEmailTemplate: z.string().optional(),
  waitlistConfirmationTemplate: z.string().optional(),
  reminderEmailTemplate: z.string().optional(),
});

/**
 * GET /api/waitlist/settings
 * Returns the current beta settings
 * Admin-only endpoint
 */
export async function GET(request: NextRequest) {
  try {
    // Check if user is admin
    const authResponse = await requireAdmin(request);
    if (authResponse) return authResponse;

    // Get settings from database
    let settings = await prisma.betaSettings.findUnique({
      where: { id: "default" },
    });

    // If settings don't exist, create default settings
    if (!settings) {
      settings = await prisma.betaSettings.create({
        data: {
          id: "default",
          maxActiveUsers: 100,
          invitationValidDays: 7,
          autoInviteEnabled: false,
          autoInviteCount: 10,
          autoInviteFrequency: "WEEKLY",
          referralBoostAmount: 1,
          maxReferralBoost: 10,
          showQueuePosition: true,
          showTotalWaitlist: true,
          invitationEmailTemplate: getDefaultInvitationTemplate(),
          waitlistConfirmationTemplate: getDefaultWaitlistTemplate(),
          reminderEmailTemplate: getDefaultReminderTemplate(),
        },
      });
    }

    logger.info(
      "Fetched beta settings",
      { settingsId: settings.id },
      LOG_SOURCE
    );

    return NextResponse.json(settings);
  } catch (error) {
    logger.error(
      "Error fetching beta settings",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );

    return NextResponse.json(
      { message: "Failed to fetch beta settings" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/waitlist/settings
 * Updates the beta settings
 * Admin-only endpoint
 */
export async function PUT(request: NextRequest) {
  try {
    // Check if user is admin
    const authResponse = await requireAdmin(request);
    if (authResponse) return authResponse;

    // Parse and validate request body
    const body = await request.json();
    const result = settingsSchema.safeParse(body);

    if (!result.success) {
      logger.warn(
        "Invalid beta settings update",
        {
          errorMessages: result.error.errors.map((err) => err.message),
        },
        LOG_SOURCE
      );

      return NextResponse.json(
        {
          message: "Invalid settings data",
          errors: result.error.errors,
        },
        { status: 400 }
      );
    }

    // Update settings in database
    const updatedSettings = await prisma.betaSettings.upsert({
      where: { id: "default" },
      update: result.data,
      create: {
        id: "default",
        ...result.data,
        // Set default values for required fields if not provided
        maxActiveUsers: result.data.maxActiveUsers ?? 100,
        invitationValidDays: result.data.invitationValidDays ?? 7,
        autoInviteEnabled: result.data.autoInviteEnabled ?? false,
        autoInviteCount: result.data.autoInviteCount ?? 10,
        autoInviteFrequency: result.data.autoInviteFrequency ?? "WEEKLY",
        referralBoostAmount: result.data.referralBoostAmount ?? 1,
        maxReferralBoost: result.data.maxReferralBoost ?? 10,
        showQueuePosition: result.data.showQueuePosition ?? true,
        showTotalWaitlist: result.data.showTotalWaitlist ?? true,
        invitationEmailTemplate:
          result.data.invitationEmailTemplate ?? getDefaultInvitationTemplate(),
        waitlistConfirmationTemplate:
          result.data.waitlistConfirmationTemplate ??
          getDefaultWaitlistTemplate(),
        reminderEmailTemplate:
          result.data.reminderEmailTemplate ?? getDefaultReminderTemplate(),
      },
    });

    logger.info(
      "Updated beta settings",
      {
        settingsId: updatedSettings.id,
        changes: Object.keys(result.data).join(", "),
      },
      LOG_SOURCE
    );

    return NextResponse.json(updatedSettings);
  } catch (error) {
    logger.error(
      "Error updating beta settings",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );

    return NextResponse.json(
      { message: "Failed to update beta settings" },
      { status: 500 }
    );
  }
}

// Default email templates
function getDefaultInvitationTemplate(): string {
  return `
<h1>You're Invited to Join Fluid Calendar Beta!</h1>
<p>Hi {{name}},</p>
<p>We're excited to invite you to join the Fluid Calendar beta program! Your spot is now available.</p>
<p>Click the button below to create your account and start using Fluid Calendar:</p>
<a href="{{invitationLink}}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Join the Beta</a>
<p>This invitation will expire on {{expirationDate}}.</p>
<p>Thank you for your interest in Fluid Calendar!</p>
  `;
}

function getDefaultWaitlistTemplate(): string {
  return `
<h1>You're on the Fluid Calendar Waitlist!</h1>
<p>Hi {{name}},</p>
<p>Thank you for joining the Fluid Calendar waitlist! We'll notify you when your spot is available.</p>
<p>Your current position: {{position}}</p>
<p>Want to move up the list? Share your referral link with friends:</p>
<p><strong>{{referralLink}}</strong></p>
<p>Each person who joins using your link will help you move up in the queue!</p>
<p>Check your current status anytime:</p>
<a href="{{statusLink}}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Check Status</a>
<p>Thank you for your interest in Fluid Calendar!</p>
  `;
}

function getDefaultReminderTemplate(): string {
  return `
<h1>Your Fluid Calendar Invitation is Expiring Soon!</h1>
<p>Hi {{name}},</p>
<p>This is a friendly reminder that your invitation to join the Fluid Calendar beta will expire on {{expirationDate}}.</p>
<p>Don't miss out on being one of our early users!</p>
<a href="{{invitationLink}}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Join Now</a>
<p>Thank you for your interest in Fluid Calendar!</p>
  `;
}
