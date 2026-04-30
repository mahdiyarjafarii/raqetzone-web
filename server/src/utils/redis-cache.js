import { getRedisClient, isRedisAvailable } from "../config/redis.js";
import redisLib from "../lib/redis.js";

/**
 * Default cache TTL in seconds (15 minutes)
 */
const DEFAULT_TTL = 15 * 60; // 900 seconds

/**
 * Get cached data or execute the fetcher function and cache the result
 * This is the main caching utility that wraps database queries
 * 
 * @param {string} cacheKey - Unique key for this cache entry
 * @param {Function} fetcherFunction - Async function that fetches the data from DB
 * @param {number} ttl - Time to live in seconds (default: 15 minutes)
 * @returns {Promise<any>} Cached data or fresh data from fetcher
 */
export const getRedisDataCache = async (cacheKey, fetcherFunction, ttl = DEFAULT_TTL) => {
  try {
    const redis = getRedisClient();
    
    // If Redis is not available, just execute the fetcher function
    if (!redis || !(await isRedisAvailable())) {
      return await fetcherFunction();
    }

    // Try to get cached data
    const cachedData = await redis.get(cacheKey);
    
    if (cachedData) {
      return JSON.parse(cachedData);
    }

    // Cache miss - fetch fresh data
    const freshData = await fetcherFunction();

    // Cache the fresh data
    await redis.setex(cacheKey, ttl, JSON.stringify(freshData));

    return freshData;
  } catch (error) {
    console.error(`❌ Redis cache error for ${cacheKey}:`, error.message);
    // On any error, fall back to executing the fetcher function
    return await fetcherFunction();
  }
};

/**
 * Invalidate (delete) a specific cache key
 * @param {string} cacheKey - The cache key to invalidate
 * @returns {Promise<boolean>} True if deleted, false otherwise
 */
export const invalidateCache = async (cacheKey) => {
  try {
    const redis = getRedisClient();
    
    if (!redis || !(await isRedisAvailable())) {
      return false;
    }

    const result = await redis.del(cacheKey);
    return result > 0;
  } catch (error) {
    console.error(`❌ Error invalidating cache ${cacheKey}:`, error.message);
    return false;
  }
};

/**
 * Invalidate multiple cache keys by pattern
 * @param {string} pattern - Pattern to match keys (e.g., "gpts:*")
 * @returns {Promise<number>} Number of keys deleted
 */
export const invalidateCachePattern = async (pattern) => {
  try {
    const redis = getRedisClient();
    
    if (!redis || !(await isRedisAvailable())) {
      return 0;
    }

    // Find all keys matching the pattern
    const keys = await redis.keys(pattern);
    
    if (keys.length === 0) {
      return 0;
    }

    // Delete all matching keys
    const result = await redis.del(...keys);
    return result;
  } catch (error) {
    console.error(`❌ Error invalidating cache pattern ${pattern}:`, error.message);
    return 0;
  }
};

/**
 * Clear all cache from Redis (use with caution!)
 * This function clears all cached data from both Redis client instances
 * @returns {Promise<{success: boolean, cleared: string[], errors: string[]}>} Result object with success status and details
 */
export const clearAllCache = async () => {
  const result = {
    success: false,
    cleared: [],
    errors: [],
  };

  try {
    // Clear cache from config/redis.js client
    const redis = getRedisClient();
    if (redis && (await isRedisAvailable())) {
      try {
        await redis.flushdb();
        result.cleared.push("config/redis client");
        console.log("✅ Cleared cache from config/redis client");
      } catch (error) {
        const errorMsg = `Failed to clear config/redis client: ${error.message}`;
        result.errors.push(errorMsg);
        console.error(`❌ ${errorMsg}`);
      }
    }

    // Clear cache from lib/redis.js client
    try {
      await redisLib.flushdb();
      result.cleared.push("lib/redis client");
      console.log("✅ Cleared cache from lib/redis client");
    } catch (error) {
      const errorMsg = `Failed to clear lib/redis client: ${error.message}`;
      result.errors.push(errorMsg);
      console.error(`❌ ${errorMsg}`);
    }

    // Consider it successful if at least one client was cleared
    result.success = result.cleared.length > 0;

    if (result.success) {
      console.log(`✅ Successfully cleared cache from ${result.cleared.length} Redis client(s)`);
    } else {
      console.warn("⚠️  No Redis clients were available or cleared");
    }

    return result;
  } catch (error) {
    const errorMsg = `Error clearing cache: ${error.message}`;
    result.errors.push(errorMsg);
    console.error(`❌ ${errorMsg}`);
    return result;
  }
};

/**
 * Get cache statistics
 * @returns {Promise<object>} Cache statistics
 */
export const getCacheStats = async () => {
  try {
    const redis = getRedisClient();
    
    if (!redis || !(await isRedisAvailable())) {
      return { available: false };
    }

    const info = await redis.info("stats");
    const keyspace = await redis.info("keyspace");
    
    return {
      available: true,
      info,
      keyspace,
    };
  } catch (error) {
    console.error(`❌ Error getting cache stats:`, error.message);
    return { available: false, error: error.message };
  }
};

// clearAllCache();