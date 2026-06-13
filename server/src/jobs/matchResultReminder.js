import { CronJob } from "cron";
import { and, eq, gte, inArray, isNull, lte } from "drizzle-orm";
import { db } from "../db/index.js";
import { matchParticipants, matchResults, matches, users } from "../db/schema.js";
import { sendSMS } from "../utils/sms.js";

const MATCH_DURATION_MINUTES = 90;

async function sendMatchResultReminders() {
  try {
    const now = new Date();

    const scheduledWindowStart = new Date(now.getTime() - (MATCH_DURATION_MINUTES + 5) * 60 * 1000);
    const scheduledWindowEnd = new Date(now.getTime() - MATCH_DURATION_MINUTES * 60 * 1000);

    const targetMatches = await db
      .select()
      .from(matches)
      .where(
        and(
          inArray(matches.status, ["open", "full"]),
          isNull(matches.resultReminderSentAt),
          gte(matches.scheduledAt, scheduledWindowStart),
          lte(matches.scheduledAt, scheduledWindowEnd)
        )
      );

    for (const match of targetMatches) {
      const [existingResult] = await db
        .select({ id: matchResults.id })
        .from(matchResults)
        .where(eq(matchResults.matchId, match.id))
        .limit(1);

      if (existingResult) {
        await db
          .update(matches)
          .set({ resultReminderSentAt: new Date(), updatedAt: new Date() })
          .where(eq(matches.id, match.id));
        continue;
      }

      const participants = await db
        .select({ phone: users.phone, name: users.name })
        .from(matchParticipants)
        .innerJoin(users, eq(matchParticipants.userId, users.id))
        .where(eq(matchParticipants.matchId, match.id));

      if (participants.length === 0) {
        await db
          .update(matches)
          .set({ resultReminderSentAt: new Date(), updatedAt: new Date() })
          .where(eq(matches.id, match.id));
        continue;
      }

      const text = `رکت‌زون: بازی «${match.title}» تمام شد. لطفاً نتیجه را در اپ ثبت و تایید کنید تا امتیازها اعمال شود. 🏆`;
      await Promise.allSettled(participants.filter((p) => p.phone).map((p) => sendSMS(p.phone, text)));

      await db
        .update(matches)
        .set({ resultReminderSentAt: new Date(), updatedAt: new Date() })
        .where(eq(matches.id, match.id));
    }
  } catch (error) {
    console.error("[matchResultReminder] error:", error);
  }
}

new CronJob("*/5 * * * *", sendMatchResultReminders, null, true, "Asia/Tehran");

console.log("✅ Match result reminder job started (every 5 min)");
