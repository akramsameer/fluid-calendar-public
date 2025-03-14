import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { requireAdmin } from "@/lib/auth/api-auth";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { sendInvitationEmail } from "@/lib/email/waitlist.saas";

const LOG_SOURCE = "InvitationsAPI";

// Validation schema for scheduling invitations
const scheduleInvitationsSchema = z.object({
  count: z.number().int().positive().max(100),
  scheduledDate: z.string().datetime(),
  message: z.string().optional(),
  specificIds: z.array(z.string()).optional(),
});

/**
 * GET /api/waitlist/invitations
 * Returns a list of recent invitations
 * Admin-only endpoint
 */
export async function GET(request: NextRequest) {
  try {
    // Check if user is admin
    const authResponse = await requireAdmin(request);
    if (authResponse) return authResponse;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const status = searchParams.get("status");

    // Build query conditions
    const where: {
      status: string;
      invitationToken?: { not: null };
      invitationExpiry?: { not: null };
    } = {
      status: "INVITED",
    };

    // If we're looking for specific statuses
    if (status) {
      where.status = status;
    }

    // Ensure we only get entries with invitation tokens
    where.invitationToken = { not: null };
    where.invitationExpiry = { not: null };

    // Fetch invitations
    const invitations = await prisma.waitlist.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        invitedAt: true,
        invitationExpiry: true,
        lastVisitedAt: true,
      },
      orderBy: {
        invitedAt: "desc",
      },
      take: Math.min(limit, 100), // Cap at 100 to prevent excessive queries
    });

    // Transform data to include status information
    const invitationsWithStatus = invitations.map((invitation) => {
      let status = "SENT";

      if (invitation.status === "REGISTERED") {
        status = "REGISTERED";
      } else if (
        invitation.lastVisitedAt &&
        invitation.lastVisitedAt > invitation.invitedAt!
      ) {
        status = "OPENED";
      }

      return {
        id: invitation.id,
        email: invitation.email,
        name: invitation.name,
        sentAt: invitation.invitedAt,
        expiresAt: invitation.invitationExpiry,
        status,
      };
    });

    logger.info(
      "Fetched invitations",
      { count: invitationsWithStatus.length },
      LOG_SOURCE
    );

    return NextResponse.json(invitationsWithStatus);
  } catch (error) {
    logger.error(
      "Error fetching invitations",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );

    return NextResponse.json(
      { message: "Failed to fetch invitations" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/waitlist/invitations
 * Schedules new invitations
 * Admin-only endpoint
 */
export async function POST(request: NextRequest) {
  try {
    // Check if user is admin
    const authResponse = await requireAdmin(request);
    if (authResponse) return authResponse;

    // Parse and validate request body
    const body = await request.json();
    const result = scheduleInvitationsSchema.safeParse(body);

    if (!result.success) {
      logger.warn(
        "Invalid invitation scheduling request",
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

    // If scheduled date is today (within 5 minutes), send invitations immediately
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    if (scheduledDateTime <= fiveMinutesFromNow) {
      // Send invitations immediately
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
    } else {
      // TODO: Schedule invitations for future sending
      // This would typically use a job queue like Bull or a scheduled task
      logger.info(
        "Scheduled invitations for future sending",
        {
          scheduledDate: scheduledDateTime.toISOString(),
          count: invitations.length,
        },
        LOG_SOURCE
      );
    }

    logger.info(
      "Processed invitation scheduling request",
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
      "Error scheduling invitations",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );

    return NextResponse.json(
      { message: "Failed to schedule invitations" },
      { status: 500 }
    );
  }
}
