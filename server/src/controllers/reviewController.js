import { eq, and, desc, avg, count } from "drizzle-orm";
import { db } from "../db/index.js";
import { clubReviews, users, clubs } from "../db/schema.js";

// ── Public: list reviews for a club ──────────────────────────────────────────

export const getClubReviewsController = async (req, res) => {
  try {
    const { clubId } = req.params;

    const rows = await db
      .select({
        id: clubReviews.id,
        rating: clubReviews.rating,
        comment: clubReviews.comment,
        ownerReply: clubReviews.ownerReply,
        ownerRepliedAt: clubReviews.ownerRepliedAt,
        createdAt: clubReviews.createdAt,
        user: {
          id: users.id,
          name: users.name,
          firstName: users.firstName,
          lastName: users.lastName,
          image: users.image,
        },
      })
      .from(clubReviews)
      .innerJoin(users, eq(clubReviews.userId, users.id))
      .where(eq(clubReviews.clubId, clubId))
      .orderBy(desc(clubReviews.createdAt));

    const stats = await db
      .select({ avg: avg(clubReviews.rating), total: count() })
      .from(clubReviews)
      .where(eq(clubReviews.clubId, clubId));

    return res.json({
      reviews: rows,
      stats: {
        average: stats[0]?.avg ? parseFloat(Number(stats[0].avg).toFixed(1)) : 0,
        total: Number(stats[0]?.total ?? 0),
      },
    });
  } catch (error) {
    console.error("getClubReviews error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

// ── Auth: submit / update review ─────────────────────────────────────────────

export const upsertClubReviewController = async (req, res) => {
  try {
    const { clubId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user.id;

    if (!rating || rating < 1 || rating > 5)
      return res.status(400).json({ message: "امتیاز باید بین ۱ تا ۵ باشد" });

    const [existing] = await db
      .select()
      .from(clubReviews)
      .where(and(eq(clubReviews.clubId, clubId), eq(clubReviews.userId, userId)))
      .limit(1);

    if (existing) {
      const [updated] = await db
        .update(clubReviews)
        .set({ rating, comment: comment || null, updatedAt: new Date() })
        .where(eq(clubReviews.id, existing.id))
        .returning();
      return res.json({ review: updated });
    }

    const [created] = await db
      .insert(clubReviews)
      .values({ clubId, userId, rating, comment: comment || null })
      .returning();
    return res.status(201).json({ review: created });
  } catch (error) {
    console.error("upsertClubReview error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

// ── Auth: delete own review ───────────────────────────────────────────────────

export const deleteClubReviewController = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const [review] = await db.select().from(clubReviews).where(eq(clubReviews.id, id)).limit(1);
    if (!review) return res.status(404).json({ message: "نظر یافت نشد" });
    if (review.userId !== userId && !req.user.isAdmin)
      return res.status(403).json({ message: "دسترسی غیرمجاز" });

    await db.delete(clubReviews).where(eq(clubReviews.id, id));
    return res.json({ ok: true });
  } catch (error) {
    console.error("deleteClubReview error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

// ── Club Panel: reply to a review ────────────────────────────────────────────

export const replyToReviewController = async (req, res) => {
  try {
    const { id } = req.params;
    const { reply } = req.body;

    const [review] = await db
      .select({ id: clubReviews.id, clubId: clubReviews.clubId })
      .from(clubReviews)
      .where(eq(clubReviews.id, id))
      .limit(1);
    if (!review) return res.status(404).json({ message: "نظر یافت نشد" });

    // Verify ownership
    const [club] = await db.select({ ownerId: clubs.ownerId }).from(clubs).where(eq(clubs.id, review.clubId)).limit(1);
    if (!req.user.isAdmin && club?.ownerId !== req.user.id)
      return res.status(403).json({ message: "دسترسی غیرمجاز" });

    const [updated] = await db
      .update(clubReviews)
      .set({ ownerReply: reply || null, ownerRepliedAt: reply ? new Date() : null, updatedAt: new Date() })
      .where(eq(clubReviews.id, id))
      .returning();
    return res.json({ review: updated });
  } catch (error) {
    console.error("replyToReview error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};
