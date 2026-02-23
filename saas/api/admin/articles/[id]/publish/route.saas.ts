import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const LOG_SOURCE = "AdminArticlePublishAPI";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/admin/articles/[id]/publish
 *
 * Publishes a draft/needs_review article.
 * Requires admin privileges.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
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

    if (!cluster.article) {
      return NextResponse.json(
        { error: "No article content to publish" },
        { status: 400 }
      );
    }

    if (cluster.status === "published") {
      return NextResponse.json(
        { error: "Article is already published" },
        { status: 400 }
      );
    }

    // Update article and cluster
    await prisma.$transaction([
      prisma.article.update({
        where: { id: cluster.article.id },
        data: { published: true },
      }),
      prisma.articleCluster.update({
        where: { id },
        data: {
          status: "published",
          publishedAt: new Date(),
          errorMessage: null,
        },
      }),
    ]);

    logger.info(
      "Article published",
      {
        clusterId: id,
        articleId: cluster.article.id,
        slug: cluster.slug,
      },
      LOG_SOURCE
    );

    return NextResponse.json({
      success: true,
      slug: cluster.slug,
      url: `/learn/${cluster.slug}`,
    });
  } catch (error) {
    logger.error(
      "Error publishing article",
      {
        clusterId: id,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      LOG_SOURCE
    );

    return NextResponse.json(
      { error: "Failed to publish article" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/articles/[id]/publish
 *
 * Unpublishes a published article.
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

    if (!cluster.article) {
      return NextResponse.json(
        { error: "No article to unpublish" },
        { status: 400 }
      );
    }

    if (cluster.status !== "published") {
      return NextResponse.json(
        { error: "Article is not published" },
        { status: 400 }
      );
    }

    // Update article and cluster
    await prisma.$transaction([
      prisma.article.update({
        where: { id: cluster.article.id },
        data: { published: false },
      }),
      prisma.articleCluster.update({
        where: { id },
        data: {
          status: "needs_review",
          publishedAt: null,
        },
      }),
    ]);

    logger.info(
      "Article unpublished",
      {
        clusterId: id,
        articleId: cluster.article.id,
        slug: cluster.slug,
      },
      LOG_SOURCE
    );

    return NextResponse.json({
      success: true,
      slug: cluster.slug,
    });
  } catch (error) {
    logger.error(
      "Error unpublishing article",
      {
        clusterId: id,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      LOG_SOURCE
    );

    return NextResponse.json(
      { error: "Failed to unpublish article" },
      { status: 500 }
    );
  }
}
