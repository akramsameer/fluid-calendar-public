import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import { logger } from "@/lib/logger";
import { sendVerificationEmail } from "@/lib/email/waitlist.saas";
import { EmailService } from "@/lib/email/email-service.saas";

const LOG_SOURCE = "WaitlistAPI";
const prisma = new PrismaClient();

// Input validation schema
const waitlistSchema = z.object({
  email: z.string().email("Please provide a valid email address"),
  name: z.string().optional().nullable(),
  referralCode: z.string().optional().nullable(),
  acceptTerms: z.boolean().optional(),
  interestedInLifetime: z.boolean().optional(),
  // Honeypot field - should be empty
  website: z.string().optional(),
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

    const { email, name, referralCode, website, interestedInLifetime } =
      result.data;
    const userName = name || "Not provided"; // Ensure name is not undefined

    // Bot detection: Check if honeypot field is filled
    if (website && website.length > 0) {
      logger.warn(
        "Bot submission detected via honeypot field",
        { email },
        LOG_SOURCE
      );
      // Return a 200 status to avoid giving feedback to bots
      // but don't actually process the submission
      return NextResponse.json(
        {
          message: "Your submission is being processed",
          requiresVerification: true,
        },
        { status: 200 }
      );
    }

    // Check if user is already on the waitlist
    const existingEntry = await prisma.waitlist.findUnique({
      where: { email },
    });

    // If user expressed interest in lifetime subscription, send notification
    if (interestedInLifetime) {
      // Send notification email to admin using the EmailService
      const html = `
        <h1>New Lifetime Subscription Interest</h1>
        <p>A user has expressed interest in the lifetime subscription offer during waitlist signup:</p>
        <ul>
          <li><strong>Email:</strong> ${email}</li>
          <li><strong>Name:</strong> ${userName}</li>
          <li><strong>Date:</strong> ${new Date().toLocaleString()}</li>
          <li><strong>Waitlist Status:</strong> ${
            existingEntry ? "Already on waitlist" : "New signup"
          }</li>
        </ul>
      `;

      // Queue the email using EmailService
      const { jobId } = await EmailService.sendEmail({
        from: EmailService.formatSender("FluidCalendar"),
        to: process.env.ADMIN_EMAIL || "emad@fluidcalendar.com",
        subject: "New Lifetime Subscription Interest",
        html,
      });

      logger.info(
        "Lifetime interest notification queued during waitlist signup",
        { email, name: userName, jobId },
        LOG_SOURCE
      );
    }

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

    // Check if there's a pending verification for this email
    const pendingVerification = await prisma.pendingWaitlist.findUnique({
      where: { email },
    });

    if (pendingVerification) {
      // Generate a new verification token and update the pending entry
      const verificationToken = uuidv4();
      const now = new Date();
      const expirationDate = new Date(now);
      expirationDate.setHours(expirationDate.getHours() + 24); // 24 hour expiration

      // Update the pending verification with new token and expiry
      await prisma.pendingWaitlist.update({
        where: { email },
        data: {
          name: name || pendingVerification.name,
          referralCode: referralCode || pendingVerification.referralCode,
          verificationToken,
          verificationExpiry: expirationDate,
          interestedInLifetime:
            interestedInLifetime || pendingVerification.interestedInLifetime,
          updatedAt: now,
        },
      });

      // Resend verification email
      await sendVerificationEmail({
        email,
        name: name || pendingVerification.name || "there",
        verificationToken,
        expirationDate,
      });

      return NextResponse.json(
        {
          message:
            "Verification email resent. Please check your inbox to complete your waitlist signup.",
          requiresVerification: true,
        },
        { status: 200 }
      );
    }

    // Create a new pending verification entry
    const verificationToken = uuidv4();
    const now = new Date();
    const expirationDate = new Date(now);
    expirationDate.setHours(expirationDate.getHours() + 24); // 24 hour expiration

    // Create pending verification entry
    await prisma.pendingWaitlist.create({
      data: {
        email,
        name,
        referralCode,
        verificationToken,
        verificationExpiry: expirationDate,
        interestedInLifetime: interestedInLifetime || false,
      },
    });

    // Send verification email
    await sendVerificationEmail({
      email,
      name: name || "there",
      verificationToken,
      expirationDate,
    });

    return NextResponse.json(
      {
        message:
          "Please check your email to verify your address and complete your waitlist signup.",
        requiresVerification: true,
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
