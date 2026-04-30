/**
 * Migration script to set default preferences for all existing users
 * 
 * This script sets show-onboarding, usage-hint, and gem-hint to FALSE
 * for all existing users (meaning they've already seen these popups).
 * 
 * Preference logic:
 *   - true  = show the popup (new users)
 *   - false = don't show the popup (user has dismissed it)
 * 
 * Run with: node src/scripts/migrateUserPreferences.js
 */
import "dotenv/config";

import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import redis from "../lib/redis.js";

// Preference keys (must match frontend PREFERENCE_KEYS)
const PREFERENCE_KEYS = {
  SHOW_ONBOARDING: "show-onboarding",
  USAGE_HINT: "usage-hint",
  GEM_HINT: "gem-hint",
};

// Redis key prefix for user preferences
const PREFERENCE_PREFIX = "user-preference";

/**
 * Build Redis key for user preference
 * @param {string} phone - User phone number
 * @param {string} key - Preference key
 * @returns {string} Redis key
 */
const buildKey = (phone, key) => `${PREFERENCE_PREFIX}:${phone}:${key}`;

async function migrateUserPreferences() {
  console.log("🚀 Starting user preferences migration...\n");

  try {
    // Fetch all users from database
    const allUsers = await db.select({ phone: users.phone }).from(users);
    
    console.log(`📊 Found ${allUsers.length} users in database\n`);

    if (allUsers.length === 0) {
      console.log("No users found. Migration complete.");
      process.exit(0);
    }

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    // Process users in batches for better performance
    const batchSize = 100;
    const batches = Math.ceil(allUsers.length / batchSize);

    for (let i = 0; i < batches; i++) {
      const start = i * batchSize;
      const end = Math.min(start + batchSize, allUsers.length);
      const batch = allUsers.slice(start, end);

      console.log(`Processing batch ${i + 1}/${batches} (users ${start + 1}-${end})...`);

      // Use Redis pipeline for better performance
      const pipeline = redis.pipeline();

      for (const user of batch) {
        if (!user.phone) {
          skipCount++;
          continue;
        }

        // Set all three preferences to "false" (don't show popups for existing users)
        pipeline.set(buildKey(user.phone, PREFERENCE_KEYS.SHOW_ONBOARDING), "false");
        pipeline.set(buildKey(user.phone, PREFERENCE_KEYS.USAGE_HINT), "false");
        pipeline.set(buildKey(user.phone, PREFERENCE_KEYS.GEM_HINT), "false");
        
        successCount++;
      }

      try {
        await pipeline.exec();
        console.log(`  ✅ Batch ${i + 1} completed`);
      } catch (error) {
        console.error(`  ❌ Error in batch ${i + 1}:`, error.message);
        errorCount += batch.length;
        successCount -= batch.length;
      }
    }

    console.log("\n" + "=".repeat(50));
    console.log("📈 Migration Summary:");
    console.log("=".repeat(50));
    console.log(`✅ Successfully migrated: ${successCount} users`);
    console.log(`⏭️  Skipped (no phone): ${skipCount} users`);
    console.log(`❌ Errors: ${errorCount} users`);
    console.log("=".repeat(50));
    console.log("\n✨ Migration complete!\n");

  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    // Close Redis connection
    await redis.quit();
    process.exit(0);
  }
}

// Run the migration
migrateUserPreferences();
