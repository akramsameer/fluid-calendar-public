import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { requireAdmin } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const LOG_SOURCE = "BulkExportAPI";

// Validation schema for bulk export request
const bulkExportSchema = z.object({
  ids: z.array(z.string()).optional(),
  filter: z
    .object({
      status: z.enum(["WAITING", "INVITED", "REGISTERED"]).optional(),
      search: z.string().optional(),
    })
    .optional(),
});

/**
 * POST /api/waitlist/bulk/export
 * Exports waitlist entries to CSV
 * Admin-only endpoint
 */
export async function POST(request: NextRequest) {
  try {
    // Check if user is admin
    const authResponse = await requireAdmin(request);
    if (authResponse) return authResponse;

    // Parse and validate request body
    const body = await request.json();
    const result = bulkExportSchema.safeParse(body);

    if (!result.success) {
      logger.warn(
        "Invalid bulk export request",
        {
          errorMessages: result.error.errors.map((err) => err.message),
        },
        LOG_SOURCE
      );

      return NextResponse.json(
        {
          message: "Invalid request data",
          errors: result.error.errors,
        },
        { status: 400 }
      );
    }

    const { ids, filter } = result.data;

    // Build query conditions
    const where: {
      id?: { in: string[] };
      status?: string;
      OR?: Array<
        | { email: { contains: string; mode: "insensitive" } }
        | { name: { contains: string; mode: "insensitive" } }
      >;
    } = {};

    // Filter by IDs if provided
    if (ids && ids.length > 0) {
      where.id = { in: ids };
    }

    // Apply additional filters if provided
    if (filter) {
      if (filter.status) {
        where.status = filter.status;
      }

      if (filter.search) {
        where.OR = [
          { email: { contains: filter.search, mode: "insensitive" } },
          { name: { contains: filter.search, mode: "insensitive" } },
        ];
      }
    }

    // Fetch entries
    const entries = await prisma.waitlist.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
    });

    // Generate CSV
    const headers = [
      "Email",
      "Name",
      "Status",
      "Created At",
      "Invited At",
      "Registered At",
      "Referral Code",
      "Referred By",
      "Referral Count",
      "Priority Score",
      "Last Visited At",
    ];

    const rows = entries.map((entry) => [
      entry.email,
      entry.name || "",
      entry.status,
      formatDate(entry.createdAt),
      formatDate(entry.invitedAt),
      formatDate(entry.registeredAt),
      entry.referralCode || "",
      entry.referredBy || "",
      entry.referralCount.toString(),
      entry.priorityScore.toString(),
      formatDate(entry.lastVisitedAt),
    ]);

    const csv = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${escapeCSV(cell)}"`).join(",")),
    ].join("\n");

    logger.info(
      "Exported waitlist entries to CSV",
      {
        count: entries.length,
      },
      LOG_SOURCE
    );

    // Return CSV as attachment
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="waitlist-export-${
          new Date().toISOString().split("T")[0]
        }.csv"`,
      },
    });
  } catch (error) {
    logger.error(
      "Error exporting waitlist entries",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );

    return NextResponse.json(
      { message: "Failed to export entries" },
      { status: 500 }
    );
  }
}

// Helper function to format dates
function formatDate(date: Date | string | null): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString();
}

// Helper function to escape CSV values
function escapeCSV(value: string): string {
  return value.replace(/"/g, '""');
}
