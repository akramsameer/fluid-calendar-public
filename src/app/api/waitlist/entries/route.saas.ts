import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { logger } from "@/lib/logger";
import { requireAdmin } from "@/lib/auth/api-auth";

const LOG_SOURCE = "WaitlistEntriesAPI";
const prisma = new PrismaClient();

/**
 * GET /api/waitlist/entries
 * Returns paginated, filtered, and sorted waitlist entries
 * Admin-only endpoint
 */
export async function GET(request: NextRequest) {
  try {
    // Check if user is admin
    const authResponse = await requireAdmin(request);
    if (authResponse) return authResponse;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const sortField = searchParams.get("sortField") || "createdAt";
    const sortDirection = searchParams.get("sortDirection") || "desc";
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");

    // Validate parameters
    if (page < 1 || pageSize < 1 || pageSize > 100) {
      return NextResponse.json(
        { message: "Invalid pagination parameters" },
        { status: 400 }
      );
    }

    // Build filter conditions
    const where: {
      status?: string;
      OR?: Array<
        | { email: { contains: string; mode: "insensitive" } }
        | { name: { contains: string; mode: "insensitive" } }
      >;
    } = {};

    // Filter by status if provided
    if (status) {
      where.status = status;
    }

    // Filter by search term if provided
    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
      ];
    }

    // Count total entries matching the filter
    const total = await prisma.waitlist.count({ where });

    // Fetch paginated entries
    const entries = await prisma.waitlist.findMany({
      where,
      orderBy: {
        [sortField]: sortDirection,
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    logger.info(
      "Fetched waitlist entries",
      {
        count: entries.length,
        total,
        page,
        pageSize,
        filters: JSON.stringify({ status, search, sortField, sortDirection }),
      },
      LOG_SOURCE
    );

    return NextResponse.json({
      entries,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    logger.error(
      "Error fetching waitlist entries",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );

    return NextResponse.json(
      { message: "Failed to fetch waitlist entries" },
      { status: 500 }
    );
  }
}
