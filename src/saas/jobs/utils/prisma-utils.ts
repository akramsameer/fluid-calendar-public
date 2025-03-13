import { PrismaClient } from "@prisma/client";
import { logger } from "@/lib/logger";

const LOG_SOURCE = "PrismaUtils";

// Create a new PrismaClient instance
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: [
      {
        emit: "event",
        level: "query",
      },
      {
        emit: "stdout",
        level: "error",
      },
      {
        emit: "stdout",
        level: "info",
      },
      {
        emit: "stdout",
        level: "warn",
      },
    ],
  });

// Add logging for queries
// @ts-expect-error - Prisma types are not fully compatible with the event system
// eslint-disable-next-line @typescript-eslint/no-explicit-any
prisma.$on("query", (e: any) => {
  logger.debug(`Query: ${e.query}`, { params: e.params }, LOG_SOURCE);
});

// Add the prisma client to the global object in development
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/**
 * Ensure the Prisma client is connected
 */
export async function ensurePrismaConnection(): Promise<void> {
  try {
    // Test the connection by executing a simple query
    await prisma.$queryRaw`SELECT 1`;
    logger.info("Prisma connection established", {}, LOG_SOURCE);
  } catch (error) {
    logger.error(
      "Failed to establish Prisma connection",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );
    throw error;
  }
}

/**
 * Disconnect the Prisma client
 */
export async function disconnectPrisma(): Promise<void> {
  try {
    await prisma.$disconnect();
    logger.info("Prisma connection closed", {}, LOG_SOURCE);
  } catch (error) {
    logger.error(
      "Failed to close Prisma connection",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );
  }
}
