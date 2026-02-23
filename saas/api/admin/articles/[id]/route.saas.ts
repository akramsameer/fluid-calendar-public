import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const LOG_SOURCE = "AdminArticleAPI";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/articles/[id]
 *
 * Returns a single article cluster with full details.
 * Requires admin privileges.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  // Check if user is admin
  const authResponse = await requireAdmin(request);
  if (authResponse) return authResponse;

  const { id } = await params;

  try {
    const cluster = await prisma.articleCluster.findUnique({
      where: { id },
      include: {
        article: true,
        logs: {
          orderBy: { startedAt: "desc" },
          take: 10,
        },
      },
    });

    if (!cluster) {
      return NextResponse.json({ error: "Cluster not found" }, { status: 404 });
    }

    return NextResponse.json(cluster);
  } catch (error) {
    logger.error(
      "Error fetching article",
      {
        clusterId: id,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      LOG_SOURCE
    );

    return NextResponse.json(
      { error: "Failed to fetch article" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/articles/[id]
 *
 * Deletes an article cluster (and associated article if any).
 * Requires admin privileges.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  // Check if user is admin
  const authResponse = await requireAdmin(request);
  if (authResponse) return authResponse;

  const { id } = await params;

  try {
    const cluster = await prisma.articleCluster.findUnique({
      where: { id },
      include: { article: true },
    });

    if (!cluster) {
      return NextResponse.json({ error: "Cluster not found" }, { status: 404 });
    }

    // Delete in correct order: logs -> article -> cluster
    await prisma.articleGenerationLog.deleteMany({
      where: { clusterId: id },
    });

    if (cluster.articleId) {
      await prisma.article.delete({
        where: { id: cluster.articleId },
      });
    }

    await prisma.articleCluster.delete({
      where: { id },
    });

    logger.info("Article cluster deleted", { clusterId: id }, LOG_SOURCE);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error(
      "Error deleting article",
      {
        clusterId: id,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      LOG_SOURCE
    );

    return NextResponse.json(
      { error: "Failed to delete article" },
      { status: 500 }
    );
  }
}
