import { NextRequest, NextResponse } from "next/server";
import { isFeatureEnabled } from "@/lib/config";

/**
 * API handler for team management - SAAS-only feature
 */
export async function GET(request: NextRequest) {
  const body = await request.json();
  console.log(body);
  // Check if teams feature is enabled
  if (!isFeatureEnabled("teams")) {
    return NextResponse.json(
      { error: "Teams feature is not enabled" },
      { status: 403 }
    );
  }

  // Mock team data
  const teams = [
    {
      id: "team_1",
      name: "Engineering",
      members: [
        { id: "user_1", name: "John Doe", role: "Admin" },
        { id: "user_2", name: "Jane Smith", role: "Member" },
      ],
    },
    {
      id: "team_2",
      name: "Marketing",
      members: [
        { id: "user_3", name: "Bob Johnson", role: "Admin" },
        { id: "user_4", name: "Alice Williams", role: "Member" },
      ],
    },
  ];

  return NextResponse.json({ teams });
}

export async function POST(request: NextRequest) {
  // Check if teams feature is enabled
  if (!isFeatureEnabled("teams")) {
    return NextResponse.json(
      { error: "Teams feature is not enabled" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();

    // Validate request
    if (!body.name) {
      return NextResponse.json(
        { error: "Team name is required" },
        { status: 400 }
      );
    }

    // Mock creating a team
    const newTeam = {
      id: `team_${Date.now()}`,
      name: body.name,
      members: [],
    };

    return NextResponse.json({ team: newTeam }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
