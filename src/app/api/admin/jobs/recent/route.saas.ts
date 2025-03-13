import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/api-auth";
import { JobStatus } from "@prisma/client";

/**
 * GET /api/admin/jobs/recent
 *
 * Returns recent jobs with optional status filtering
 * Query parameters:
 * - status: Filter by job status (optional)
 * - limit: Maximum number of jobs to return (default: 10)
 *
 * Requires admin privileges
 */
export async function GET(request: NextRequest) {
  // Check if user is admin
  const authResponse = await requireAdmin(request);
  if (authResponse) return authResponse;

  try {
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    // Convert string status to enum value if provided
    let status: JobStatus | undefined;
    if (statusParam) {
      status = statusParam as JobStatus;
    }

    const where = status ? { status } : {};

    const jobs = await prisma.jobRecord.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(jobs);
  } catch (error) {
    console.error("Error fetching recent jobs:", error);
    return NextResponse.json(
      { error: "Failed to fetch recent jobs" },
      { status: 500 }
    );
  }
}
