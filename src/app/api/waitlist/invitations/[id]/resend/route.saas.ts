import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { requireAdmin } from "@/lib/auth/api-auth";
import { sendInvitationEmail } from "@/lib/email/waitlist.saas";
import { v4 as uuidv4 } from "uuid";

const LOG_SOURCE = "ResendInvitationAPI";

/**
 * POST /api/waitlist/invitations/[id]/resend
 * Resends an invitation to a specific user
 * Admin-only endpoint
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if user is admin
    const authResponse = await requireAdmin(request);
    if (authResponse) return authResponse;

    const { id } = params;
    if (!id) {
      return NextResponse.json(
        { message: "Missing waitlist entry ID" },
        { status: 400 }
      );
    }

    // Parse request body for optional custom message
    const body = await request.json().catch(() => ({}));
    const customMessage = body.message || undefined;

    // Get beta settings for invitation validity
    const settings = await prisma.betaSettings.findUnique({
      where: { id: "default" },
    });

    const invitationValidDays = settings?.invitationValidDays || 7;

    // Find the waitlist entry
    const waitlistEntry = await prisma.waitlist.findUnique({
      where: { id },
    });

    if (!waitlistEntry) {
      return NextResponse.json(
        { message: "Waitlist entry not found" },
        { status: 404 }
      );
    }

    // Generate new invitation token and expiration date
    const invitationToken = uuidv4();
    const now = new Date();
    const expirationDate = new Date(now);
    expirationDate.setDate(expirationDate.getDate() + invitationValidDays);

    // Update the waitlist entry with new invitation details
    const updatedEntry = await prisma.waitlist.update({
      where: { id },
      data: {
        status: "INVITED",
        invitedAt: now,
        invitationToken,
        invitationExpiry: expirationDate,
      },
    });

    // Send the invitation email
    await sendInvitationEmail({
      email: updatedEntry.email,
      name: updatedEntry.name || "there",
      invitationToken,
      expirationDate,
      customMessage,
      invitationTemplate: settings?.invitationEmailTemplate,
    });

    logger.info(
      "Invitation resent successfully",
      {
        id,
        email: updatedEntry.email,
        expirationDate: expirationDate.toISOString(),
      },
      LOG_SOURCE
    );

    return NextResponse.json({
      message: "Invitation resent successfully",
      email: updatedEntry.email,
      expirationDate,
    });
  } catch (error) {
    logger.error(
      "Error resending invitation",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );

    return NextResponse.json(
      { message: "Failed to resend invitation" },
      { status: 500 }
    );
  }
}
