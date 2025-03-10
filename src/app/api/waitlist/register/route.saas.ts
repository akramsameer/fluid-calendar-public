import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { hash } from "bcrypt";

const LOG_SOURCE = "WaitlistRegisterAPI";
const prisma = new PrismaClient();

// Validation schema for registration request
const registrationSchema = z.object({
  email: z.string().email("Please provide a valid email address"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  invitationToken: z.string().uuid().optional(),
});

/**
 * POST /api/waitlist/register
 * Registers a new user from the waitlist
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const result = registrationSchema.safeParse(body);

    if (!result.success) {
      logger.warn(
        "Invalid registration request",
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

    const { email, name, password, invitationToken } = result.data;

    // Get system settings to check if public signup is enabled
    const systemSettings = await prisma.systemSettings.findFirst({
      where: { id: { not: "" } }, // Get any record
    });

    const publicSignupEnabled = systemSettings?.publicSignup || false;

    // If public signup is not enabled and no invitation token is provided
    if (!publicSignupEnabled && !invitationToken) {
      logger.warn(
        "Registration attempt without invitation token when public signup is disabled",
        { email },
        LOG_SOURCE
      );

      return NextResponse.json(
        {
          message: "Registration requires an invitation token",
        },
        { status: 403 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      logger.warn(
        "Registration attempt with existing email",
        { email },
        LOG_SOURCE
      );

      return NextResponse.json(
        {
          message: "A user with this email already exists",
        },
        { status: 400 }
      );
    }

    // If invitation token is provided, validate it
    let waitlistEntry = null;
    if (invitationToken) {
      waitlistEntry = await prisma.waitlist.findFirst({
        where: {
          invitationToken,
          email, // Ensure the email matches the invitation
        },
      });

      // If no entry found with this token
      if (!waitlistEntry) {
        logger.warn(
          "Invalid invitation token during registration",
          { invitationToken, email },
          LOG_SOURCE
        );

        return NextResponse.json(
          {
            message: "Invalid invitation token",
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
          "Expired invitation token during registration",
          {
            invitationToken,
            expiry: waitlistEntry.invitationExpiry.toISOString(),
            email,
          },
          LOG_SOURCE
        );

        return NextResponse.json(
          {
            message: "This invitation has expired",
          },
          { status: 400 }
        );
      }

      // Check if user is already registered
      if (waitlistEntry.status === "REGISTERED") {
        logger.warn(
          "Invitation already used during registration",
          { invitationToken, email },
          LOG_SOURCE
        );

        return NextResponse.json(
          {
            message: "This invitation has already been used",
          },
          { status: 400 }
        );
      }
    }

    // Hash the password
    const hashedPassword = await hash(password, 10);

    // Create the user with the same approach as the regular registration
    const user = await prisma.user.create({
      data: {
        email,
        name,
        accounts: {
          create: {
            type: "credentials",
            provider: "credentials",
            providerAccountId: email,
            id_token: hashedPassword, // Store the hashed password in the id_token field
          },
        },
        userSettings: {
          create: {
            theme: "system",
            timeZone: "UTC",
          },
        },
      },
    });

    // If we have a waitlist entry, update its status
    if (waitlistEntry) {
      await prisma.waitlist.update({
        where: { id: waitlistEntry.id },
        data: {
          status: "REGISTERED",
          registeredAt: new Date(),
        },
      });

      logger.info(
        "User registered from waitlist",
        { email, waitlistId: waitlistEntry.id },
        LOG_SOURCE
      );
    } else {
      logger.info(
        "User registered directly (public signup)",
        { email },
        LOG_SOURCE
      );
    }

    return NextResponse.json({
      message: "Registration successful",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    logger.error(
      "Error during user registration",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );

    return NextResponse.json(
      { message: "Failed to register user" },
      { status: 500 }
    );
  }
}
