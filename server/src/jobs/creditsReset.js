import { CronJob } from "cron";

import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { and, lt, gt, eq } from "drizzle-orm";
import getSubscriptionType from "../utils/credits/getSubscriptionType.js";

async function resetCredits() {
  try {
    const now = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    // Find users:
    const eligibleUsers = await db
      .select()
      .from(users)
      .where(
        and(
          lt(users.lastResetCreditsDate, oneMonthAgo),
          gt(users.subscriptionEndDate, now)
        )
      );

    if (eligibleUsers.length === 0) {
      console.log("No users eligible for monthly credits reset");
      return { success: true };
    }

    // Process each user individually to set appropriate credits based on subscription type
    for (const user of eligibleUsers) {
      // Determine if user is on free trial (subscriptionType is null or empty)
      const isFreeTrial =
        !user.subscriptionType || user.subscriptionType.trim() === "";

      // Get subscription info
      const subscriptionInfo = getSubscriptionType(
        user.subscriptionType,
        isFreeTrial
      );

      if (!subscriptionInfo) {
        console.warn(
          `User ${user.id} has invalid subscription type: ${user.subscriptionType}`
        );
        continue;
      }

      // Update user credits and lastResetCreditsDate
      await db
        .update(users)
        .set({
          credits: subscriptionInfo.credits,
          lastResetCreditsDate: now,
          updatedAt: now,
        })
        .where(eq(users.id, user.id));

    }


    return { success: true };
  } catch (error) {
    console.error("Error in monthly credits reset job:", error);
    return { success: false, error: error.message };
  }
}

export function initializeCreditsReset() {
  new CronJob(
    "0 * * * *",
    async () => {
      await resetCredits();
    },
    null,
    true,
    "Asia/Tehran"
  );
}
