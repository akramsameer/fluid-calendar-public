import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { logger } from "@/lib/logger";
import { requireAdmin } from "@/lib/auth/api-auth";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import {
  sendInvitationEmail,
  sendReferralMilestoneEmail,
} from "@/lib/email/waitlist.saas";

const LOG_SOURCE = "BulkInviteAPI";
const prisma = new PrismaClient();

// Validation schema for bulk invite request
const bulkInviteSchema = z.object({
  count: z.number().int().positive().max(100),
  scheduledDate: z.string().datetime(),
  message: z.string().optional(),
  specificIds: z.array(z.string()).optional(),
});

/**
 * POST /api/waitlist/bulk/invite
 * Schedules invitations for waitlist users
 * Admin-only endpoint
 */
export async function POST(request: NextRequest) {
  try {
    // Check if user is admin
    const authResponse = await requireAdmin(request);
    if (authResponse) return authResponse;

    // Parse and validate request body
    const body = await request.json();
    const result = bulkInviteSchema.safeParse(body);

    if (!result.success) {
      logger.warn(
        "Invalid bulk invite request",
        {
          errorMessages: result.error.errors.map((err) => err.message),
        },
        LOG_SOURCE
      );

      return NextResponse.json(
        {
          message: "Invalid request data",
          errors: result.error.errors,
        },
        { status: 400 }
      );
    }

    const { count, scheduledDate, message, specificIds } = result.data;
    const scheduledDateTime = new Date(scheduledDate);

    // Validate scheduled date is in the future
    if (scheduledDateTime < new Date()) {
      return NextResponse.json(
        { message: "Scheduled date must be in the future" },
        { status: 400 }
      );
    }

    // Get beta settings for invitation validity
    const settings = await prisma.betaSettings.findUnique({
      where: { id: "default" },
    });

    const invitationValidDays = settings?.invitationValidDays || 7;

    // Calculate expiration date
    const expirationDate = new Date(scheduledDateTime);
    expirationDate.setDate(expirationDate.getDate() + invitationValidDays);

    // Find users to invite
    let usersToInvite;

    if (specificIds && specificIds.length > 0) {
      // Invite specific users by ID
      usersToInvite = await prisma.waitlist.findMany({
        where: {
          id: { in: specificIds },
          status: "WAITING",
        },
        orderBy: {
          priorityScore: "desc",
        },
        take: count,
      });
    } else {
      // Invite users based on priority score
      usersToInvite = await prisma.waitlist.findMany({
        where: {
          status: "WAITING",
        },
        orderBy: {
          priorityScore: "desc",
        },
        take: count,
      });
    }

    // If no users to invite, return early
    if (usersToInvite.length === 0) {
      return NextResponse.json({
        message: "No users found to invite",
        invitedCount: 0,
      });
    }

    // Schedule invitations
    const invitations = [];

    for (const user of usersToInvite) {
      // Generate invitation token
      const invitationToken = uuidv4();

      // Update user status to INVITED
      const updatedUser = await prisma.waitlist.update({
        where: { id: user.id },
        data: {
          status: "INVITED",
          invitedAt: scheduledDateTime,
          invitationToken,
          invitationExpiry: expirationDate,
        },
      });

      invitations.push({
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        invitationToken,
        expirationDate,
      });
    }

    // Always send invitations immediately, regardless of scheduled date
    // This is a temporary solution until a proper job queue is implemented
    for (const invitation of invitations) {
      try {
        await sendInvitationEmail({
          email: invitation.email,
          name: invitation.name || "there",
          invitationToken: invitation.invitationToken,
          expirationDate: invitation.expirationDate,
          customMessage: message,
          invitationTemplate: settings?.invitationEmailTemplate,
        });

        logger.info(
          "Sent invitation email",
          {
            email: invitation.email,
            scheduledDate: scheduledDateTime.toISOString(),
          },
          LOG_SOURCE
        );
      } catch (emailError) {
        logger.error(
          "Failed to send invitation email",
          {
            error:
              emailError instanceof Error
                ? emailError.message
                : "Unknown error",
            email: invitation.email,
          },
          LOG_SOURCE
        );
        // Continue with other invitations even if one fails
      }
    }

    // After inviting users, check for position improvements for remaining waitlist users
    try {
      // Get all remaining waitlist entries with status WAITING
      const waitingEntries = await prisma.waitlist.findMany({
        where: {
          status: "WAITING",
        },
        orderBy: {
          priorityScore: "desc",
        },
      });

      // Calculate new positions for all waiting users
      for (let i = 0; i < waitingEntries.length; i++) {
        const entry = waitingEntries[i];
        const currentPosition = i + 1;

        // If we have a previous position and it improved significantly
        if (entry.lastPosition && entry.lastPosition - currentPosition >= 5) {
          // Send position improvement notification
          try {
            await sendReferralMilestoneEmail({
              email: entry.email,
              name: entry.name || "there",
              referralCount: entry.referralCount,
              currentPosition,
              positionImprovement: entry.lastPosition - currentPosition,
              referralCode: entry.referralCode,
              notificationType: "POSITION_IMPROVEMENT",
            });

            logger.info(
              "Sent position improvement notification",
              {
                email: entry.email,
                previousPosition: entry.lastPosition,
                currentPosition,
                improvement: entry.lastPosition - currentPosition,
              },
              LOG_SOURCE
            );
          } catch (notificationError) {
            logger.error(
              "Failed to send position improvement notification",
              {
                error:
                  notificationError instanceof Error
                    ? notificationError.message
                    : "Unknown error",
                entryId: entry.id,
              },
              LOG_SOURCE
            );
          }
        }

        // Update the entry's last position
        await prisma.waitlist.update({
          where: { id: entry.id },
          data: {
            lastPosition: currentPosition,
          },
        });
      }
    } catch (positionError) {
      logger.error(
        "Error checking position improvements",
        {
          error:
            positionError instanceof Error
              ? positionError.message
              : "Unknown error",
        },
        LOG_SOURCE
      );
      // Continue with the response even if position checks fail
    }

    logger.info(
      "Processed bulk invite request",
      {
        requestedCount: count,
        actualCount: invitations.length,
        scheduledDate: scheduledDateTime.toISOString(),
      },
      LOG_SOURCE
    );

    return NextResponse.json({
      message: "Invitations processed successfully",
      invitedCount: invitations.length,
      scheduledDate: scheduledDateTime,
    });
  } catch (error) {
    logger.error(
      "Error processing bulk invite request",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );

    return NextResponse.json(
      { message: "Failed to process invitations" },
      { status: 500 }
    );
  }
}
