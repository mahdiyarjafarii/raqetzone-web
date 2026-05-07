import { eq, and, desc } from "drizzle-orm";
import { db } from "../db/index.js";
import { bookings, courts, users } from "../db/schema.js";
import { sendNotification } from "../utils/sendNotification.js";

function timeToMinutes(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

// ─── User endpoints ───────────────────────────────────────────────────────────

export const createBookingController = async (req, res) => {
  try {
    const userId = req.user.id;
    const { courtId, date, startTime, endTime, notes } = req.body;

    if (!courtId || !date || !startTime || !endTime) {
      return res.status(400).json({ message: "اطلاعات ناقص است" });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ message: "فرمت تاریخ نامعتبر است (YYYY-MM-DD)" });
    }

    const startMin = timeToMinutes(startTime);
    const endMin = timeToMinutes(endTime);
    if (endMin <= startMin) {
      return res.status(400).json({ message: "زمان پایان باید بعد از زمان شروع باشد" });
    }

    // Check date is not in the past
    const today = new Date().toISOString().split("T")[0];
    if (date < today) {
      return res.status(400).json({ message: "نمی‌توان برای تاریخ گذشته رزرو کرد" });
    }

    const [court] = await db
      .select()
      .from(courts)
      .where(and(eq(courts.id, courtId), eq(courts.isActive, true)))
      .limit(1);

    if (!court) return res.status(404).json({ message: "زمین یافت نشد" });

    // Prevent double booking — check overlapping active bookings
    const existing = await db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.courtId, courtId),
          eq(bookings.date, date)
        )
      );

    const hasOverlap = existing.some((b) => {
      if (b.status === "rejected" || b.status === "cancelled") return false;
      const bStart = timeToMinutes(b.startTime);
      const bEnd = timeToMinutes(b.endTime);
      return startMin < bEnd && endMin > bStart;
    });

    if (hasOverlap) {
      return res.status(409).json({ message: "این بازه زمانی قبلاً رزرو شده است" });
    }

    const durationHours = (endMin - startMin) / 60;
    const totalPrice = Math.round(court.pricePerHour * durationHours);

    const [booking] = await db
      .insert(bookings)
      .values({ userId, courtId, date, startTime, endTime, durationHours, totalPrice, notes })
      .returning();

    // Notify user of pending booking
    sendNotification(userId, {
      title: "درخواست رزرو ثبت شد ⏳",
      message: `رزرو زمین «${court.name}» برای ${date} ساعت ${startTime} ثبت شد. منتظر تأیید مدیر باشید.`,
      type: "BOOKING",
      metadata: { bookingId: booking.id, courtName: court.name, date, startTime, endTime, ctaHref: "/mybooking", ctaLabel: "مشاهده رزرو" },
    }).catch(() => {});

    const enriched = { ...booking, court };
    return res.status(201).json({ booking: enriched });
  } catch (error) {
    console.error("createBooking error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

export const getMyBookingsController = async (req, res) => {
  try {
    const userId = req.user.id;

    const rows = await db
      .select({
        id: bookings.id,
        date: bookings.date,
        startTime: bookings.startTime,
        endTime: bookings.endTime,
        durationHours: bookings.durationHours,
        totalPrice: bookings.totalPrice,
        status: bookings.status,
        notes: bookings.notes,
        adminNote: bookings.adminNote,
        createdAt: bookings.createdAt,
        court: {
          id: courts.id,
          name: courts.name,
          location: courts.location,
          surfaceType: courts.surfaceType,
          sportType: courts.sportType,
          pricePerHour: courts.pricePerHour,
          image: courts.image,
          managerPhone: courts.managerPhone,
        },
      })
      .from(bookings)
      .innerJoin(courts, eq(bookings.courtId, courts.id))
      .where(eq(bookings.userId, userId))
      .orderBy(desc(bookings.createdAt));

    return res.status(200).json({ bookings: rows });
  } catch (error) {
    console.error("getMyBookings error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

export const cancelBookingController = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const [booking] = await db
      .select()
      .from(bookings)
      .where(and(eq(bookings.id, id), eq(bookings.userId, userId)))
      .limit(1);

    if (!booking) return res.status(404).json({ message: "رزرو یافت نشد" });
    if (booking.status === "approved") {
      return res.status(400).json({ message: "رزرو تأیید شده را نمی‌توان لغو کرد" });
    }

    const [updated] = await db
      .update(bookings)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(bookings.id, id))
      .returning();

    return res.status(200).json({ booking: updated });
  } catch (error) {
    console.error("cancelBooking error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

// ─── Admin endpoints ──────────────────────────────────────────────────────────

export const getAdminBookingsController = async (req, res) => {
  try {
    const { status } = req.query;

    const conditions = [];
    if (status) conditions.push(eq(bookings.status, status));

    const rows = await db
      .select({
        id: bookings.id,
        date: bookings.date,
        startTime: bookings.startTime,
        endTime: bookings.endTime,
        durationHours: bookings.durationHours,
        totalPrice: bookings.totalPrice,
        status: bookings.status,
        notes: bookings.notes,
        adminNote: bookings.adminNote,
        createdAt: bookings.createdAt,
        user: {
          id: users.id,
          name: users.name,
          phone: users.phone,
        },
        court: {
          id: courts.id,
          name: courts.name,
          location: courts.location,
        },
      })
      .from(bookings)
      .innerJoin(courts, eq(bookings.courtId, courts.id))
      .innerJoin(users, eq(bookings.userId, users.id))
      .where(conditions.length ? conditions[0] : undefined)
      .orderBy(desc(bookings.createdAt));

    return res.status(200).json({ bookings: rows });
  } catch (error) {
    console.error("getAdminBookings error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

export const updateBookingStatusController = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNote } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "وضعیت باید approved یا rejected باشد" });
    }

    const [booking] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, id))
      .limit(1);

    if (!booking) return res.status(404).json({ message: "رزرو یافت نشد" });
    if (booking.status !== "pending") {
      return res.status(400).json({ message: "فقط رزروهای در انتظار قابل بررسی هستند" });
    }

    const [updated] = await db
      .update(bookings)
      .set({ status, adminNote: adminNote || null, updatedAt: new Date() })
      .where(eq(bookings.id, id))
      .returning();

    // Notify the booking owner
    const isApproved = status === "approved";
    sendNotification(booking.userId, {
      title: isApproved ? "رزرو شما تأیید شد ✅" : "رزرو شما رد شد ❌",
      message: isApproved
        ? `رزرو زمین برای ${booking.date} ساعت ${booking.startTime} تأیید شد. به موقع حاضر باشید!`
        : `متأسفانه رزرو شما برای ${booking.date} ساعت ${booking.startTime} رد شد.${adminNote ? ` دلیل: ${adminNote}` : ""}`,
      type: "BOOKING",
      isPinned: isApproved,
      metadata: { bookingId: id, date: booking.date, startTime: booking.startTime, ctaHref: "/mybooking", ctaLabel: "مشاهده رزروها" },
    }).catch(() => {});

    return res.status(200).json({ booking: updated });
  } catch (error) {
    console.error("updateBookingStatus error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};
