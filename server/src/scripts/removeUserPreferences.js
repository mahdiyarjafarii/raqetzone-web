/**
 * Script to remove all preferences for a specific phone number
 * 
 * Usage: node src/scripts/removeUserPreferences.js <phone_number>
 * Example: node src/scripts/removeUserPreferences.js 09123456789
 */
import "dotenv/config";
import redis from "../lib/redis.js";

const PREFERENCE_PREFIX = "user-preference";

const PREFERENCE_KEYS = [
  "show-onboarding",
  "usage-hint", 
  "gem-hint",
];

async function removeUserPreferences(phone) {
  if (!phone) {
    console.error("❌ Please provide a phone number");
    console.log("Usage: node src/scripts/removeUserPreferences.js <phone_number>");
    process.exit(1);
  }

  console.log(`🗑️  Removing preferences for phone: ${phone}\n`);

  try {
    const pipeline = redis.pipeline();
    
    for (const key of PREFERENCE_KEYS) {
      const redisKey = `${PREFERENCE_PREFIX}:${phone}:${key}`;
      console.log(`  Deleting: ${redisKey}`);
      pipeline.del(redisKey);
    }

    await pipeline.exec();
    
    console.log(`\n✅ Successfully removed all preferences for ${phone}`);
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await redis.quit();
    process.exit(0);
  }
}

// Get phone from command line args
const phone = process.argv[2];
removeUserPreferences(phone);
