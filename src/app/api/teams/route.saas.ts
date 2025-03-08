import { NextRequest } from "next/server";

/**
 * Teams API route handler
 * SAAS-only implementation
 */
export async function GET(request: NextRequest) {
  // Dynamically import the SAAS implementation
  const { GET: saasGetHandler } = await import("@/saas/api/team-api");
  return saasGetHandler(request);
}

export async function POST(request: NextRequest) {
  // Dynamically import the SAAS implementation
  const { POST: saasPostHandler } = await import("@/saas/api/team-api");
  return saasPostHandler(request);
}
