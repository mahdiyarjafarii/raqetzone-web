import redis from "../lib/redis.js";
import { config } from "../config/env.js";

// Redis key prefix for user preferences
const PREFERENCE_PREFIX = "user-preference";

/**
 * Build Redis key for user preference
 * @param {string} phone - User phone number
 * @param {string} key - Preference key
 * @returns {string} Redis key
 */
const buildKey = (phone, key) => `${PREFERENCE_PREFIX}:${phone}:${key}`;

/**
 * Get user preference value
 * GET /api/preference/:key
 */
export const getPreferenceController = async (req, res) => {
  try {
    const { key } = req.params;
    const phone = req.user.phone;

    if (!key) return res.status(400).json({ message: "کلید موردنظر ارسال نشده است" });

    const redisKey = buildKey(phone, key);
    const value = await redis.get(redisKey);

    // If no value exists in Redis, the user hasn't seen/done this yet
    return res.status(200).json({
      key,
      value: value === "true" ? true : value === "false" ? false : value,
      exists: value !== null,
    });
  } catch (error) {
    console.error("Get preference error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

/**
 * Set user preference value
 * POST /api/preference/:key
 */
export const setPreferenceController = async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    const phone = req.user.phone;

    if (!key) return res.status(400).json({ message: "کلید موردنظر ارسال نشده است" });

    if (value === undefined) return res.status(400).json({ message: "مقدار ارسال نشده است" });

    const redisKey = buildKey(phone, key);
    
    // Convert boolean to string for Redis storage
    const stringValue = typeof value === "boolean" ? String(value) : value;
    
    // Store the value in Redis (no expiration - persistent)
    await redis.set(redisKey, stringValue);

    return res.status(200).json({
      key,
      value,
      success: true,
    });
  } catch (error) {
    console.error("Set preference error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

/**
 * Get multiple user preferences
 * POST /api/preferences/batch
 */
export const getBatchPreferencesController = async (req, res) => {
  try {
    const { keys } = req.body;
    const phone = req.user.phone;

    if (!keys || !Array.isArray(keys) || keys.length === 0) 
      return res.status(400).json({ message: "کلیدهای موردنظر ارسال نشده است" });

    const results = {};
    
    // Use pipeline for better performance
    const pipeline = redis.pipeline();
    keys.forEach(key => {
      pipeline.get(buildKey(phone, key));
    });
    
    const values = await pipeline.exec();
    
    keys.forEach((key, index) => {
      const value = values[index][1]; // Pipeline returns [error, result]
      results[key] = {
        value: value === "true" ? true : value === "false" ? false : value,
        exists: value !== null,
      };
    });

    return res.status(200).json({ preferences: results });
  } catch (error) {
    console.error("Get batch preferences error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

// List of all preference keys that can be removed
const PREFERENCE_KEYS = [
  "show-onboarding",
  "usage-hint", 
  "gem-hint",
];

/**
 * Remove all preferences for a specific phone number
 * DELETE /api/preferences/admin
 * Secured with JWT_SECRET as Bearer token
 */
export const removeAllPreferencesController = async (req, res) => {
  try {
    if (config.jwtSecret !== req.query.jwtSecret) {
      return res.status(403).json({ message: "دسترسی غیرمجاز" });
    }

    // Get phone from request body
    const { phone } = req.query;
    if (!phone) {
      return res.status(400).json({ message: "شماره تلفن ارسال نشده است" });
    }

    const pipeline = redis.pipeline();
    
    for (const key of PREFERENCE_KEYS) {
      pipeline.del(buildKey(phone, key));
    }

    await pipeline.exec();

    return res.status(200).json({
      success: true,
      message: `تمام تنظیمات برای ${phone} با موفقیت حذف شد`,
      phone,
      deletedKeys: PREFERENCE_KEYS,
    });
  } catch (error) {
    console.error("Remove all preferences error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};
