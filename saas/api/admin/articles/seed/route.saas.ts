import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";
import { seedArticleClusters } from "@/lib/seo/cluster-seeds";

const LOG_SOURCE = "AdminArticlesSeedAPI";

/**
 * POST /api/admin/articles/seed
 * Seeds the article clusters database with ~1,000 cluster templates
 *
 * Query params:
 * - force: Delete existing clusters and recreate (default: false)
 * - append: Add new clusters without deleting existing (default: false)
 */
export async function POST(request: NextRequest) {
  // Check admin access
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const force = searchParams.get("force") === "true";
    const append = searchParams.get("append") === "true";

    logger.info(
      "Starting article cluster seeding",
      { force, append },
      LOG_SOURCE
    );

    const result = await seedArticleClusters({ force, append });

    if (!result.success) {
      logger.warn(
        "Cluster seeding blocked",
        { error: result.error || "Unknown", existingCount: result.existingCount },
        LOG_SOURCE
      );

      return NextResponse.json(
        {
          success: false,
          error: result.error,
          existingCount: result.existingCount,
        },
        { status: 409 }
      );
    }

    logger.info(
      "Article cluster seeding completed",
      {
        inserted: result.inserted,
        skipped: result.skipped,
        total: result.total,
      },
      LOG_SOURCE
    );

    return NextResponse.json({
      success: true,
      inserted: result.inserted,
      skipped: result.skipped,
      total: result.total,
      summary: result.summary,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    logger.error(
      "Failed to seed article clusters",
      { error: errorMessage },
      LOG_SOURCE
    );

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/articles/seed
 * Returns current cluster counts and seeding status
 */
export async function GET(request: NextRequest) {
  // Check admin access
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { prisma } = await import("@/lib/prisma");

    const [totalCount, statusCounts, typeCounts] = await Promise.all([
      prisma.articleCluster.count(),
      prisma.articleCluster.groupBy({
        by: ["status"],
        _count: true,
      }),
      prisma.articleCluster.groupBy({
        by: ["clusterType"],
        _count: true,
      }),
    ]);

    const byStatus: Record<string, number> = {};
    for (const item of statusCounts) {
      byStatus[item.status] = item._count;
    }

    const byType: Record<string, number> = {};
    for (const item of typeCounts) {
      byType[item.clusterType] = item._count;
    }

    return NextResponse.json({
      totalClusters: totalCount,
      byStatus,
      byType,
      seeded: totalCount > 0,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    logger.error(
      "Failed to get seed status",
      { error: errorMessage },
      LOG_SOURCE
    );

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
