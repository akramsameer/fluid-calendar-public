import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { logger } from "@/lib/logger";

const LOG_SOURCE = "WaitlistAPI";
const prisma = new PrismaClient();

/**
 * API route for handling waitlist submissions
 */
export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Check if email is already in the waitlist
    const existingEntry = await prisma.waitlist.findUnique({
      where: { email },
    });

    if (existingEntry) {
      return NextResponse.json(
        { message: "Email already in waitlist" },
        { status: 200 }
      );
    }

    // Add email to waitlist
    await prisma.waitlist.create({
      data: {
        email,
      },
    });

    // Send notification email to admin (if configured)
    if (process.env.ADMIN_EMAIL && process.env.RESEND_API_KEY) {
      try {
        const { Resend } = await import("resend");
        const resend = new Resend(process.env.RESEND_API_KEY);

        await resend.emails.send({
          from: "waitlist@fluidcalendar.com",
          to: process.env.ADMIN_EMAIL,
          subject: "New Waitlist Signup",
          html: `<p>New waitlist signup: ${email}</p>`,
        });
      } catch (emailError) {
        logger.error(
          "Failed to send notification email",
          {
            error:
              emailError instanceof Error
                ? emailError.message
                : "Unknown error",
          },
          LOG_SOURCE
        );
        // Don't fail the request if email sending fails
      }
    }

    return NextResponse.json(
      { message: "Successfully added to waitlist" },
      { status: 200 }
    );
  } catch (error) {
    logger.error(
      "Failed to add to waitlist",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );

    return NextResponse.json(
      { error: "Failed to add to waitlist" },
      { status: 500 }
    );
  }
}
