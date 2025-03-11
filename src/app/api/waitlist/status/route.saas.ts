import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { logger } from "@/lib/logger";
import { getWaitlistPosition } from "@/lib/waitlist/position";

const LOG_SOURCE = "WaitlistStatusAPI";
const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { message: "Email is required" },
        { status: 400 }
      );
    }

    logger.info("Checking waitlist status", { email }, LOG_SOURCE);

    // Find the waitlist entry
    const waitlistEntry = await prisma.waitlist.findUnique({
      where: { email },
    });

    // Check if there's a pending verification
    const pendingVerification = await prisma.pendingWaitlist.findUnique({
      where: { email },
    });

    if (pendingVerification) {
      // Email is pending verification
      return NextResponse.json(
        {
          found: true,
          pendingVerification: true,
          email,
          message:
            "Your email is pending verification. Please check your inbox for the verification link.",
        },
        { status: 200 }
      );
    }

    if (!waitlistEntry) {
      return NextResponse.json(
        { message: "Email not found in waitlist", found: false },
        { status: 200 }
      );
    }

    // Update lastVisitedAt timestamp
    await prisma.waitlist.update({
      where: { id: waitlistEntry.id },
      data: { lastVisitedAt: new Date() },
    });

    // Get total waitlist count
    const totalWaitlist = await prisma.waitlist.count({
      where: { status: "WAITING" },
    });

    // Get position based on priority score
    const position = await getWaitlistPosition(waitlistEntry.id);

    // Get beta settings
    const betaSettings = await prisma.betaSettings.findUnique({
      where: { id: "default" },
    });

    // Calculate estimated time (simplified example)
    let estimatedTime: string | undefined;
    if (betaSettings?.autoInviteEnabled && betaSettings.autoInviteCount > 0) {
      const weeksEstimate = Math.ceil(position / betaSettings.autoInviteCount);
      estimatedTime =
        weeksEstimate <= 1
          ? "Less than a week"
          : `Approximately ${weeksEstimate} weeks`;
    }

    // Return the status information
    return NextResponse.json({
      found: true,
      position,
      totalWaitlist,
      referralCount: waitlistEntry.referralCount,
      referralCode: waitlistEntry.referralCode,
      status: waitlistEntry.status,
      estimatedTime,
      showPosition: betaSettings?.showQueuePosition || true,
      showTotal: betaSettings?.showTotalWaitlist || true,
    });
  } catch (error) {
    logger.error(
      "Error checking waitlist status",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );

    return NextResponse.json(
      { message: "Failed to check waitlist status" },
      { status: 500 }
    );
  }
}
