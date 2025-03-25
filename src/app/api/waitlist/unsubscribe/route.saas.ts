import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { createHash } from "crypto";

const LOG_SOURCE = "WaitlistUnsubscribeAPI";

// Function to generate unsubscribe token
export function generateUnsubscribeToken(email: string): string {
  const secret = process.env.WAITLIST_UNSUBSCRIBE_SECRET || "default-secret";
  return createHash("sha256").update(`${email}:${secret}`).digest("hex");
}

// Function to verify unsubscribe token
function verifyUnsubscribeToken(email: string, token: string): boolean {
  const expectedToken = generateUnsubscribeToken(email);
  return token === expectedToken;
}

/**
 * GET /api/waitlist/unsubscribe
 * Handles unsubscribe requests for queue position notifications
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");
    const token = searchParams.get("token");

    if (!email || !token) {
      logger.warn(
        "Missing parameters in unsubscribe request",
        { email: !!email, token: !!token },
        LOG_SOURCE
      );
      return NextResponse.json(
        { message: "Invalid unsubscribe request" },
        { status: 400 }
      );
    }

    // Verify the token
    if (!verifyUnsubscribeToken(email, token)) {
      logger.warn("Invalid unsubscribe token", { email }, LOG_SOURCE);
      return NextResponse.json(
        { message: "Invalid unsubscribe token" },
        { status: 400 }
      );
    }

    // Find and update the waitlist entry
    const waitlistEntry = await prisma.waitlist.findUnique({
      where: { email },
    });

    if (!waitlistEntry) {
      logger.warn("Email not found in waitlist", { email }, LOG_SOURCE);
      return NextResponse.json(
        { message: "Email not found in waitlist" },
        { status: 404 }
      );
    }

    // Update the notification preference
    await prisma.waitlist.update({
      where: { id: waitlistEntry.id },
      data: { queueNotificationsEnabled: false },
    });

    logger.info(
      "User unsubscribed from queue position notifications",
      { email },
      LOG_SOURCE
    );

    // Return a success page with a message
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Unsubscribed Successfully</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              line-height: 1.5;
              max-width: 600px;
              margin: 40px auto;
              padding: 0 20px;
              color: #374151;
            }
            .container {
              background: #fff;
              border-radius: 8px;
              padding: 24px;
              box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            }
            h1 {
              color: #111827;
              margin-top: 0;
            }
            .button {
              display: inline-block;
              background-color: #4F46E5;
              color: white;
              padding: 12px 24px;
              text-decoration: none;
              border-radius: 6px;
              margin-top: 16px;
            }
            .button:hover {
              background-color: #4338CA;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Successfully Unsubscribed</h1>
            <p>You have been unsubscribed from queue position update notifications for FluidCalendar&apos;s waitlist.</p>
            <p>You will still receive important notifications about your invitation when it&apos;s ready.</p>
            <p>You can check your waitlist status anytime:</p>
            <a href="/beta/status?email=${encodeURIComponent(
              email
            )}" class="button">Check Waitlist Status</a>
          </div>
        </body>
      </html>
    `;

    return new NextResponse(html, {
      headers: { "Content-Type": "text/html" },
    });
  } catch (error) {
    logger.error(
      "Error processing unsubscribe request",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );

    return NextResponse.json(
      { message: "Failed to process unsubscribe request" },
      { status: 500 }
    );
  }
}
