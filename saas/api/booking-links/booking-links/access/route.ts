import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { getBookingFeatureAccess } from "@/lib/booking/feature-gating";
import { logger } from "@/lib/logger";

const LOG_SOURCE = "booking-links-access-route";

// GET /api/booking-links/access - Get feature access for booking links
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;
    const access = await getBookingFeatureAccess(userId);

    return NextResponse.json(access);
  } catch (error) {
    logger.error(
      "Failed to fetch booking feature access",
      { error: error instanceof Error ? error.message : String(error) },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to fetch booking feature access" },
      { status: 500 }
    );
  }
}
