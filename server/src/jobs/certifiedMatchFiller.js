import { CronJob } from "cron";
import { eq, and, gte, lte, notInArray } from "drizzle-orm";
import { db } from "../db/index.js";
import { matches, matchParticipants, users } from "../db/schema.js";
import { sendSMS } from "../utils/sms.js";

async function fillCertifiedMatches() {
  try {
    const now = new Date();
    // Window: certified matches starting between 115–125 min from now
    const windowStart = new Date(now.getTime() + 115 * 60 * 1000);
    const windowEnd   = new Date(now.getTime() + 125 * 60 * 1000);

    const upcoming = await db
      .select()
      .from(matches)
      .where(
        and(
          eq(matches.isCertified, true),
          eq(matches.status, "open"),
          gte(matches.scheduledAt, windowStart),
          lte(matches.scheduledAt, windowEnd),
        )
      );

    for (const match of upcoming) {
      const participants = await db
        .select({ userId: matchParticipants.userId })
        .from(matchParticipants)
        .where(eq(matchParticipants.matchId, match.id));

      const filledSlots = participants.length;
      const totalSlots = match.teamSize * 2;
      if (filledSlots >= totalSlots) continue;

      const excludeIds = participants.map((p) => p.userId);

      const candidates = await db
        .select({ phone: users.phone, name: users.name })
        .from(users)
        .where(excludeIds.length > 0 ? notInArray(users.id, excludeIds) : undefined)
        .limit(50);

      const sportsLabel = {
        padel: "پادل", tennis: "تنیس", squash: "اسکواش",
        badminton: "بدمینتون", "ping-pong": "پینگ‌پنگ",
      };
      const smsText =
        `🛡️ مچ گارانتی‌شده رکت‌زون!\n` +
        `«${match.title}» در ${match.location} نیاز به بازیکن ${sportsLabel[match.sportType] ?? match.sportType} دارد.\n` +
        `${totalSlots - filledSlots} جای خالی مانده — رکت‌زون رو باز کن!`;

      await Promise.allSettled(candidates.map((u) => sendSMS(u.phone, smsText)));
      console.log(`[certifiedMatchFiller] match ${match.id}: notified ${candidates.length} candidates`);
    }
  } catch (err) {
    console.error("[certifiedMatchFiller] error:", err);
  }
}

new CronJob("*/5 * * * *", fillCertifiedMatches, null, true, "Asia/Tehran");

console.log("✅ Certified match filler job started (every 5 min)");
