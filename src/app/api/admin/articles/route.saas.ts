import { NextRequest, NextResponse } from "next/server";

import { ArticleClusterStatus, ArticleClusterType } from "@prisma/client";

import { requireAdmin } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const LOG_SOURCE = "AdminArticlesAPI";

/**
 * GET /api/admin/articles
 *
 * Returns a paginated list of article clusters with filtering.
 * Requires admin privileges.
 */
export async function GET(request: NextRequest) {
  // Check if user is admin
  const authResponse = await requireAdmin(request);
  if (authResponse) return authResponse;

  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse query parameters
    const status = searchParams.get("status") as ArticleClusterStatus | null;
    const clusterType = searchParams.get("clusterType") as ArticleClusterType | null;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);
    const search = searchParams.get("search");

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (clusterType) {
      where.clusterType = clusterType;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
      ];
    }

    // Get total count
    const total = await prisma.articleCluster.count({ where });

    // Get clusters with pagination
    const clusters = await prisma.articleCluster.findMany({
      where,
      orderBy: [
        { status: "asc" },
        { priorityScore: "desc" },
        { createdAt: "asc" },
      ],
      skip: (page - 1) * limit,
      take: limit,
      include: {
        article: {
          select: {
            id: true,
            slug: true,
            published: true,
          },
        },
        logs: {
          select: {
            id: true,
            status: true,
            startedAt: true,
            completedAt: true,
            durationMs: true,
            wordCount: true,
            errorMessage: true,
          },
          orderBy: { startedAt: "desc" },
          take: 1,
        },
      },
    });

    return NextResponse.json({
      clusters,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error(
      "Error fetching articles",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );

    return NextResponse.json(
      { error: "Failed to fetch articles" },
      { status: 500 }
    );
  }
}
