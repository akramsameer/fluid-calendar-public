import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { EmailService } from "@saas/email/email-service";
import { logger } from "@/lib/logger";

const LOG_SOURCE = "LifetimeInterestAPI";

// Input validation schema
const interestSchema = z.object({
  email: z.string().email("Please provide a valid email address"),
  name: z.string().optional().nullable(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    logger.info("Received lifetime interest request", { body }, LOG_SOURCE);

    // Validate input
    const result = interestSchema.safeParse(body);
    if (!result.success) {
      logger.error(
        "Invalid lifetime interest request",
        { errorMessages: result.error.errors.map((err) => err.message) },
        LOG_SOURCE
      );
      return NextResponse.json(
        { message: "Invalid input", errors: result.error.errors },
        { status: 400 }
      );
    }

    const { email, name } = result.data;
    const userName = name || "Not provided"; // Ensure name is not undefined

    // Send notification email to admin using the EmailService
    const html = `
      <h1>New Lifetime Subscription Interest</h1>
      <p>A user has expressed interest in the lifetime subscription offer:</p>
      <ul>
        <li><strong>Email:</strong> ${email}</li>
        <li><strong>Name:</strong> ${userName}</li>
        <li><strong>Date:</strong> ${new Date().toLocaleString()}</li>
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
      "Lifetime interest notification queued",
      { email, name: userName, jobId },
      LOG_SOURCE
    );

    return NextResponse.json(
      {
        message: "Thank you for your interest! We'll be in touch soon.",
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error(
      "Error processing lifetime interest request",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );

    return NextResponse.json(
      { message: "Failed to record your interest. Please try again later." },
      { status: 500 }
    );
  }
}
