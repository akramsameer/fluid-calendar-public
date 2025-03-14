import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { requireAdmin } from "@/lib/auth/api-auth";

const LOG_SOURCE = "WaitlistStatsAPI";

/**
 * GET /api/waitlist/stats
 * Returns statistics about the waitlist
 * Admin-only endpoint
 */
export async function GET(request: NextRequest) {
  try {
    // Check if user is admin
    const authResponse = await requireAdmin(request);
    if (authResponse) return authResponse;

    // Get current date and date 30 days ago
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date(thirtyDaysAgo);
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 30);

    // Get total waitlist count (users with status WAITING)
    const totalWaitlist = await prisma.waitlist.count({
      where: { status: "WAITING" },
    });

    // Get invited users count (users with status INVITED)
    const invitedUsers = await prisma.waitlist.count({
      where: { status: "INVITED" },
    });

    // Get registered users count (users with status REGISTERED)
    const registeredUsers = await prisma.waitlist.count({
      where: { status: "REGISTERED" },
    });

    // Calculate conversion rate (registered / invited)
    const conversionRate =
      invitedUsers > 0 ? Math.round((registeredUsers / invitedUsers) * 100) : 0;

    // Get count of users who joined in the last 30 days
    const lastMonthJoined = await prisma.waitlist.count({
      where: {
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
    });

    // Get count of users who joined in the 30 days before that
    const previousMonthJoined = await prisma.waitlist.count({
      where: {
        createdAt: {
          gte: sixtyDaysAgo,
          lt: thirtyDaysAgo,
        },
      },
    });

    // Calculate monthly growth rate
    const monthlyGrowth =
      previousMonthJoined > 0
        ? Math.round(
            ((lastMonthJoined - previousMonthJoined) / previousMonthJoined) *
              100
          )
        : lastMonthJoined > 0
        ? 100
        : 0;

    // Return statistics
    const stats = {
      totalWaitlist,
      invitedUsers,
      registeredUsers,
      activeUsers: registeredUsers, // For now, assume all registered users are active
      conversionRate,
      monthlyGrowth,
      lastMonthTotal: lastMonthJoined,
    };

    logger.info(
      "Fetched waitlist statistics",
      { stats: JSON.stringify(stats) },
      LOG_SOURCE
    );

    return NextResponse.json(stats);
  } catch (error) {
    logger.error(
      "Error fetching waitlist statistics",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );

    return NextResponse.json(
      { message: "Failed to fetch waitlist statistics" },
      { status: 500 }
    );
  }
}
