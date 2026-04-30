import Redis from "ioredis";

import { config } from "../config/env.js";

// Create Redis connection
const redis = new Redis({
  host: config.redis.host || "localhost",
  port: config.redis.port || 6379,
  password: config.redis.password || undefined,
  db: config.redis.db || 0,
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
});

redis.on("connect", () => {
  console.log("✅ Redis connected successfully");
});

redis.on("error", (error) => {
  console.error("❌ Redis connection error:", error);
});

redis.on("ready", () => {
  console.log("🚀 Redis is ready to accept commands");
});

export default redis;
