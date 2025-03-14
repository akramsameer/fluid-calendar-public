import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { requireAdmin } from "@/lib/auth/api-auth";
import { z } from "zod";

const LOG_SOURCE = "TemplatesAPI";

// Validation schema for template updates
const templateUpdateSchema = z.object({
  type: z.enum(["waitlist", "invitation"]),
  template: z.string().min(10),
});

// Validation schema for template preview
const templatePreviewSchema = z.object({
  type: z.enum(["waitlist", "invitation"]),
  template: z.string().min(10),
  sampleData: z
    .object({
      name: z.string().optional(),
      email: z.string().optional(),
      position: z.number().optional(),
      referralCode: z.string().optional(),
      invitationToken: z.string().optional(),
      expirationDate: z.string().optional(),
      customMessage: z.string().optional(),
    })
    .optional(),
});

/**
 * GET /api/waitlist/settings/templates
 * Retrieves email templates
 * Admin-only endpoint
 */
export async function GET(request: NextRequest) {
  try {
    // Check if user is admin
    const authResponse = await requireAdmin(request);
    if (authResponse) return authResponse;

    // Get templates from settings
    const settings = await prisma.betaSettings.findUnique({
      where: { id: "default" },
    });

    if (!settings) {
      return NextResponse.json(
        { message: "Settings not found" },
        { status: 404 }
      );
    }

    logger.info("Templates retrieved successfully", {}, LOG_SOURCE);

    return NextResponse.json({
      waitlistTemplate: settings.waitlistConfirmationTemplate || "",
      invitationTemplate: settings.invitationEmailTemplate || "",
    });
  } catch (error) {
    logger.error(
      "Error retrieving templates",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );

    return NextResponse.json(
      { message: "Failed to retrieve templates" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/waitlist/settings/templates
 * Updates email templates
 * Admin-only endpoint
 */
export async function PUT(request: NextRequest) {
  try {
    // Check if user is admin
    const authResponse = await requireAdmin(request);
    if (authResponse) return authResponse;

    // Parse and validate request body
    const body = await request.json();
    const result = templateUpdateSchema.safeParse(body);

    if (!result.success) {
      logger.warn(
        "Invalid template update request",
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

    const { type, template } = result.data;

    // Update the appropriate template
    const updateData =
      type === "waitlist"
        ? { waitlistConfirmationTemplate: template }
        : { invitationEmailTemplate: template };

    await prisma.betaSettings.update({
      where: { id: "default" },
      data: updateData,
    });

    logger.info(`${type} template updated successfully`, {}, LOG_SOURCE);

    return NextResponse.json({
      message: `${type} template updated successfully`,
    });
  } catch (error) {
    logger.error(
      "Error updating template",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );

    return NextResponse.json(
      { message: "Failed to update template" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/waitlist/settings/templates/preview
 * Generates a preview of an email template with sample data
 * Admin-only endpoint
 */
export async function POST(request: NextRequest) {
  try {
    // Check if user is admin
    const authResponse = await requireAdmin(request);
    if (authResponse) return authResponse;

    // Parse and validate request body
    const body = await request.json();
    const result = templatePreviewSchema.safeParse(body);

    if (!result.success) {
      logger.warn(
        "Invalid template preview request",
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

    const { type, template, sampleData = {} } = result.data;

    // Generate preview based on template type
    let previewHtml = template;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    if (type === "waitlist") {
      // Sample data for waitlist confirmation email
      const name = sampleData.name || "John Doe";
      const position = sampleData.position || 42;
      const referralCode = sampleData.referralCode || "ABC123";
      const email = sampleData.email || "user@example.com";

      const referralLink = `${baseUrl}/beta?ref=${referralCode}`;
      const statusLink = `${baseUrl}/beta/status?email=${encodeURIComponent(
        email
      )}`;

      // Replace template variables
      previewHtml = template
        .replace(/{{name}}/g, name)
        .replace(/{{position}}/g, position.toString())
        .replace(/{{referralLink}}/g, referralLink)
        .replace(/{{statusLink}}/g, statusLink);
    } else {
      // Sample data for invitation email
      const name = sampleData.name || "John Doe";
      const invitationToken = sampleData.invitationToken || "XYZ789";
      const expirationDateStr =
        sampleData.expirationDate ||
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const expirationDate = new Date(expirationDateStr);
      const customMessage = sampleData.customMessage || "";

      const invitationLink = `${baseUrl}/beta/accept?token=${invitationToken}`;
      const formattedDate = expirationDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      // Replace template variables
      previewHtml = template
        .replace(/{{name}}/g, name)
        .replace(/{{invitationLink}}/g, invitationLink)
        .replace(/{{expirationDate}}/g, formattedDate)
        .replace(/{{customMessage}}/g, customMessage);
    }

    logger.info(`Generated ${type} template preview`, {}, LOG_SOURCE);

    return NextResponse.json({
      previewHtml,
    });
  } catch (error) {
    logger.error(
      "Error generating template preview",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );

    return NextResponse.json(
      { message: "Failed to generate template preview" },
      { status: 500 }
    );
  }
}
