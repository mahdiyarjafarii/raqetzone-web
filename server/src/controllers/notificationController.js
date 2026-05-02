import { eq, and, desc } from "drizzle-orm";
import { db } from "../db/index.js";
import { notifications, users } from "../db/schema.js";
import { sendNotification, broadcastNotification } from "../utils/sendNotification.js";

// ─── User endpoints ───────────────────────────────────────────────────────────

export const getNotificationsController = async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = Math.min(parseInt(req.query.limit ?? "50"), 100);

    const rows = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.isPinned), desc(notifications.createdAt))
      .limit(limit);

    const unreadCount = rows.filter((n) => !n.isRead).length;

    return res.status(200).json({ notifications: rows, unreadCount });
  } catch (error) {
    console.error("getNotifications error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

export const getUnreadCountController = async (req, res) => {
  try {
    const userId = req.user.id;
    const rows = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));

    return res.status(200).json({ unreadCount: rows.length });
  } catch (error) {
    console.error("getUnreadCount error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

export const markReadController = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const [updated] = await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
      .returning();

    if (!updated) return res.status(404).json({ message: "اعلان یافت نشد" });
    return res.status(200).json({ notification: updated });
  } catch (error) {
    console.error("markRead error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

export const markAllReadController = async (req, res) => {
  try {
    const userId = req.user.id;
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("markAllRead error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

export const deleteNotificationController = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    await db
      .delete(notifications)
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("deleteNotification error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

// ─── Admin / System endpoints ─────────────────────────────────────────────────

export const sendNotificationController = async (req, res) => {
  try {
    const { userId, title, message, type, isPinned, metadata } = req.body;

    if (!userId || !title || !message) {
      return res.status(400).json({ message: "userId, title و message الزامی هستند" });
    }

    // Verify user exists
    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1);
    if (!user) return res.status(404).json({ message: "کاربر یافت نشد" });

    const notification = await sendNotification(userId, { title, message, type, isPinned, metadata });
    return res.status(201).json({ notification });
  } catch (error) {
    console.error("sendNotification error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

export const broadcastNotificationController = async (req, res) => {
  try {
    const { title, message, type, isPinned, metadata, userIds } = req.body;

    if (!title || !message) {
      return res.status(400).json({ message: "title و message الزامی هستند" });
    }

    const rows = await broadcastNotification(
      { title, message, type, isPinned, metadata },
      userIds ?? null
    );

    return res.status(201).json({ sent: rows.length });
  } catch (error) {
    console.error("broadcastNotification error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};
