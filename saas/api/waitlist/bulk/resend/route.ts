import { NextRequest, NextResponse } from "next/server";

import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/api-auth";
import { sendInvitationEmail } from "@saas/email/waitlist";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const LOG_SOURCE = "BulkResendInvitationsAPI";

// Validation schema for bulk resend invitations
const bulkResendSchema = z.object({
  ids: z.array(z.string()).min(1),
  message: z.string().optional(),
});

/**
 * POST /api/waitlist/bulk/resend
 * Resends invitations to multiple users
 * Admin-only endpoint
 */
export async function POST(request: NextRequest) {
  try {
    // Check if user is admin
    const authResponse = await requireAdmin(request);
    if (authResponse) return authResponse;

    // Parse and validate request body
    const body = await request.json();
    const result = bulkResendSchema.safeParse(body);

    if (!result.success) {
      logger.warn(
        "Invalid bulk resend request",
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

    const { ids, message } = result.data;

    // Get beta settings for invitation validity
    const settings = await prisma.betaSettings.findUnique({
      where: { id: "default" },
    });

    const invitationValidDays = settings?.invitationValidDays || 7;

    // Find users to resend invitations to (only INVITED status)
    const usersToResend = await prisma.waitlist.findMany({
      where: {
        id: { in: ids },
        status: "INVITED",
      },
    });

    // If no users to resend, return early
    if (usersToResend.length === 0) {
      return NextResponse.json({
        message: "No invited users found",
        resendCount: 0,
      });
    }

    // Process resends and keep track of successes
    let successCount = 0;
    const now = new Date();
    const expirationDate = new Date(now);
    expirationDate.setDate(expirationDate.getDate() + invitationValidDays);

    for (const user of usersToResend) {
      try {
        // Generate new invitation token
        const invitationToken = uuidv4();

        // Update user with new token and expiry
        await prisma.waitlist.update({
          where: { id: user.id },
          data: {
            invitedAt: now,
            invitationToken,
            invitationExpiry: expirationDate,
          },
        });

        // Send the invitation email
        await sendInvitationEmail({
          email: user.email,
          name: user.name || "there",
          invitationToken,
          expirationDate,
          customMessage: message,
          invitationTemplate: settings?.invitationEmailTemplate,
        });

        successCount++;
      } catch (error) {
        logger.error(
          "Error resending invitation to user",
          {
            userId: user.id,
            email: user.email,
            error: error instanceof Error ? error.message : "Unknown error",
          },
          LOG_SOURCE
        );
      }
    }

    logger.info(
      "Bulk resend invitations completed",
      {
        totalAttempted: usersToResend.length,
        successCount,
      },
      LOG_SOURCE
    );

    return NextResponse.json({
      message: `Successfully resent ${successCount} invitations`,
      resendCount: successCount,
    });
  } catch (error) {
    logger.error(
      "Error processing bulk resend invitations",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );

    return NextResponse.json(
      { message: "Failed to process bulk resend invitations" },
      { status: 500 }
    );
  }
}
