import { and, asc, avg, count, desc, eq, gte, sql } from "drizzle-orm";

import { db } from "../db/index.js";
import { users, coachClasses, coachClassEnrollments, coachPrivateSessions, coachReviews, wallets, walletTransactions } from "../db/schema.js";
import { sendNotification } from "../utils/sendNotification.js";
import { ensureWallet } from "./walletController.js";

const ALLOWED_CLASS_LEVELS = new Set(["beginner", "intermediate", "advanced", "all"]);

function toPersianDate(dateStr) {
  try {
    const [y, m, d] = (dateStr ?? "").split("-").map(Number);
    if (!y || !m || !d) return dateStr ?? "";
    return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString("fa-IR-u-ca-persian", {
      timeZone: "Asia/Tehran", weekday: "long", year: "numeric", month: "long", day: "numeric",
    });
  } catch { return dateStr ?? ""; }
}

const generateClassTrackingCode = () =>
  `CLS-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

const getClassSessionMeta = (sessions) => {
  const list = Array.isArray(sessions) ? sessions.filter((s) => s && s.date) : [];
  if (list.length === 0) {
    return { sessionsCount: 0, startDate: null, endDate: null };
  }
  const dates = list.map((s) => s.date).sort();
  return { sessionsCount: list.length, startDate: dates[0], endDate: dates[dates.length - 1] };
};

const mapCoachPublic = (coach) => ({
  id: coach.id,
  name: coach.name,
  firstName: coach.firstName,
  lastName: coach.lastName,
  city: coach.city,
  image: coach.image,
  bio: coach.bio,
  skillLevel: coach.skillLevel,
  favoriteSport: coach.favoriteSport,
  coachVerificationStatus: coach.coachVerificationStatus,
  coachHeadline: coach.coachHeadline,
  coachExperienceYears: coach.coachExperienceYears,
  coachHourlyPrice: coach.coachHourlyPrice,
  coachSpecialties: coach.coachSpecialties,
  coachCertifications: coach.coachCertifications,
  coachLanguages: coach.coachLanguages,
});

const mapCoachClass = (cls) => {
  const sessions = Array.isArray(cls.sessions) ? cls.sessions : [];
  const { sessionsCount, startDate, endDate } = getClassSessionMeta(sessions);
  return {
    id: cls.id,
    coachId: cls.coachId,
    title: cls.title,
    description: cls.description,
    sportType: cls.sportType,
    city: cls.city,
    location: cls.location ?? null,
    level: cls.level ?? "all",
    price: cls.price,
    capacity: cls.capacity,
    enrolledCount: cls.enrolledCount,
    sessions,
    sessionsCount,
    startDate,
    endDate,
    status: cls.status,
    createdAt: cls.createdAt,
    updatedAt: cls.updatedAt,
  };
};

export const getCoachesController = async (_req, res) => {
  try {
    const rows = await db
      .select({
        id: users.id,
        name: users.name,
        firstName: users.firstName,
        lastName: users.lastName,
        city: users.city,
        image: users.image,
        bio: users.bio,
        skillLevel: users.skillLevel,
        favoriteSport: users.favoriteSport,
        coachVerificationStatus: users.coachVerificationStatus,
        coachHeadline: users.coachHeadline,
        coachExperienceYears: users.coachExperienceYears,
        coachHourlyPrice: users.coachHourlyPrice,
        coachSpecialties: users.coachSpecialties,
        coachCertifications: users.coachCertifications,
        coachLanguages: users.coachLanguages,
        activeClassesCount: sql`COUNT(${coachClasses.id})::int`,
      })
      .from(users)
      .leftJoin(
        coachClasses,
        and(eq(coachClasses.coachId, users.id), eq(coachClasses.status, "active"))
      )
      .where(eq(users.isCoach, true))
      .groupBy(users.id)
      .orderBy(desc(sql`COUNT(${coachClasses.id})::int`), asc(users.createdAt));

    return res.status(200).json({ coaches: rows.map(mapCoachPublic) });
  } catch (error) {
    console.error("Get coaches error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

export const getAllClassesController = async (_req, res) => {
  try {
    const rows = await db
      .select({
        id: coachClasses.id,
        coachId: coachClasses.coachId,
        title: coachClasses.title,
        description: coachClasses.description,
        sportType: coachClasses.sportType,
        city: coachClasses.city,
        level: coachClasses.level,
        price: coachClasses.price,
        capacity: coachClasses.capacity,
        enrolledCount: coachClasses.enrolledCount,
        sessions: coachClasses.sessions,
        status: coachClasses.status,
        createdAt: coachClasses.createdAt,
        updatedAt: coachClasses.updatedAt,
        coachUserId: users.id,
        coachName: users.name,
        coachFirstName: users.firstName,
        coachLastName: users.lastName,
        coachCity: users.city,
        coachImage: users.image,
        coachBio: users.bio,
        coachHeadline: users.coachHeadline,
        coachVerificationStatus: users.coachVerificationStatus,
      })
      .from(coachClasses)
      .innerJoin(users, eq(coachClasses.coachId, users.id))
      .where(eq(coachClasses.status, "active"))
      .orderBy(desc(coachClasses.createdAt));

    const classes = rows.map((row) => ({
      ...mapCoachClass(row),
      coach: {
        id: row.coachUserId,
        name: row.coachName,
        firstName: row.coachFirstName,
        lastName: row.coachLastName,
        city: row.coachCity,
        image: row.coachImage,
        bio: row.coachBio,
        coachHeadline: row.coachHeadline,
        coachVerificationStatus: row.coachVerificationStatus,
      },
    }));

    return res.status(200).json({ classes });
  } catch (error) {
    console.error("Get all classes error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

const mapCoachPrivateSession = (row) => ({
  id: row.id,
  coachId: row.coachId,
  userId: row.userId,
  date: row.date,
  startTime: row.startTime,
  endTime: row.endTime,
  location: row.location,
  notes: row.notes,
  status: row.status,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

const mapCoachReview = (row) => ({
  id: row.id,
  coachId: row.coachId,
  userId: row.userId,
  rating: row.rating,
  comment: row.comment,
  coachReply: row.coachReply,
  coachRepliedAt: row.coachRepliedAt,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

export const getCoachReviewsController = async (req, res) => {
  try {
    const { coachId } = req.params;

    const [coach] = await db
      .select({ id: users.id, isCoach: users.isCoach })
      .from(users)
      .where(eq(users.id, coachId))
      .limit(1);

    if (!coach || !coach.isCoach) {
      return res.status(404).json({ message: "مربی یافت نشد" });
    }

    const rows = await db
      .select({
        id: coachReviews.id,
        coachId: coachReviews.coachId,
        userId: coachReviews.userId,
        rating: coachReviews.rating,
        comment: coachReviews.comment,
        coachReply: coachReviews.coachReply,
        coachRepliedAt: coachReviews.coachRepliedAt,
        createdAt: coachReviews.createdAt,
        updatedAt: coachReviews.updatedAt,
        userName: users.name,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        userImage: users.image,
      })
      .from(coachReviews)
      .innerJoin(users, eq(users.id, coachReviews.userId))
      .where(eq(coachReviews.coachId, coachId))
      .orderBy(desc(coachReviews.createdAt));

    const [statsRow] = await db
      .select({ average: avg(coachReviews.rating), total: count() })
      .from(coachReviews)
      .where(eq(coachReviews.coachId, coachId));

    return res.status(200).json({
      reviews: rows.map((item) => ({
        ...mapCoachReview(item),
        user: {
          id: item.userId,
          name: item.userName,
          firstName: item.userFirstName,
          lastName: item.userLastName,
          image: item.userImage,
        },
      })),
      stats: {
        average: statsRow?.average ? parseFloat(Number(statsRow.average).toFixed(1)) : 0,
        total: Number(statsRow?.total ?? 0),
      },
    });
  } catch (error) {
    console.error("Get coach reviews error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

export const upsertCoachReviewController = async (req, res) => {
  try {
    const { coachId } = req.params;
    const userId = req.user.id;
    const ratingRaw = Number(req.body?.rating);
    const comment = typeof req.body?.comment === "string" ? req.body.comment.trim() : "";

    if (!Number.isFinite(ratingRaw) || ratingRaw < 1 || ratingRaw > 5) {
      return res.status(400).json({ message: "امتیاز باید بین ۱ تا ۵ باشد" });
    }

    const [coach] = await db
      .select({ id: users.id, isCoach: users.isCoach })
      .from(users)
      .where(eq(users.id, coachId))
      .limit(1);

    if (!coach || !coach.isCoach) {
      return res.status(404).json({ message: "مربی یافت نشد" });
    }

    if (coach.id === userId) {
      return res.status(400).json({ message: "نمی‌توانید برای خودتان نظر ثبت کنید" });
    }

    const [existing] = await db
      .select()
      .from(coachReviews)
      .where(and(eq(coachReviews.coachId, coachId), eq(coachReviews.userId, userId)))
      .limit(1);

    if (existing) {
      const [updated] = await db
        .update(coachReviews)
        .set({
          rating: Math.round(ratingRaw),
          comment: comment || null,
          updatedAt: new Date(),
        })
        .where(eq(coachReviews.id, existing.id))
        .returning();
      return res.status(200).json({ review: mapCoachReview(updated) });
    }

    const [created] = await db
      .insert(coachReviews)
      .values({
        coachId,
        userId,
        rating: Math.round(ratingRaw),
        comment: comment || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return res.status(201).json({ review: mapCoachReview(created) });
  } catch (error) {
    console.error("Upsert coach review error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

export const getMyCoachReviewsController = async (req, res) => {
  try {
    const currentUser = req.user;

    if (!currentUser?.isCoach) {
      return res.status(403).json({ message: "فقط مربی می‌تواند نظرات خودش را ببیند" });
    }

    const rows = await db
      .select({
        id: coachReviews.id,
        coachId: coachReviews.coachId,
        userId: coachReviews.userId,
        rating: coachReviews.rating,
        comment: coachReviews.comment,
        coachReply: coachReviews.coachReply,
        coachRepliedAt: coachReviews.coachRepliedAt,
        createdAt: coachReviews.createdAt,
        updatedAt: coachReviews.updatedAt,
        userName: users.name,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        userPhone: users.phone,
        userImage: users.image,
      })
      .from(coachReviews)
      .innerJoin(users, eq(users.id, coachReviews.userId))
      .where(eq(coachReviews.coachId, currentUser.id))
      .orderBy(desc(coachReviews.createdAt));

    const [statsRow] = await db
      .select({ average: avg(coachReviews.rating), total: count() })
      .from(coachReviews)
      .where(eq(coachReviews.coachId, currentUser.id));

    return res.status(200).json({
      reviews: rows.map((item) => ({
        ...mapCoachReview(item),
        user: {
          id: item.userId,
          name: item.userName,
          firstName: item.userFirstName,
          lastName: item.userLastName,
          phone: item.userPhone,
          image: item.userImage,
        },
      })),
      stats: {
        average: statsRow?.average ? parseFloat(Number(statsRow.average).toFixed(1)) : 0,
        total: Number(statsRow?.total ?? 0),
      },
    });
  } catch (error) {
    console.error("Get my coach reviews error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

export const replyCoachReviewController = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const currentUser = req.user;
    const reply = typeof req.body?.reply === "string" ? req.body.reply.trim() : "";

    if (!currentUser?.isCoach) {
      return res.status(403).json({ message: "فقط مربی می‌تواند پاسخ ثبت کند" });
    }

    const [review] = await db
      .select()
      .from(coachReviews)
      .where(eq(coachReviews.id, reviewId))
      .limit(1);

    if (!review) {
      return res.status(404).json({ message: "نظر یافت نشد" });
    }

    if (review.coachId !== currentUser.id) {
      return res.status(403).json({ message: "شما به این نظر دسترسی ندارید" });
    }

    const [updated] = await db
      .update(coachReviews)
      .set({
        coachReply: reply || null,
        coachRepliedAt: reply ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(coachReviews.id, reviewId))
      .returning();

    return res.status(200).json({ review: mapCoachReview(updated) });
  } catch (error) {
    console.error("Reply coach review error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

export const createCoachPrivateSessionController = async (req, res) => {
  try {
    const { coachId } = req.params;
    const userId = req.user.id;
    const { date, startTime, endTime, location, notes } = req.body ?? {};

    if (!date || !startTime || !endTime) {
      return res.status(400).json({ message: "تاریخ و بازه زمانی جلسه الزامی است" });
    }

    const [coach] = await db
      .select({ id: users.id, isCoach: users.isCoach })
      .from(users)
      .where(eq(users.id, coachId))
      .limit(1);

    if (!coach || !coach.isCoach) {
      return res.status(404).json({ message: "مربی یافت نشد" });
    }

    if (coach.id === userId) {
      return res.status(400).json({ message: "نمی‌توانید برای خودتان جلسه خصوصی ثبت کنید" });
    }

    const startMin = Number(startTime.slice(0, 2)) * 60 + Number(startTime.slice(3, 5));
    const endMin = Number(endTime.slice(0, 2)) * 60 + Number(endTime.slice(3, 5));
    if (!Number.isFinite(startMin) || !Number.isFinite(endMin) || endMin <= startMin) {
      return res.status(400).json({ message: "بازه زمانی جلسه نامعتبر است" });
    }

    const sameDateSessions = await db
      .select()
      .from(coachPrivateSessions)
      .where(and(eq(coachPrivateSessions.coachId, coachId), eq(coachPrivateSessions.date, date)));

    const hasOverlap = sameDateSessions.some((session) => {
      if (!["pending", "confirmed"].includes(session.status)) return false;
      const sStart = Number(session.startTime.slice(0, 2)) * 60 + Number(session.startTime.slice(3, 5));
      const sEnd = Number(session.endTime.slice(0, 2)) * 60 + Number(session.endTime.slice(3, 5));
      return startMin < sEnd && endMin > sStart;
    });

    if (hasOverlap) {
      return res.status(409).json({ message: "این بازه زمانی برای جلسه خصوصی قبلا رزرو شده است" });
    }

    const [created] = await db
      .insert(coachPrivateSessions)
      .values({
        coachId,
        userId,
        date,
        startTime,
        endTime,
        location: typeof location === "string" ? location.trim() : null,
        notes: typeof notes === "string" ? notes.trim() : null,
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    const timeLabel = `${toPersianDate(created.date)} • ساعت ${created.startTime} تا ${created.endTime}`;

    await Promise.allSettled([
      sendNotification(coachId, {
        title: "درخواست جدید جلسه خصوصی",
        message: `یک کاربر برای ${timeLabel} درخواست جلسه خصوصی ثبت کرده است.`,
        type: "COACH_PRIVATE_SESSION",
        metadata: {
          sessionId: created.id,
          userId,
          date: created.date,
          startTime: created.startTime,
          endTime: created.endTime,
          status: created.status,
          ctaHref: "/coach/management",
          ctaLabel: "مدیریت جلسه",
        },
        smsText: `رکت‌زون: درخواست جدید جلسه خصوصی برای ${timeLabel}. لطفاً از پنل مربی بررسی کنید.`,
      }),
      sendNotification(userId, {
        title: "درخواست جلسه خصوصی ثبت شد",
        message: `درخواست جلسه خصوصی شما برای ${timeLabel} ثبت شد و منتظر تایید مربی است.`,
        type: "COACH_PRIVATE_SESSION",
        metadata: {
          sessionId: created.id,
          coachId,
          date: created.date,
          startTime: created.startTime,
          endTime: created.endTime,
          status: created.status,
          ctaHref: "/coaches",
          ctaLabel: "مشاهده مربی‌ها",
        },
        smsText: false,
      }),
    ]);

    return res.status(201).json({ session: mapCoachPrivateSession(created) });
  } catch (error) {
    console.error("Create coach private session error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

export const getMyCoachPrivateSessionsController = async (req, res) => {
  try {
    const currentUser = req.user;

    if (!currentUser?.isCoach) {
      return res.status(403).json({ message: "فقط مربی می‌تواند جلسات خصوصی را ببیند" });
    }

    const sessions = await db
      .select({
        id: coachPrivateSessions.id,
        coachId: coachPrivateSessions.coachId,
        userId: coachPrivateSessions.userId,
        date: coachPrivateSessions.date,
        startTime: coachPrivateSessions.startTime,
        endTime: coachPrivateSessions.endTime,
        location: coachPrivateSessions.location,
        notes: coachPrivateSessions.notes,
        status: coachPrivateSessions.status,
        createdAt: coachPrivateSessions.createdAt,
        updatedAt: coachPrivateSessions.updatedAt,
        userName: users.name,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        userPhone: users.phone,
        userImage: users.image,
      })
      .from(coachPrivateSessions)
      .innerJoin(users, eq(users.id, coachPrivateSessions.userId))
      .where(eq(coachPrivateSessions.coachId, currentUser.id))
      .orderBy(desc(coachPrivateSessions.date), desc(coachPrivateSessions.startTime));

    return res.status(200).json({
      sessions: sessions.map((item) => ({
        ...mapCoachPrivateSession(item),
        user: {
          id: item.userId,
          name: item.userName,
          firstName: item.userFirstName,
          lastName: item.userLastName,
          phone: item.userPhone,
          image: item.userImage,
        },
      })),
    });
  } catch (error) {
    console.error("Get my coach private sessions error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

export const updateCoachPrivateSessionController = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const currentUser = req.user;

    if (!currentUser?.isCoach) {
      return res.status(403).json({ message: "فقط مربی می‌تواند وضعیت جلسه را تغییر دهد" });
    }

    const [session] = await db
      .select()
      .from(coachPrivateSessions)
      .where(eq(coachPrivateSessions.id, sessionId))
      .limit(1);

    if (!session) {
      return res.status(404).json({ message: "جلسه یافت نشد" });
    }

    if (session.coachId !== currentUser.id) {
      return res.status(403).json({ message: "شما به این جلسه دسترسی ندارید" });
    }

    const allowedStatuses = new Set(["pending", "confirmed", "cancelled", "completed"]);
    const nextStatus = String(req.body?.status || "").trim().toLowerCase();

    if (!allowedStatuses.has(nextStatus)) {
      return res.status(400).json({ message: "وضعیت جلسه نامعتبر است" });
    }

    const [updated] = await db
      .update(coachPrivateSessions)
      .set({
        status: nextStatus,
        updatedAt: new Date(),
      })
      .where(eq(coachPrivateSessions.id, sessionId))
      .returning();

    const statusTextMap = {
      pending: "در انتظار تایید",
      confirmed: "تایید شد",
      cancelled: "لغو شد",
      completed: "انجام شد",
    };

    const statusText = statusTextMap[nextStatus] ?? nextStatus;
    const timeLabel = `${toPersianDate(updated.date)} • ساعت ${updated.startTime} تا ${updated.endTime}`;

    await Promise.allSettled([
      sendNotification(updated.userId, {
        title: "بروزرسانی جلسه خصوصی",
        message: `وضعیت جلسه خصوصی شما (${timeLabel}) توسط مربی به «${statusText}» تغییر کرد.`,
        type: "COACH_PRIVATE_SESSION",
        metadata: {
          sessionId: updated.id,
          coachId: updated.coachId,
          status: nextStatus,
          date: updated.date,
          startTime: updated.startTime,
          endTime: updated.endTime,
          ctaHref: "/coaches",
          ctaLabel: "مشاهده مربی‌ها",
        },
        smsText:
          nextStatus === "confirmed"
            ? `رکت‌زون: جلسه خصوصی شما برای ${timeLabel} توسط مربی تایید شد.`
            : false,
      }),
      sendNotification(updated.coachId, {
        title: "وضعیت جلسه خصوصی ثبت شد",
        message: `وضعیت جلسه خصوصی کاربر (${timeLabel}) به «${statusText}» تغییر کرد.`,
        type: "COACH_PRIVATE_SESSION",
        metadata: {
          sessionId: updated.id,
          userId: updated.userId,
          status: nextStatus,
          date: updated.date,
          startTime: updated.startTime,
          endTime: updated.endTime,
          ctaHref: "/coach/management",
          ctaLabel: "پنل مربی",
        },
        smsText: false,
      }),
    ]);

    return res.status(200).json({ session: mapCoachPrivateSession(updated) });
  } catch (error) {
    console.error("Update coach private session error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

export const getCoachClassEnrollmentsController = async (req, res) => {
  try {
    const { classId } = req.params;
    const currentUser = req.user;

    if (!currentUser?.isCoach) {
      return res.status(403).json({ message: "فقط مربی می‌تواند لیست ثبت‌نامی‌ها را ببیند" });
    }

    const [cls] = await db
      .select()
      .from(coachClasses)
      .where(eq(coachClasses.id, classId))
      .limit(1);

    if (!cls) {
      return res.status(404).json({ message: "کلاس یافت نشد" });
    }

    if (cls.coachId !== currentUser.id) {
      return res.status(403).json({ message: "شما به ثبت‌نامی‌های این کلاس دسترسی ندارید" });
    }

    const enrollments = await db
      .select({
        id: coachClassEnrollments.id,
        status: coachClassEnrollments.status,
        createdAt: coachClassEnrollments.createdAt,
        userId: users.id,
        name: users.name,
        firstName: users.firstName,
        lastName: users.lastName,
        phone: users.phone,
        image: users.image,
        city: users.city,
      })
      .from(coachClassEnrollments)
      .innerJoin(users, eq(users.id, coachClassEnrollments.userId))
      .where(and(eq(coachClassEnrollments.classId, classId), eq(coachClassEnrollments.status, "active")))
      .orderBy(desc(coachClassEnrollments.createdAt));

    return res.status(200).json({
      class: mapCoachClass(cls),
      enrollments,
    });
  } catch (error) {
    console.error("Get coach class enrollments error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

export const getCoachDetailController = async (req, res) => {
  try {
    const { coachId } = req.params;

    const [coach] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, coachId), eq(users.isCoach, true)))
      .limit(1);

    if (!coach) {
      return res.status(404).json({ message: "مربی یافت نشد" });
    }

    const classes = await db
      .select()
      .from(coachClasses)
      .where(and(eq(coachClasses.coachId, coachId), eq(coachClasses.status, "active")))
      .orderBy(desc(coachClasses.createdAt));

    return res.status(200).json({
      coach: mapCoachPublic(coach),
      classes: classes.map(mapCoachClass),
    });
  } catch (error) {
    console.error("Get coach detail error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

export const getMyCoachClassesController = async (req, res) => {
  try {
    const currentUser = req.user;

    if (!currentUser?.isCoach) {
      return res.status(403).json({ message: "فقط مربی می‌تواند کلاس‌های مدیریتی را ببیند" });
    }

    const classes = await db
      .select()
      .from(coachClasses)
      .where(eq(coachClasses.coachId, currentUser.id))
      .orderBy(desc(coachClasses.createdAt));

    return res.status(200).json({
      coach: mapCoachPublic(currentUser),
      classes: classes.map(mapCoachClass),
    });
  } catch (error) {
    console.error("Get my coach classes error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

export const getCoachClassDetailController = async (req, res) => {
  try {
    const { classId } = req.params;

    const [cls] = await db
      .select()
      .from(coachClasses)
      .where(eq(coachClasses.id, classId))
      .limit(1);

    if (!cls) {
      return res.status(404).json({ message: "کلاس یافت نشد" });
    }

    const [coach] = await db
      .select()
      .from(users)
      .where(eq(users.id, cls.coachId))
      .limit(1);

    const [enrollmentCountRow] = await db
      .select({ total: sql`COUNT(*)::int` })
      .from(coachClassEnrollments)
      .where(and(eq(coachClassEnrollments.classId, classId), eq(coachClassEnrollments.status, "active")));

    const enrollmentCount = Number(enrollmentCountRow?.total ?? 0);

    return res.status(200).json({
      class: {
        ...mapCoachClass(cls),
        enrolledCount: enrollmentCount,
      },
      coach: coach ? mapCoachPublic(coach) : null,
    });
  } catch (error) {
    console.error("Get coach class detail error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

export const createCoachClassController = async (req, res) => {
  try {
    const user = req.user;

    if (!user?.isCoach) {
      return res.status(403).json({ message: "فقط مربی می‌تواند کلاس ایجاد کند" });
    }

    const {
      title,
      description,
      sportType = "padel",
      city,
      level = "all",
      price,
      capacity,
      sessions,
    } = req.body ?? {};

    if (!title || typeof title !== "string" || title.trim().length < 3) {
      return res.status(400).json({ message: "عنوان کلاس نامعتبر است" });
    }

    const normalizedLevel = ALLOWED_CLASS_LEVELS.has(String(level)) ? String(level) : "all";

    const parsedPrice = Number.parseInt(String(price).replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d)), 10);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      return res.status(400).json({ message: "قیمت کلاس نامعتبر است" });
    }

    const parsedCapacity = Number.parseInt(String(capacity).replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d)), 10);
    if (!Number.isFinite(parsedCapacity) || parsedCapacity < 1) {
      return res.status(400).json({ message: "ظرفیت کلاس نامعتبر است" });
    }

    const normalizedSessions = Array.isArray(sessions)
      ? sessions.filter((item) => item && item.date && item.startTime && item.endTime)
      : [];

    const [created] = await db
      .insert(coachClasses)
      .values({
        coachId: user.id,
        title: title.trim(),
        description: typeof description === "string" ? description.trim() : null,
        sportType,
        city: typeof city === "string" ? city.trim() : user.city,
        level: normalizedLevel,
        price: parsedPrice,
        capacity: parsedCapacity,
        sessions: normalizedSessions,
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return res.status(201).json({ class: mapCoachClass(created) });
  } catch (error) {
    console.error("Create coach class error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

export const updateCoachClassController = async (req, res) => {
  try {
    const { classId } = req.params;
    const currentUser = req.user;

    if (!currentUser?.isCoach) {
      return res.status(403).json({ message: "فقط مربی می‌تواند کلاس را ویرایش کند" });
    }

    const [cls] = await db
      .select()
      .from(coachClasses)
      .where(eq(coachClasses.id, classId))
      .limit(1);

    if (!cls) {
      return res.status(404).json({ message: "کلاس یافت نشد" });
    }

    if (cls.coachId !== currentUser.id) {
      return res.status(403).json({ message: "شما به این کلاس دسترسی ندارید" });
    }

    const allowedStatuses = new Set(["active", "completed", "cancelled"]);
    const patch = {};

    if (req.body?.status != null) {
      const nextStatus = String(req.body.status).trim().toLowerCase();
      if (!allowedStatuses.has(nextStatus)) {
        return res.status(400).json({ message: "وضعیت کلاس نامعتبر است" });
      }
      patch.status = nextStatus;
    }

    const [countRow] = await db
      .select({ total: sql`COUNT(*)::int` })
      .from(coachClassEnrollments)
      .where(and(eq(coachClassEnrollments.classId, classId), eq(coachClassEnrollments.status, "active")));
    const activeCount = Number(countRow?.total ?? 0);

    if (req.body?.capacity != null) {
      const parsedCapacity = Number.parseInt(req.body.capacity, 10);
      if (!Number.isFinite(parsedCapacity) || parsedCapacity < 1) {
        return res.status(400).json({ message: "ظرفیت کلاس نامعتبر است" });
      }
      if (parsedCapacity < activeCount) {
        return res.status(400).json({
          message: `ظرفیت نمی‌تواند کمتر از تعداد ثبت‌نامی‌های فعال باشد (${activeCount})`,
        });
      }
      patch.capacity = parsedCapacity;
    }

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ message: "فیلد معتبری برای ویرایش ارسال نشده است" });
    }

    const [updated] = await db
      .update(coachClasses)
      .set({
        ...patch,
        enrolledCount: activeCount,
        updatedAt: new Date(),
      })
      .where(eq(coachClasses.id, classId))
      .returning();

    return res.status(200).json({ class: mapCoachClass(updated) });
  } catch (error) {
    console.error("Update coach class error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

export const enrollCoachClassController = async (req, res) => {
  try {
    const { classId } = req.params;
    const userId = req.user.id;

    const [cls] = await db
      .select()
      .from(coachClasses)
      .where(eq(coachClasses.id, classId))
      .limit(1);

    if (!cls || cls.status !== "active") {
      return res.status(404).json({ message: "کلاس فعال یافت نشد" });
    }

    if (cls.coachId === userId) {
      return res.status(400).json({ message: "مربی نمی‌تواند در کلاس خودش ثبت‌نام کند" });
    }

    const [existing] = await db
      .select()
      .from(coachClassEnrollments)
      .where(and(eq(coachClassEnrollments.classId, classId), eq(coachClassEnrollments.userId, userId)))
      .limit(1);

    if (existing && existing.status === "active") {
      return res.status(409).json({ message: "شما قبلا در این کلاس ثبت‌نام کرده‌اید" });
    }

    const [countRow] = await db
      .select({ total: sql`COUNT(*)::int` })
      .from(coachClassEnrollments)
      .where(and(eq(coachClassEnrollments.classId, classId), eq(coachClassEnrollments.status, "active")));

    const activeCount = Number(countRow?.total ?? 0);
    if (activeCount >= cls.capacity) {
      return res.status(400).json({ message: "ظرفیت کلاس تکمیل شده است" });
    }

    const price = Number(cls.price ?? 0);
    const requestedMethod = req.body?.paymentMethod === "wallet" ? "wallet" : "none";

    // Paid classes must be paid from the wallet.
    if (price > 0 && requestedMethod !== "wallet") {
      return res.status(400).json({ message: "برای ثبت‌نام در این کلاس باید از کیف پول پرداخت کنید" });
    }

    const trackingCode = generateClassTrackingCode();

    const result = await db.transaction(async (tx) => {
      let walletAfter = null;

      if (price > 0) {
        const wallet = await ensureWallet(userId, tx);

        const [updatedWallet] = await tx
          .update(wallets)
          .set({ balance: sql`${wallets.balance} - ${price}`, updatedAt: new Date() })
          .where(and(eq(wallets.id, wallet.id), gte(wallets.balance, price)))
          .returning();

        if (!updatedWallet) {
          const error = new Error("موجودی کیف پول کافی نیست");
          error.statusCode = 400;
          throw error;
        }

        walletAfter = updatedWallet;

        await tx.insert(walletTransactions).values({
          walletId: wallet.id,
          userId,
          amount: price,
          direction: "debit",
          type: "class_enrollment",
          status: "completed",
          referenceType: "coach_class",
          referenceId: classId,
          metadata: { classId, trackingCode, title: cls.title },
        });
      }

      const enrollmentValues = {
        status: "active",
        amountPaid: price,
        paymentMethod: price > 0 ? "wallet" : "none",
        paymentStatus: price > 0 ? "paid" : "unpaid",
        trackingCode,
      };

      let enrollment;
      if (existing && existing.status !== "active") {
        [enrollment] = await tx
          .update(coachClassEnrollments)
          .set(enrollmentValues)
          .where(eq(coachClassEnrollments.id, existing.id))
          .returning();
      } else {
        [enrollment] = await tx
          .insert(coachClassEnrollments)
          .values({ classId, userId, createdAt: new Date(), ...enrollmentValues })
          .returning();
      }

      await tx
        .update(coachClasses)
        .set({ enrolledCount: activeCount + 1, updatedAt: new Date() })
        .where(eq(coachClasses.id, classId));

      return { enrollment, walletAfter };
    });

    const { startDate, endDate, sessionsCount } = getClassSessionMeta(cls.sessions);

    const [enrollingUser] = await db
      .select({ name: users.name, phone: users.phone })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const userName = enrollingUser?.name?.trim() || "یک بازیکن";

    sendNotification(cls.coachId, {
      title: "ثبت‌نام جدید در کلاس 🎉",
      message: `${userName} در کلاس «${cls.title}» ثبت‌نام کرد.`,
      type: "COACH_CLASS_ENROLLMENT",
      metadata: { classId, enrollmentId: result.enrollment.id, ctaHref: "/coach/management", ctaLabel: "پنل مربی" },
      smsText: `رکت‌زون: ${userName} در کلاس «${cls.title}» ثبت‌نام کرد. برای مدیریت وارد پنل مربی شوید.`,
    }).catch(() => {});

    sendNotification(userId, {
      title: "ثبت‌نام موفق در کلاس",
      message: `ثبت‌نام شما در کلاس «${cls.title}» با موفقیت انجام شد.`,
      type: "COACH_CLASS_ENROLLMENT",
      metadata: { classId, enrollmentId: result.enrollment.id, ctaHref: "/coaches", ctaLabel: "مربی‌ها" },
      smsText: startDate
        ? `رکت‌زون: ثبت‌نام شما در کلاس «${cls.title}» تایید شد. اولین جلسه: ${toPersianDate(new Date(startDate))}.`
        : `رکت‌زون: ثبت‌نام شما در کلاس «${cls.title}» با موفقیت انجام شد.`,
    }).catch(() => {});

    return res.status(200).json({
      message: "ثبت‌نام کلاس با موفقیت انجام شد",
      receipt: {
        trackingCode,
        classId,
        title: cls.title,
        sportType: cls.sportType,
        city: cls.city,
        level: cls.level ?? "all",
        amountPaid: price,
        paymentMethod: price > 0 ? "wallet" : "none",
        paymentStatus: price > 0 ? "paid" : "unpaid",
        startDate,
        endDate,
        sessionsCount,
        createdAt: result.enrollment.createdAt,
      },
      wallet: result.walletAfter,
    });
  } catch (error) {
    console.error("Enroll coach class error:", error);
    return res.status(error.statusCode ?? 500).json({ message: error.statusCode ? error.message : "خطای سرور" });
  }
};
