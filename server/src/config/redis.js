import Redis from "ioredis";

import { config } from "./env.js";

/**
 * Redis client instance
 * Connection is lazy - only connects when first command is issued
 */
let redisClient = null;

/**
 * Get or create Redis client
 * @returns {Redis} Redis client instance
 */
export const getRedisClient = () => {
  if (!redisClient) {
    try {
      // Create Redis client with configuration
      redisClient = new Redis({
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
        db: config.redis.db,
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          // Reconnect after
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        lazyConnect: true, // Don't connect immediately
        enableOfflineQueue: false, // Don't queue commands when offline
      });

      // Connection event handlers
      redisClient.on("connect", () => {
        console.log("✅ Redis client connected");
      });

      redisClient.on("error", (err) => {
        console.error("❌ Redis client error:", err.message);
      });

      redisClient.on("close", () => {
        console.log("⚠️  Redis connection closed");
      });

      // Attempt to connect
      redisClient.connect().catch((err) => {
        console.error("❌ Failed to connect to Redis:", err.message);
        console.log("⚠️  Continuing without Redis cache...");
      });
    } catch (error) {
      console.error("❌ Error creating Redis client:", error.message);
      console.log("⚠️  Continuing without Redis cache...");
      return null;
    }
  }

  return redisClient;
};

/**
 * Check if Redis is available and connected
 * @returns {boolean} True if Redis is connected
 */
export const isRedisAvailable = async () => {
  const client = getRedisClient();
  if (!client) return false;

  try {
    await client.ping();
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Close Redis connection (useful for graceful shutdown)
 */
export const closeRedis = async () => {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    console.log("✅ Redis connection closed");
  }
};

