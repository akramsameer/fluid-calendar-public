import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import {
  generateClusterContent,
  selectNextClusterForGeneration,
  sendArticleGenerationNotification,
} from "@/lib/seo";

const LOG_SOURCE = "CronGenerateArticle";

/**
 * POST /api/cron/generate-article
 *
 * Cron endpoint to trigger article generation.
 * Protected by x-cron-secret header.
 *
 * Returns immediately after selecting a cluster, generation continues async.
 */
export async function POST(request: NextRequest) {
  // Verify cron secret
  const cronSecret = request.headers.get("x-cron-secret");
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret) {
    logger.error("CRON_SECRET not configured", {}, LOG_SOURCE);
    return NextResponse.json(
      { error: "Cron endpoint not configured" },
      { status: 500 }
    );
  }

  if (cronSecret !== expectedSecret) {
    logger.warn(
      "Invalid cron secret",
      { providedSecret: cronSecret ? "***" : "missing" },
      LOG_SOURCE
    );
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Select next cluster for generation
    const cluster = await selectNextClusterForGeneration();

    if (!cluster) {
      logger.info("No pending clusters to generate", {}, LOG_SOURCE);
      return NextResponse.json({
        message: "No pending clusters to generate",
        generated: false,
      });
    }

    logger.info(
      "Selected cluster for generation",
      {
        clusterId: cluster.id,
        slug: cluster.slug,
        priorityScore: cluster.priorityScore,
        clusterType: cluster.clusterType,
      },
      LOG_SOURCE
    );

    // Generate unique request ID
    const requestId = `gen-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Start async generation (don't await)
    generateAndNotify(cluster.id, requestId).catch((error) => {
      logger.error(
        "Async generation failed",
        {
          clusterId: cluster.id,
          error: error instanceof Error ? error.message : "Unknown error",
        },
        LOG_SOURCE
      );
    });

    // Return immediately with cluster info
    return NextResponse.json({
      message: "Generation started",
      generated: true,
      requestId,
      cluster: {
        id: cluster.id,
        slug: cluster.slug,
        priority: cluster.priorityScore,
        clusterType: cluster.clusterType,
      },
    });
  } catch (error) {
    logger.error(
      "Error in cron generate-article",
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      LOG_SOURCE
    );

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Async function to generate content and send notification
 */
async function generateAndNotify(
  clusterId: string,
  requestId: string
): Promise<void> {
  logger.info(
    "Starting async generation",
    { clusterId, requestId },
    LOG_SOURCE
  );

  const result = await generateClusterContent(clusterId);

  // Get the latest generation log for email
  const { prisma } = await import("@/lib/prisma");
  const latestLog = await prisma.articleGenerationLog.findFirst({
    where: { clusterId },
    orderBy: { startedAt: "desc" },
  });

  if (latestLog) {
    // Send email notification
    await sendArticleGenerationNotification(
      {
        clusterId,
        slug: result.article?.slug || "",
        title: result.article?.title || "",
        status: result.status,
        wordCount: result.article?.wordCount,
        durationMs: result.durationMs,
        validationIssues: result.validationIssues,
        error: result.error,
      },
      latestLog.id
    );
  }

  logger.info(
    "Async generation completed",
    {
      clusterId,
      requestId,
      success: result.success,
      status: result.status,
    },
    LOG_SOURCE
  );
}

// Also support GET for health checks
export async function GET(request: NextRequest) {
  // Verify cron secret for GET as well
  const cronSecret = request.headers.get("x-cron-secret");
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret || cronSecret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    status: "ok",
    message: "Cron endpoint ready. Use POST to trigger generation.",
  });
}
