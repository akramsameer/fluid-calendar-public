import { PrismaClient } from "@prisma/client";

// Create a new PrismaClient instance
const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Initialize PrismaClient with proper connection handling
async function createPrismaClient() {
  const client = new PrismaClient({
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client.$on("query", (e: any) => {
    console.debug("[PrismaUtils] Query:", e.query, "Params:", e.params);
  });

  // Ensure connection is properly closed before process exits
  process.on("beforeExit", async () => {
    await client.$disconnect();
    console.log("[PrismaUtils] Disconnected Prisma client before exit");
  });

  return client;
}

export const prisma = globalForPrisma.prisma || (await createPrismaClient());

// Add the prisma client to the global object in development
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/**
 * Ensure the Prisma client is connected
 */
export async function ensurePrismaConnection(): Promise<void> {
  try {
    await prisma.$connect();
    // Test the connection by executing a simple query
    await prisma.$queryRaw`SELECT 1`;
    console.log("[PrismaUtils] Prisma connection established");
  } catch (error) {
    console.error(
      "[PrismaUtils] Failed to establish Prisma connection:",
      error instanceof Error ? error.message : "Unknown error"
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
    console.log("[PrismaUtils] Prisma connection closed");
  } catch (error) {
    console.error(
      "[PrismaUtils] Failed to close Prisma connection:",
      error instanceof Error ? error.message : "Unknown error"
    );
  }
}
