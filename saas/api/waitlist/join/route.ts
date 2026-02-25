import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const LOG_SOURCE = "WaitlistJoinAPI";

// Validation schema for token validation request
const tokenValidationSchema = z.object({
  token: z.string().uuid(),
});

/**
 * POST /api/waitlist/join
 * Validates an invitation token and returns the associated waitlist entry
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const result = tokenValidationSchema.safeParse(body);

    if (!result.success) {
      logger.warn(
        "Invalid token validation request",
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

    const { token } = result.data;

    // Get system settings to check if public signup is enabled
    const systemSettings = await prisma.systemSettings.findFirst({
      where: { id: { not: "" } }, // Get any record
    });

    const publicSignupEnabled = systemSettings?.publicSignup || false;

    // Find waitlist entry with the provided token
    const waitlistEntry = await prisma.waitlist.findFirst({
      where: {
        invitationToken: token,
      },
    });

    // If no entry found with this token
    if (!waitlistEntry) {
      logger.warn("Invalid invitation token", { token }, LOG_SOURCE);

      return NextResponse.json(
        {
          valid: false,
          message: "Invalid invitation token",
          publicSignupEnabled,
        },
        { status: 400 }
      );
    }

    // Check if token has expired
    if (
      waitlistEntry.invitationExpiry &&
      new Date(waitlistEntry.invitationExpiry) < new Date()
    ) {
      logger.warn(
        "Expired invitation token",
        {
          token,
          expiry: waitlistEntry.invitationExpiry?.toISOString(),
        },
        LOG_SOURCE
      );

      return NextResponse.json(
        {
          valid: false,
          message: "This invitation has expired",
          publicSignupEnabled,
          expired: true,
          email: waitlistEntry.email,
        },
        { status: 400 }
      );
    }

    // Check if user is already registered
    if (waitlistEntry.status === "REGISTERED") {
      logger.warn(
        "Invitation already used",
        { token, email: waitlistEntry.email },
        LOG_SOURCE
      );

      return NextResponse.json(
        {
          valid: false,
          message: "This invitation has already been used",
          publicSignupEnabled,
          alreadyRegistered: true,
          email: waitlistEntry.email,
        },
        { status: 400 }
      );
    }

    // If we get here, the token is valid
    logger.info(
      "Valid invitation token",
      { token, email: waitlistEntry.email },
      LOG_SOURCE
    );

    return NextResponse.json({
      valid: true,
      message: "Valid invitation token",
      publicSignupEnabled,
      waitlistEntry: {
        id: waitlistEntry.id,
        email: waitlistEntry.email,
        name: waitlistEntry.name,
      },
    });
  } catch (error) {
    logger.error(
      "Error validating invitation token",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );

    return NextResponse.json(
      { message: "Failed to validate invitation token" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/waitlist/join
 * Checks if public signup is enabled
 */
export async function GET() {
  try {
    // Get system settings to check if public signup is enabled
    const systemSettings = await prisma.systemSettings.findFirst({
      where: { id: { not: "" } }, // Get any record
    });

    const publicSignupEnabled = systemSettings?.publicSignup || false;

    return NextResponse.json({
      publicSignupEnabled,
    });
  } catch (error) {
    logger.error(
      "Error checking public signup status",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );

    return NextResponse.json(
      { message: "Failed to check public signup status" },
      { status: 500 }
    );
  }
}
