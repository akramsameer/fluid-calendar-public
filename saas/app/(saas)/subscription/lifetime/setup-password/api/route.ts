import { NextRequest, NextResponse } from "next/server";

import { handleSetupPassword } from "./setupPasswordService";

/**
 * API route to handle password setup for new lifetime users.
 * Accepts POST requests with name, email, and password.
 */
export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json();
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required." },
        { status: 400 }
      );
    }
    // Call the service to handle password setup
    const result = await handleSetupPassword({ name, email, password });
    return NextResponse.json({ success: true, ...result });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
