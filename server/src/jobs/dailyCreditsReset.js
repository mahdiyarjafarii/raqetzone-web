import { CronJob } from "cron";
import { isNull } from "drizzle-orm";
import moment from "moment";

import { db } from "../db/index.js";
import { users } from "../db/schema.js";

async function resetDailyCredits() {
  try {
    console.log(`Starting daily credits reset job on ${moment().format("YYYY-MM-DD HH:mm:ss")}`);

    await db
      .update(users)
      .set({
        credits: 10,
        updatedAt: new Date(),
      })
      .where(isNull(users.subscriptionType))
      .returning();

    console.log(`Daily credits reset job completed on ${moment().format("YYYY-MM-DD HH:mm:ss")}`);

    return { success: true };
  } catch (error) {
    console.error("Error in daily credits reset job:", error);
    return { success: false, error: error.message };
  }
}

new CronJob(
  "0 0 * * *", // Cron expression: runs at midnight every day
  async () => {
    console.log("🔄 Starting daily credits reset job...");
    await resetDailyCredits();
  },
  null,
  true,
  "Asia/Tehran"
);

// resetDailyCredits();