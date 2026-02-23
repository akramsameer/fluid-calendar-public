import { NextRequest, NextResponse } from "next/server";

import { JobStatus } from "@prisma/client";

import { requireAdmin } from "@/lib/auth/api-auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/jobs/stats
 *
 * Returns statistics about background jobs
 * Requires admin privileges
 */
export async function GET(request: NextRequest) {
  // Check if user is admin
  const authResponse = await requireAdmin(request);
  if (authResponse) return authResponse;

  try {
    const totalJobs = await prisma.jobRecord.count();
    const completedJobs = await prisma.jobRecord.count({
      where: { status: JobStatus.COMPLETED },
    });
    const failedJobs = await prisma.jobRecord.count({
      where: { status: JobStatus.FAILED },
    });
    const pendingJobs = await prisma.jobRecord.count({
      where: {
        status: {
          in: [JobStatus.PENDING, JobStatus.ACTIVE, JobStatus.DELAYED],
        },
      },
    });

    return NextResponse.json({
      totalJobs,
      completedJobs,
      failedJobs,
      pendingJobs,
    });
  } catch (error) {
    console.error("Error fetching job stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch job statistics" },
      { status: 500 }
    );
  }
}
