import { eq, or, and, desc, isNull, lt, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { directConversations, directMessages, users } from "../db/schema.js";
import { io, isUserOnline } from "../index.js";

// ── helpers ───────────────────────────────────────────────────────────────────

async function getOrCreateConversation(userAId, userBId) {
  const [existing] = await db
    .select()
    .from(directConversations)
    .where(
      or(
        and(
          eq(directConversations.participantAId, userAId),
          eq(directConversations.participantBId, userBId)
        ),
        and(
          eq(directConversations.participantAId, userBId),
          eq(directConversations.participantBId, userAId)
        )
      )
    )
    .limit(1);

  if (existing) return existing;

  const [created] = await db
    .insert(directConversations)
    .values({ participantAId: userAId, participantBId: userBId })
    .returning();

  return created;
}

// ── controllers ───────────────────────────────────────────────────────────────

export const getConversationsController = async (req, res) => {
  try {
    const userId = req.user.id;

    const convs = await db
      .select({
        id: directConversations.id,
        participantAId: directConversations.participantAId,
        participantBId: directConversations.participantBId,
        lastMessageAt: directConversations.lastMessageAt,
      })
      .from(directConversations)
      .where(
        or(
          eq(directConversations.participantAId, userId),
          eq(directConversations.participantBId, userId)
        )
      )
      .orderBy(desc(directConversations.lastMessageAt));

    const result = await Promise.all(
      convs.map(async (conv) => {
        const otherId = conv.participantAId === userId ? conv.participantBId : conv.participantAId;

        const [other] = await db
          .select({ id: users.id, name: users.name, image: users.image, skillLevel: users.skillLevel })
          .from(users)
          .where(eq(users.id, otherId))
          .limit(1);

        const [lastMsg] = await db
          .select({ content: directMessages.content, senderId: directMessages.senderId, createdAt: directMessages.createdAt })
          .from(directMessages)
          .where(eq(directMessages.conversationId, conv.id))
          .orderBy(desc(directMessages.createdAt))
          .limit(1);

        const [{ count }] = await db
          .select({ count: sql`count(*)`.mapWith(Number) })
          .from(directMessages)
          .where(
            and(
              eq(directMessages.conversationId, conv.id),
              eq(directMessages.senderId, otherId),
              isNull(directMessages.readAt)
            )
          );

        return {
          id: conv.id,
          lastMessageAt: conv.lastMessageAt,
          otherUser: other ? { ...other, isOnline: isUserOnline(other.id) } : other,
          lastMessage: lastMsg ?? null,
          unreadCount: count ?? 0,
        };
      })
    );

    return res.json({ conversations: result });
  } catch (error) {
    console.error("getConversations error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

export const startConversationController = async (req, res) => {
  try {
    const userId = req.user.id;
    const { targetUserId } = req.body;

    if (!targetUserId) return res.status(400).json({ message: "targetUserId الزامی است" });
    if (targetUserId === userId) return res.status(400).json({ message: "نمی‌توانید با خودتان چت کنید" });

    const [target] = await db.select({ id: users.id }).from(users).where(eq(users.id, targetUserId)).limit(1);
    if (!target) return res.status(404).json({ message: "کاربر یافت نشد" });

    const conv = await getOrCreateConversation(userId, targetUserId);
    return res.json({ conversation: conv });
  } catch (error) {
    console.error("startConversation error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

export const getMessagesController = async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;
    const { before, limit = 50 } = req.query;

    const [conv] = await db
      .select()
      .from(directConversations)
      .where(
        and(
          eq(directConversations.id, conversationId),
          or(
            eq(directConversations.participantAId, userId),
            eq(directConversations.participantBId, userId)
          )
        )
      )
      .limit(1);

    if (!conv) return res.status(403).json({ message: "دسترسی ندارید" });

    const otherId = conv.participantAId === userId ? conv.participantBId : conv.participantAId;

    const [other] = await db
      .select({ id: users.id, name: users.name, image: users.image, skillLevel: users.skillLevel })
      .from(users)
      .where(eq(users.id, otherId))
      .limit(1);

    const msgs = await db
      .select({
        id: directMessages.id,
        senderId: directMessages.senderId,
        content: directMessages.content,
        readAt: directMessages.readAt,
        createdAt: directMessages.createdAt,
      })
      .from(directMessages)
      .where(
        before
          ? and(
              eq(directMessages.conversationId, conversationId),
              lt(directMessages.createdAt, new Date(before))
            )
          : eq(directMessages.conversationId, conversationId)
      )
      .orderBy(desc(directMessages.createdAt))
      .limit(Number(limit));

    return res.json({
      messages: msgs.reverse(),
      otherUser: other ? { ...other, isOnline: isUserOnline(other.id) } : null,
    });
  } catch (error) {
    console.error("getMessages error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

export const sendMessageController = async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;
    const { content } = req.body;

    if (!content?.trim()) return res.status(400).json({ message: "پیام نمی‌تواند خالی باشد" });

    const [conv] = await db
      .select()
      .from(directConversations)
      .where(
        and(
          eq(directConversations.id, conversationId),
          or(
            eq(directConversations.participantAId, userId),
            eq(directConversations.participantBId, userId)
          )
        )
      )
      .limit(1);

    if (!conv) return res.status(403).json({ message: "دسترسی ندارید" });

    const [msg] = await db
      .insert(directMessages)
      .values({ conversationId, senderId: userId, content: content.trim() })
      .returning();

    await db
      .update(directConversations)
      .set({ lastMessageAt: new Date() })
      .where(eq(directConversations.id, conversationId));

    const recipientId = conv.participantAId === userId ? conv.participantBId : conv.participantAId;

    io.to(`user:${recipientId}`).emit("new_message", {
      conversationId,
      message: msg,
    });

    return res.json({ message: msg });
  } catch (error) {
    console.error("sendMessage error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

export const markReadController = async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;

    const [conv] = await db
      .select()
      .from(directConversations)
      .where(
        and(
          eq(directConversations.id, conversationId),
          or(
            eq(directConversations.participantAId, userId),
            eq(directConversations.participantBId, userId)
          )
        )
      )
      .limit(1);

    if (!conv) return res.status(403).json({ message: "دسترسی ندارید" });

    const senderId = conv.participantAId === userId ? conv.participantBId : conv.participantAId;

    await db
      .update(directMessages)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(directMessages.conversationId, conversationId),
          eq(directMessages.senderId, senderId),
          isNull(directMessages.readAt)
        )
      );

    return res.json({ ok: true });
  } catch (error) {
    console.error("markRead error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};
