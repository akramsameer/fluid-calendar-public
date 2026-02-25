import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const LOG_SOURCE = "AdminArticleSkipAPI";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/admin/articles/[id]/skip
 *
 * Skips a cluster so it won't be selected for generation.
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
    });

    if (!cluster) {
      return NextResponse.json({ error: "Cluster not found" }, { status: 404 });
    }

    if (cluster.status === "published") {
      return NextResponse.json(
        { error: "Cannot skip a published article" },
        { status: 400 }
      );
    }

    if (cluster.status === "skipped") {
      return NextResponse.json(
        { error: "Article is already skipped" },
        { status: 400 }
      );
    }

    await prisma.articleCluster.update({
      where: { id },
      data: {
        status: "skipped",
        errorMessage: "Skipped by admin",
      },
    });

    logger.info(
      "Article cluster skipped",
      {
        clusterId: id,
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
      "Error skipping article",
      {
        clusterId: id,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      LOG_SOURCE
    );

    return NextResponse.json(
      { error: "Failed to skip article" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/articles/[id]/skip
 *
 * Unskips a cluster so it can be selected for generation again.
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
    });

    if (!cluster) {
      return NextResponse.json({ error: "Cluster not found" }, { status: 404 });
    }

    if (cluster.status !== "skipped") {
      return NextResponse.json(
        { error: "Article is not skipped" },
        { status: 400 }
      );
    }

    await prisma.articleCluster.update({
      where: { id },
      data: {
        status: "pending",
        errorMessage: null,
        generationAttempts: 0,
      },
    });

    logger.info(
      "Article cluster unskipped",
      {
        clusterId: id,
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
      "Error unskipping article",
      {
        clusterId: id,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      LOG_SOURCE
    );

    return NextResponse.json(
      { error: "Failed to unskip article" },
      { status: 500 }
    );
  }
}
