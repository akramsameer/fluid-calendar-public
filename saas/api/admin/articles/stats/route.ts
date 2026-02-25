import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { getClusterStats } from "@/lib/seo";

const LOG_SOURCE = "AdminArticlesStatsAPI";

/**
 * GET /api/admin/articles/stats
 *
 * Returns aggregate statistics for article clusters.
 * Requires admin privileges.
 */
export async function GET(request: NextRequest) {
  // Check if user is admin
  const authResponse = await requireAdmin(request);
  if (authResponse) return authResponse;

  try {
    // Get cluster status counts
    const clusterStats = await getClusterStats();

    // Get AI cost stats
    const aiStats = await prisma.aICallLog.aggregate({
      where: {
        type: "SEO_CONTENT_GENERATION",
      },
      _sum: {
        costUsd: true,
        tokensTotal: true,
      },
      _count: true,
    });

    // Get stats by cluster type
    const byType = await prisma.articleCluster.groupBy({
      by: ["clusterType"],
      _count: true,
      where: { status: "published" },
    });

    // Get recent generation activity
    const recentGenerations = await prisma.articleGenerationLog.findMany({
      orderBy: { startedAt: "desc" },
      take: 10,
      include: {
        cluster: {
          select: {
            slug: true,
            title: true,
            clusterType: true,
          },
        },
      },
    });

    // Get daily generation counts for the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const dailyStats = await prisma.articleGenerationLog.groupBy({
      by: ["status"],
      _count: true,
      where: {
        startedAt: { gte: sevenDaysAgo },
      },
    });

    return NextResponse.json({
      clusters: clusterStats,
      ai: {
        totalCost: aiStats._sum.costUsd || 0,
        totalTokens: aiStats._sum.tokensTotal || 0,
        totalCalls: aiStats._count,
      },
      byType: byType.reduce(
        (acc, item) => {
          acc[item.clusterType] = item._count;
          return acc;
        },
        {} as Record<string, number>
      ),
      recentGenerations,
      last7Days: dailyStats.reduce(
        (acc, item) => {
          acc[item.status] = item._count;
          return acc;
        },
        {} as Record<string, number>
      ),
    });
  } catch (error) {
    logger.error(
      "Error fetching article stats",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );

    return NextResponse.json(
      { error: "Failed to fetch article statistics" },
      { status: 500 }
    );
  }
}
