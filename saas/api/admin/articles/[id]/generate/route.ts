import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import {
  generateClusterContent,
  sendArticleGenerationNotification,
} from "@/lib/seo";

const LOG_SOURCE = "AdminArticleGenerateAPI";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/admin/articles/[id]/generate
 *
 * Manually triggers generation for a specific cluster.
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

    // Check if already generating
    if (cluster.status === "generating") {
      return NextResponse.json(
        { error: "Generation already in progress" },
        { status: 409 }
      );
    }

    logger.info(
      "Manual generation triggered",
      {
        clusterId: id,
        slug: cluster.slug,
      },
      LOG_SOURCE
    );

    // Reset cluster status to pending if it was failed or skipped
    if (cluster.status === "failed" || cluster.status === "skipped") {
      await prisma.articleCluster.update({
        where: { id },
        data: {
          status: "pending",
          errorMessage: null,
          generationAttempts: 0,
        },
      });
    }

    // Generate content
    const result = await generateClusterContent(id);

    // Get the latest generation log for email
    const latestLog = await prisma.articleGenerationLog.findFirst({
      where: { clusterId: id },
      orderBy: { startedAt: "desc" },
    });

    if (latestLog) {
      // Send email notification
      await sendArticleGenerationNotification(
        {
          clusterId: id,
          slug: result.article?.slug || cluster.slug,
          title: result.article?.title || cluster.title,
          status: result.status,
          wordCount: result.article?.wordCount,
          durationMs: result.durationMs,
          validationIssues: result.validationIssues,
          error: result.error,
        },
        latestLog.id
      );
    }

    return NextResponse.json({
      success: result.success,
      status: result.status,
      article: result.article,
      validationIssues: result.validationIssues,
      error: result.error,
      durationMs: result.durationMs,
    });
  } catch (error) {
    logger.error(
      "Error triggering generation",
      {
        clusterId: id,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      LOG_SOURCE
    );

    return NextResponse.json(
      { error: "Failed to trigger generation" },
      { status: 500 }
    );
  }
}
