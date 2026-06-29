import { CronJob } from "cron";
import { eq, and, lte, inArray } from "drizzle-orm";
import { db } from "../db/index.js";
import { bookings, transactions, walletTransactions } from "../db/schema.js";

const UNPAID_EXPIRY_MINUTES = 10;

async function expireUnpaidBookings() {
  try {
    const cutoff = new Date(Date.now() - UNPAID_EXPIRY_MINUTES * 60 * 1000);

    const expired = await db
      .select({ id: bookings.id })
      .from(bookings)
      .where(
        and(
          eq(bookings.status, "pending"),
          eq(bookings.paymentMethod, "online"),
          eq(bookings.paymentStatus, "unpaid"),
          lte(bookings.createdAt, cutoff)
        )
      );

    if (expired.length === 0) return;

    const ids = expired.map((b) => b.id);

    await db
      .update(bookings)
      .set({ status: "cancelled", adminNote: "پرداخت در زمان مقرر انجام نشد", updatedAt: new Date() })
      .where(inArray(bookings.id, ids));

    await db
      .update(transactions)
      .set({ status: "failed" })
      .where(and(inArray(transactions.bookingId, ids), eq(transactions.status, "pending")));

    await db
      .update(walletTransactions)
      .set({ status: "failed" })
      .where(and(inArray(walletTransactions.referenceId, ids), eq(walletTransactions.referenceType, "booking"), eq(walletTransactions.status, "pending")));

    console.log(`⏱ expireUnpaidBookings: cancelled ${ids.length} unpaid booking(s)`);
  } catch (err) {
    console.error("expireUnpaidBookings error:", err);
  }
}

// Runs every 2 minutes
new CronJob("*/2 * * * *", expireUnpaidBookings, null, true, "Asia/Tehran");

console.log("✅ Expire unpaid bookings job started (every 2 min)");
