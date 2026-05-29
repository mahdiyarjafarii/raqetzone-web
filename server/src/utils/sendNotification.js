import { db } from "../db/index.js";
import { notifications, users } from "../db/schema.js";
import { eq, inArray } from "drizzle-orm";
import { sendSMS } from "./sms.js";

/**
 * Send an in-app notification and an optional SMS to a user.
 *
 * @param {string} userId
 * @param {{ title: string, message: string, type?: string, isPinned?: boolean, metadata?: object, smsText?: string }} payload
 *   smsText  — custom SMS body; if omitted the in-app message is used.
 *              Pass `false` to suppress SMS entirely for this notification.
 */
export async function sendNotification(userId, payload) {
  try {
    // ── 1. persist in-app notification ──────────────────────────────────────
    const [row] = await db
      .insert(notifications)
      .values({
        userId,
        title:     payload.title,
        message:   payload.message,
        type:      payload.type    ?? "SYSTEM",
        isPinned:  payload.isPinned ?? false,
        metadata:  payload.metadata ?? {},
      })
      .returning();

    // ── 2. fire-and-forget SMS ───────────────────────────────────────────────
    if (payload.smsText !== false) {
      db.select({ phone: users.phone })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1)
        .then(([user]) => {
          if (!user?.phone) {
            console.warn(`[SMS] no phone for userId=${userId}`);
            return;
          }
          const body = payload.smsText || `رکت‌زون: ${payload.message}`;
          console.log(`[SMS] → ${user.phone}: ${body.slice(0, 60)}...`);
          sendSMS(user.phone, body)
            .then(ok => console.log(`[SMS] result: ${ok}`))
            .catch(err => console.error("[SMS] error:", err.message));
        })
        .catch(err => console.error("[SMS] db error:", err.message));
    }

    return row;
  } catch (err) {
    console.error("sendNotification error:", err);
    return null;
  }
}

/**
 * Broadcast a notification to all users (or a list of userIds).
 * SMS is NOT sent for broadcasts to avoid bulk spam.
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
          userId:   uid,
          title:    payload.title,
          message:  payload.message,
          type:     payload.type    ?? "SYSTEM",
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
 * Onboarding welcome notification.
 */
export async function sendWelcomeNotification(userId) {
  return sendNotification(userId, {
    title:   "به رکت‌زون خوش اومدی 🎾",
    message: "خوشحالیم که بهمون پیوستی! اولین رزرو زمینت رو با ۲۰٪ تخفیف انجام بده. کد تخفیفت رو ببین 👇",
    type:    "PROMOTION",
    isPinned: true,
    metadata: {
      discountCode: "WELCOME20",
      discountPct:  20,
      ctaHref:  "/mybooking",
      ctaLabel: "رزرو اول رو ثبت کن",
    },
    smsText: "به راکت‌زون خوش اومدی! 🎾 اولین رزرو زمینت رو با ۲۰٪ تخفیف انجام بده. کد تخفیفت: WELCOME20",
  });
}
