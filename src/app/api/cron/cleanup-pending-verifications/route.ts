import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { logger } from "@/lib/logger";

const LOG_SOURCE = "CleanupPendingVerifications";
const prisma = new PrismaClient();

/**
 * GET /api/cron/cleanup-pending-verifications
 * Cleans up expired pending verifications
 * This endpoint should be called by a cron job every hour
 */
export async function GET() {
  try {
    // Find all expired pending verifications
    const now = new Date();
    const expiredVerifications = await prisma.pendingWaitlist.findMany({
      where: {
        verificationExpiry: {
          lt: now,
        },
      },
    });

    if (expiredVerifications.length === 0) {
      logger.info("No expired pending verifications found", {}, LOG_SOURCE);
      return NextResponse.json({
        message: "No expired pending verifications found",
      });
    }

    // Delete expired pending verifications
    const result = await prisma.pendingWaitlist.deleteMany({
      where: {
        verificationExpiry: {
          lt: now,
        },
      },
    });

    logger.info(
      "Cleaned up expired pending verifications",
      {
        count: result.count,
        expiredEmails: expiredVerifications.map((v) => v.email),
      },
      LOG_SOURCE
    );

    return NextResponse.json({
      message: "Cleaned up expired pending verifications",
      count: result.count,
    });
  } catch (error) {
    logger.error(
      "Error cleaning up expired pending verifications",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );

    return NextResponse.json(
      { message: "Failed to clean up expired pending verifications" },
      { status: 500 }
    );
  }
}
