import { CronJob } from "cron";
import { eq, and, gte, lte } from "drizzle-orm";
import { db } from "../db/index.js";
import { bookings, courts, users } from "../db/schema.js";
import { sendSMS } from "../utils/sms.js";
import { formatBookingDateTimeFa } from "../utils/bookingTime.js";

async function sendBookingReminders() {
  try {
    const now = new Date();

    // Window: bookings starting between 115 and 125 minutes from now
    const windowStart = new Date(now.getTime() + 115 * 60 * 1000);
    const windowEnd   = new Date(now.getTime() + 125 * 60 * 1000);

    // Convert to YYYY-MM-DD and HH:mm for DB comparison
    const fmt = (d) => d.toISOString().slice(0, 10);
    const fmtTime = (d) => d.toTimeString().slice(0, 5);

    // Fetch approved bookings that haven't been reminded yet
    const upcoming = await db
      .select({
        id:        bookings.id,
        date:      bookings.date,
        startTime: bookings.startTime,
        endTime:   bookings.endTime,
        phone:     users.phone,
        userName:  users.name,
        courtName: courts.name,
      })
      .from(bookings)
      .innerJoin(users,  eq(bookings.userId,  users.id))
      .innerJoin(courts, eq(bookings.courtId, courts.id))
      .where(
        and(
          eq(bookings.status,       "approved"),
          eq(bookings.reminderSent, false)
        )
      );

    // Filter to the 2-hour window in JS (avoids complex time arithmetic in SQL)
    const targets = upcoming.filter((b) => {
      const bookingDateTime = new Date(`${b.date}T${b.startTime}:00`);
      return bookingDateTime >= windowStart && bookingDateTime <= windowEnd;
    });

    if (targets.length === 0) return;

    console.log(`⏰ Booking reminder: sending ${targets.length} SMS(es)`);

    await Promise.allSettled(
      targets.map(async (b) => {
        if (!b.phone) return;

        const greeting = b.userName ? `${b.userName} عزیز، ` : "";
        const bookingDateTime = formatBookingDateTimeFa(b);
        const text = `رکت‌زون ⏰: ${greeting}رزرو زمین «${b.courtName}» برای ${bookingDateTime} داری. فراموش نکنی! 🎾`;

        await sendSMS(b.phone, text);

        // Mark as reminded
        await db
          .update(bookings)
          .set({ reminderSent: true })
          .where(eq(bookings.id, b.id));

        console.log(`  ✅ Reminder sent → ${b.phone} (booking ${b.id})`);
      })
    );
  } catch (err) {
    console.error("bookingReminder error:", err);
  }
}

// Runs every 5 minutes
new CronJob(
  "*/5 * * * *",
  sendBookingReminders,
  null,
  true,
  "Asia/Tehran"
);

console.log("✅ Booking reminder job started (every 5 min)");
