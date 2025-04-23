import { NextRequest, NextResponse } from "next/server";

import { addDailySummaryJob } from "@/saas/jobs/queues";

import { requireAdmin } from "@/lib/auth/api-auth";

/**
 * POST /api/admin/jobs/trigger-daily-summary
 *
 * Triggers a daily summary email job for a specific user
 * Request body:
 * - userId: The ID of the user to send the summary to
 * - email: The email address to send the summary to
 * - date: (Optional) The date to generate the summary for (YYYY-MM-DD format)
 *
 * Requires admin privileges
 */
export async function POST(request: NextRequest) {
  // Check if user is admin
  const authResponse = await requireAdmin(request);
  if (authResponse) return authResponse;

  try {
    const { userId, email, date } = await request.json();

    if (!userId || !email) {
      return NextResponse.json(
        { error: "User ID and email are required" },
        { status: 400 }
      );
    }

    // Create job data with optional date
    const jobData = {
      userId,
      email,
    };

    // Add date if provided
    if (date) {
      Object.assign(jobData, { date });
    }

    await addDailySummaryJob(jobData);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error triggering daily summary:", error);
    return NextResponse.json(
      { error: "Failed to trigger daily summary" },
      { status: 500 }
    );
  }
}
