import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { logger } from "@/lib/logger";

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

    return NextResponse.json(
      {
        found: true,
        position,
        totalWaitlist,
        referralCount: waitlistEntry.referralCount || 0,
        referralCode: waitlistEntry.referralCode,
        status: waitlistEntry.status,
        estimatedTime,
      },
      { status: 200 }
    );
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

// Helper function to get waitlist position based on priority score
async function getWaitlistPosition(userId: string): Promise<number> {
  const userEntry = await prisma.waitlist.findUnique({
    where: { id: userId },
    select: { priorityScore: true },
  });

  if (!userEntry) return 0;

  // Count entries with higher or equal priority score
  // This is a simple implementation - could be optimized for large waitlists
  const position = await prisma.waitlist.count({
    where: {
      status: "WAITING",
      priorityScore: {
        gte: userEntry.priorityScore,
      },
    },
  });

  return position;
}
