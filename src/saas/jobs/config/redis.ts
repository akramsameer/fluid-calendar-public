import { Redis } from "ioredis";

const LOG_SOURCE = "RedisConfig";

// Redis connection configuration
const redisConfig = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379", 10),
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  retryStrategy: (times: number) => {
    // Exponential backoff with max 10 second delay
    const delay = Math.min(Math.pow(2, times) * 100, 10000);
    console.log(
      `Redis connection retry in ${delay}ms`,
      { attempt: times },
      LOG_SOURCE
    );
    return delay;
  },
};

// Create a Redis connection
let redisClient: Redis | null = null;

/**
 * Get a Redis client instance
 * Creates a new connection if one doesn't exist
 */
export function getRedisClient(): Redis {
  if (!redisClient) {
    console.log(
      "Creating new Redis connection",
      { host: redisConfig.host, port: redisConfig.port },
      LOG_SOURCE
    );
    redisClient = new Redis(redisConfig);

    redisClient.on("connect", () => {
      console.log("Redis connected", {}, LOG_SOURCE);
    });

    redisClient.on("error", (error) => {
      console.error(
        "Redis connection error",
        { error: error instanceof Error ? error.message : "Unknown error" },
        LOG_SOURCE
      );
    });

    redisClient.on("close", () => {
      console.warn("Redis connection closed", {}, LOG_SOURCE);
      redisClient = null;
    });
  }

  return redisClient;
}

/**
 * Get Redis connection options for BullMQ
 */
export function getRedisOptions() {
  return {
    connection: redisConfig,
  };
}

/**
 * Close the Redis connection
 */
export async function closeRedisConnection(): Promise<void> {
  if (redisClient) {
    console.log("Closing Redis connection", {}, LOG_SOURCE);
    await redisClient.quit();
    redisClient = null;
  }
}

export default redisConfig;
