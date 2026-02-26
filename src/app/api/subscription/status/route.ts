import { NextResponse } from "next/server";

/**
 * Open-source stub for subscription status API.
 * Always returns no active subscription.
 * When SaaS submodule is present, this is replaced via symlink.
 */
export async function GET() {
  return NextResponse.json({
    hasActiveSubscription: false,
    plan: null,
    status: null,
  });
}
