import { CronJob } from "cron";
import { and, eq, gte, isNull, lte, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { matchParticipants, matches, users } from "../db/schema.js";
import { broadcastSMS } from "../utils/sms.js";

async function sendMatchFillReminders() {
  try {
    const now = new Date();

    // Window: matches starting between 7h55m and 8h05m from now
    const windowStart = new Date(now.getTime() + (8 * 60 - 5) * 60 * 1000);
    const windowEnd   = new Date(now.getTime() + (8 * 60 + 5) * 60 * 1000);

    const openMatches = await db
      .select()
      .from(matches)
      .where(
        and(
          eq(matches.status, "open"),
          isNull(matches.fillReminderSentAt),
          gte(matches.scheduledAt, windowStart),
          lte(matches.scheduledAt, windowEnd)
        )
      );

    for (const match of openMatches) {
      const participants = await db
        .select({ count: sql`count(*)` })
        .from(matchParticipants)
        .where(eq(matchParticipants.matchId, match.id));

      const currentCount = Number(participants[0]?.count ?? 0);
      const totalSpots = match.teamSize * 2;
      const spotsLeft = totalSpots - currentCount;

      if (spotsLeft <= 0) {
        await db.update(matches).set({ fillReminderSentAt: new Date(), updatedAt: new Date() }).where(eq(matches.id, match.id));
        continue;
      }

      const scheduledAt = new Date(match.scheduledAt);
      const sportLabels = { padel: "پدل", tennis: "تنیس", squash: "اسکواش", badminton: "بدمینتون", "ping-pong": "پینگ‌پنگ" };
      const sportLabel = sportLabels[match.sportType] ?? match.sportType;
      const dateStr = scheduledAt.toLocaleDateString("fa-IR-u-ca-persian", { timeZone: "Asia/Tehran", year: "numeric", month: "long", day: "numeric" });
      const timeStr = scheduledAt.toLocaleTimeString("fa-IR", { timeZone: "Asia/Tehran", hour: "2-digit", minute: "2-digit" });

      const smsText =
        `سلام ورزشکار عزیز 👋\n` +
        `🎾 ما هنوز بازیکن کم داریم و دلمون می‌خواد بیاید بازی کنیم!\n` +
        `برای تکمیل این بازی به ${spotsLeft} بازیکن دیگر نیاز داریم.\n` +
        `🏆 مچ: ${match.title}\n` +
        `🎯 نوع بازی: ${sportLabel}\n` +
        `📍 باشگاه: ${match.location}${match.courtName ? ` - ${match.courtName}` : ''}\n` +
        `📅 ${dateStr}\n` +
        `🕒 ${timeStr}\n` +
        `فقط ۸ ساعت دیگه وقت داری! همین الان وارد اپلیکیشن رکت زون شو و جات رو رزرو کن. 🏃\n` +
        `رکت زون | جامع‌ترین پلتفرم هوشمند ورزش‌های راکتی 🎾`;

      await broadcastSMS(smsText);

      await db
        .update(matches)
        .set({ fillReminderSentAt: new Date(), updatedAt: new Date() })
        .where(eq(matches.id, match.id));

      console.log(`[matchFillReminder] broadcast sent for match ${match.id} (${spotsLeft} spots left)`);
    }
  } catch (err) {
    console.error("[matchFillReminder] error:", err);
  }
}

// Runs every 5 minutes
new CronJob("*/5 * * * *", sendMatchFillReminders, null, true, "Asia/Tehran");

console.log("✅ Match fill reminder job started (every 5 min)");
