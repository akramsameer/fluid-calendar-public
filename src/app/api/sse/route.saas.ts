import { NextRequest, NextResponse } from "next/server";

import {
  clearNotifications,
  getNotifications,
} from "@/saas/jobs/utils/notification";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";

const LOG_SOURCE = "SSE-Route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    // Authenticate the request
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;

    // Set up SSE headers
    const headers = new Headers({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    });

    const stream = new ReadableStream({
      async start(controller) {
        // Send an initial connection established event
        controller.enqueue(
          `data: ${JSON.stringify({ type: "connected" })}\n\n`
        );

        // Set up polling for new notifications
        const intervalId = setInterval(async () => {
          try {
            // Get notifications from Redis
            const notifications = await getNotifications(userId);

            // If there are notifications, send them to the client
            if (notifications.length > 0) {
              for (const notification of notifications) {
                controller.enqueue(`data: ${JSON.stringify(notification)}\n\n`);
              }

              // Clear notifications after sending
              await clearNotifications(userId);
            }

            // Send a heartbeat every 30 seconds to keep the connection alive
            controller.enqueue(`:heartbeat\n\n`);
          } catch (error) {
            logger.error(
              "Error in SSE interval",
              {
                error: error instanceof Error ? error.message : String(error),
                userId,
              },
              LOG_SOURCE
            );
          }
        }, 3000); // Poll every 3 seconds

        // Clean up on client disconnect
        request.signal.addEventListener("abort", () => {
          clearInterval(intervalId);
          controller.close();
          logger.info("SSE connection closed", { userId }, LOG_SOURCE);
        });
      },
    });

    logger.info("SSE connection established", { userId }, LOG_SOURCE);
    return new Response(stream, { headers });
  } catch (error) {
    logger.error(
      "Error establishing SSE connection",
      {
        error: error instanceof Error ? error.message : String(error),
      },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to establish SSE connection" },
      { status: 500 }
    );
  }
}
