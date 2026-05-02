import { db } from "../db/index.js";
import { notifications, users } from "../db/schema.js";
import { inArray } from "drizzle-orm";

/**
 * Send a notification to a single user.
 * @param {string} userId
 * @param {{ title: string, message: string, type?: string, isPinned?: boolean, metadata?: object }} payload
 */
export async function sendNotification(userId, payload) {
  try {
    const [row] = await db
      .insert(notifications)
      .values({
        userId,
        title: payload.title,
        message: payload.message,
        type: payload.type ?? "SYSTEM",
        isPinned: payload.isPinned ?? false,
        metadata: payload.metadata ?? {},
      })
      .returning();
    return row;
  } catch (err) {
    console.error("sendNotification error:", err);
    return null;
  }
}

/**
 * Broadcast a notification to all users (or a list of userIds).
 */
export async function broadcastNotification(payload, userIds = null) {
  try {
    let targets = userIds;
    if (!targets) {
      const allUsers = await db.select({ id: users.id }).from(users);
      targets = allUsers.map((u) => u.id);
    }
    if (targets.length === 0) return [];

    const rows = await db
      .insert(notifications)
      .values(
        targets.map((uid) => ({
          userId: uid,
          title: payload.title,
          message: payload.message,
          type: payload.type ?? "SYSTEM",
          isPinned: payload.isPinned ?? false,
          metadata: payload.metadata ?? {},
        }))
      )
      .returning();
    return rows;
  } catch (err) {
    console.error("broadcastNotification error:", err);
    return [];
  }
}

/**
 * Onboarding welcome notification with discount code.
 */
export async function sendWelcomeNotification(userId) {
  return sendNotification(userId, {
    title: "به رکت‌زون خوش اومدی 🎾",
    message:
      "خوشحالیم که بهمون پیوستی! اولین رزرو زمینت رو با ۲۰٪ تخفیف انجام بده. کد تخفیفت رو ببین 👇",
    type: "PROMOTION",
    isPinned: true,
    metadata: {
      discountCode: "WELCOME20",
      discountPct: 20,
      ctaHref: "/booking",
      ctaLabel: "رزرو اول رو ثبت کن",
    },
  });
}
