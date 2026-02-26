import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { validateUsername, generateUniqueUsername } from "@/lib/username";
import { usernameSchema } from "@/lib/validations/booking";

const LOG_SOURCE = "user-username-route";

// GET /api/user/username - Get current user's username
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true, email: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      username: user.username,
      hasUsername: !!user.username,
    });
  } catch (error) {
    logger.error(
      "Failed to fetch username",
      { error: error instanceof Error ? error.message : String(error) },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to fetch username" },
      { status: 500 }
    );
  }
}

// PATCH /api/user/username - Update username
export async function PATCH(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;
    const body = await request.json();
    const { username } = body;

    // Validate username format
    const formatResult = usernameSchema.safeParse(username);
    if (!formatResult.success) {
      return NextResponse.json(
        { error: formatResult.error.errors[0].message },
        { status: 400 }
      );
    }

    // Validate username availability
    const validationResult = await validateUsername(username.toLowerCase(), userId);
    if (!validationResult.available) {
      return NextResponse.json(
        { error: validationResult.reason },
        { status: 400 }
      );
    }

    // Update username
    const user = await prisma.user.update({
      where: { id: userId },
      data: { username: username.toLowerCase() },
      select: { username: true },
    });

    logger.info(
      "Username updated",
      { userId, newUsername: user.username },
      LOG_SOURCE
    );

    return NextResponse.json({ username: user.username });
  } catch (error) {
    logger.error(
      "Failed to update username",
      { error: error instanceof Error ? error.message : String(error) },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to update username" },
      { status: 500 }
    );
  }
}

// POST /api/user/username - Generate username from email
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true, email: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // If user already has a username, return it
    if (user.username) {
      return NextResponse.json({ username: user.username });
    }

    // Generate a unique username
    if (!user.email) {
      return NextResponse.json(
        { error: "User email is required to generate username" },
        { status: 400 }
      );
    }

    const newUsername = await generateUniqueUsername(user.email);

    // Save the generated username
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { username: newUsername },
      select: { username: true },
    });

    logger.info(
      "Username generated",
      { userId, username: updatedUser.username },
      LOG_SOURCE
    );

    return NextResponse.json({ username: updatedUser.username });
  } catch (error) {
    logger.error(
      "Failed to generate username",
      { error: error instanceof Error ? error.message : String(error) },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to generate username" },
      { status: 500 }
    );
  }
}
