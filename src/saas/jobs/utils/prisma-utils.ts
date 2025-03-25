import { PrismaClient } from "@prisma/client";

// Create a new PrismaClient instance
const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined;
};

// Reset global prisma instance at the start of each process
globalForPrisma.prisma = undefined;

// Initialize PrismaClient with proper connection handling
function createPrismaClient() {
  console.log("[PrismaUtils] Creating new Prisma client");

  const client = new PrismaClient({
    log: [
      {
        emit: "stdout",
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

  // Log when client is created
  console.log("[PrismaUtils] Prisma client created successfully");
  return client;
}

// Create or reuse the Prisma client instance
console.log("[PrismaUtils] Initializing Prisma client...");
const prisma = globalForPrisma.prisma || createPrismaClient();
console.log(
  "[PrismaUtils] Using",
  globalForPrisma.prisma ? "existing" : "new",
  "Prisma client"
);

// Call connect explicitly to ensure we have a connection
prisma
  .$connect()
  .then(() => {
    console.log("[PrismaUtils] Initial Prisma connection established");
  })
  .catch((error) => {
    console.error(
      "[PrismaUtils] Failed to establish initial connection:",
      error
    );
  });

// Ensure connection is properly closed on process exit
["SIGINT", "SIGTERM", "beforeExit"].forEach((event) => {
  process.on(event, async () => {
    try {
      console.log(`[PrismaUtils] Process ${event} received, cleaning up...`);
      await prisma.$disconnect();
      console.log("[PrismaUtils] Disconnected Prisma client");
    } catch (error) {
      console.error("[PrismaUtils] Error during cleanup:", error);
    } finally {
      process.exit(event === "beforeExit" ? 0 : 1);
    }
  });
});

// Add the prisma client to the global object in development
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  console.log("[PrismaUtils] Added Prisma client to global scope");
}

export { prisma };

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
