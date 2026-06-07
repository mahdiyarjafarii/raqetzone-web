import { eq, and, gte, lte, desc, asc, sql, count } from "drizzle-orm";
import { db } from "../db/index.js";
import { bookings, courts, users, matches, matchParticipants, notifications, deals } from "../db/schema.js";

function subtractDays(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function dateStr(d) {
  return d.toISOString().split("T")[0];
}

export const getAdminStatsController = async (req, res) => {
  try {
    // ── Booking counts by status
    const allBookings = await db.select({ status: bookings.status, totalPrice: bookings.totalPrice, date: bookings.date, startTime: bookings.startTime, createdAt: bookings.createdAt, courtId: bookings.courtId }).from(bookings);

    const totalBookings   = allBookings.length;
    const pendingCount    = allBookings.filter(b => b.status === "pending").length;
    const approvedCount   = allBookings.filter(b => b.status === "approved").length;
    const rejectedCount   = allBookings.filter(b => b.status === "rejected").length;
    const totalRevenue    = allBookings.filter(b => b.status === "approved").reduce((s, b) => s + (b.totalPrice ?? 0), 0);

    // ── Court counts
    const allCourts = await db.select({ id: courts.id, isActive: courts.isActive }).from(courts);
    const activeCourts = allCourts.filter(c => c.isActive).length;

    // ── User count
    const allUsers = await db.select({ id: users.id }).from(users);
    const totalUsers = allUsers.length;

    // ── Matches
    const totalMatches = (await db.select({ id: matches.id }).from(matches)).length;

    // ── Bookings per day (last 30 days)
    const since30 = subtractDays(30);
    const recentBookings = allBookings.filter(b => new Date(b.createdAt) >= since30);

    const bookingsByDay = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0,0,0,0);
      bookingsByDay[dateStr(d)] = { bookings: 0, revenue: 0 };
    }
    for (const b of recentBookings) {
      const key = dateStr(new Date(b.createdAt));
      if (bookingsByDay[key]) {
        bookingsByDay[key].bookings++;
        if (b.status === "approved") bookingsByDay[key].revenue += b.totalPrice ?? 0;
      }
    }
    const dailyStats = Object.entries(bookingsByDay).map(([date, v]) => ({ date, ...v }));

    // ── Court utilization (approved bookings per court)
    const courtBookings = {};
    for (const b of allBookings.filter(b => b.status === "approved")) {
      courtBookings[b.courtId ?? "unknown"] = (courtBookings[b.courtId ?? "unknown"] || 0) + 1;
    }
    const courtDetails = await db.select({ id: courts.id, name: courts.name, sportType: courts.sportType }).from(courts);
    const courtUtilization = courtDetails.map(c => ({
      id: c.id,
      name: c.name,
      sportType: c.sportType,
      bookings: courtBookings[c.id] ?? 0,
    })).sort((a, b) => b.bookings - a.bookings);

    // ── Peak hours (hour of day -> count)
    const hourCounts = Array(24).fill(0);
    for (const b of allBookings) {
      if (b.startTime) {
        const hour = parseInt(b.startTime.split(":")[0], 10);
        if (!isNaN(hour)) hourCounts[hour]++;
      }
    }
    const peakHours = hourCounts.map((count, hour) => ({ hour: `${String(hour).padStart(2,"0")}:00`, count }));

    // ── Status breakdown for pie
    const statusBreakdown = [
      { status: "approved", count: approvedCount, label: "تأیید شده" },
      { status: "pending",  count: pendingCount,  label: "در انتظار" },
      { status: "rejected", count: rejectedCount, label: "رد شده" },
    ];

    return res.status(200).json({
      overview: { totalBookings, pendingCount, approvedCount, rejectedCount, totalRevenue, activeCourts, totalUsers, totalMatches },
      dailyStats,
      courtUtilization,
      peakHours,
      statusBreakdown,
    });
  } catch (error) {
    console.error("getAdminStats error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

export const getAdminBookingsController = async (req, res) => {
  try {
    const { status, limit = "50", offset = "0" } = req.query;

    const rows = await db
      .select({
        id: bookings.id, date: bookings.date, startTime: bookings.startTime,
        endTime: bookings.endTime, totalPrice: bookings.totalPrice,
        status: bookings.status, notes: bookings.notes, adminNote: bookings.adminNote,
        createdAt: bookings.createdAt,
        user: { id: users.id, name: users.name, phone: users.phone },
        court: { id: courts.id, name: courts.name, location: courts.location, sportType: courts.sportType },
      })
      .from(bookings)
      .innerJoin(courts, eq(bookings.courtId, courts.id))
      .innerJoin(users, eq(bookings.userId, users.id))
      .where(status ? eq(bookings.status, status) : undefined)
      .orderBy(desc(bookings.createdAt))
      .limit(parseInt(limit))
      .offset(parseInt(offset));

    const total = (await db.select({ id: bookings.id }).from(bookings).where(status ? eq(bookings.status, status) : undefined)).length;

    return res.status(200).json({ bookings: rows, total });
  } catch (error) {
    console.error("getAdminBookings error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

export const getAdminCourtsController = async (req, res) => {
  try {
    const rows = await db.select().from(courts).orderBy(asc(courts.name));
    return res.status(200).json({ courts: rows });
  } catch (error) {
    console.error("getAdminCourts error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

export const createAdminCourtController = async (req, res) => {
  try {
    const { name, location, address, surfaceType, sportType, pricePerHour, description, openTime, closeTime, slotDuration } = req.body;
    if (!name || !location || !sportType || !pricePerHour) return res.status(400).json({ message: "اطلاعات ناقص است" });
    const parsedSlotDuration = parseInt(slotDuration ?? "60", 10);
    if (![60, 90].includes(parsedSlotDuration)) {
      return res.status(400).json({ message: "مدت اسلات فقط می‌تواند ۶۰ یا ۹۰ دقیقه باشد" });
    }

    const [court] = await db.insert(courts).values({
      name, location, address, surfaceType, sportType,
      pricePerHour: parseInt(pricePerHour),
      description,
      openTime: openTime ?? "08:00",
      closeTime: closeTime ?? "23:00",
      slotDuration: parsedSlotDuration,
    }).returning();

    return res.status(201).json({ court });
  } catch (error) {
    console.error("createAdminCourt error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

export const updateAdminCourtController = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const allowed = ["name","location","address","surfaceType","sportType","pricePerHour","description","openTime","closeTime","slotDuration","isActive"];
    const clean = Object.fromEntries(Object.entries(updates).filter(([k]) => allowed.includes(k)));
    if (clean.slotDuration !== undefined) {
      const parsedSlotDuration = parseInt(clean.slotDuration, 10);
      if (![60, 90].includes(parsedSlotDuration)) {
        return res.status(400).json({ message: "مدت اسلات فقط می‌تواند ۶۰ یا ۹۰ دقیقه باشد" });
      }
      clean.slotDuration = parsedSlotDuration;
    }
    if (clean.pricePerHour !== undefined) clean.pricePerHour = parseInt(clean.pricePerHour, 10);

    const [court] = await db.update(courts).set(clean).where(eq(courts.id, id)).returning();
    if (!court) return res.status(404).json({ message: "زمین یافت نشد" });

    return res.status(200).json({ court });
  } catch (error) {
    console.error("updateAdminCourt error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

export const deleteAdminCourtController = async (req, res) => {
  try {
    await db.update(courts).set({ isActive: false }).where(eq(courts.id, req.params.id));
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("deleteAdminCourt error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

export const approveBookingController = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminNote } = req.body ?? {};
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1);
    if (!booking) return res.status(404).json({ message: "رزرو یافت نشد" });
    if (booking.status !== "pending") return res.status(400).json({ message: "فقط رزروهای در انتظار قابل بررسی هستند" });

    const [updated] = await db.update(bookings).set({ status: "approved", adminNote: adminNote ?? null, updatedAt: new Date() }).where(eq(bookings.id, id)).returning();

    const { sendNotification } = await import("../utils/sendNotification.js");
    const trackingCode = booking.trackingCode;
    sendNotification(booking.userId, {
      title: "رزرو شما تأیید شد ✅",
      message: `رزرو زمین برای ${booking.date} ساعت ${booking.startTime} تأیید شد.${trackingCode ? ` کد پیگیری: ${trackingCode}` : ""}`,
      type: "BOOKING", isPinned: true,
      metadata: { bookingId: id, trackingCode, ctaHref: trackingCode ? `/booking/track/${trackingCode}` : "/mybooking", ctaLabel: "مشاهده رزرو" },
      smsText: trackingCode
        ? `پلتفرم رکت‌زون: رزرو شما تایید شد. کد پیگیری: ${trackingCode}. به امید دیدار مجدد!`
        : `پلتفرم رکت‌زون: رزرو شما برای ${booking.date} ساعت ${booking.startTime} تایید شد. به امید دیدار مجدد!`,
    }).catch(() => {});

    return res.status(200).json({ booking: updated });
  } catch (error) {
    console.error("approveBooking error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

export const rejectBookingController = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminNote } = req.body ?? {};
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1);
    if (!booking) return res.status(404).json({ message: "رزرو یافت نشد" });
    if (booking.status !== "pending") return res.status(400).json({ message: "فقط رزروهای در انتظار قابل بررسی هستند" });

    const [updated] = await db.update(bookings).set({ status: "rejected", adminNote: adminNote ?? null, updatedAt: new Date() }).where(eq(bookings.id, id)).returning();

    const { sendNotification } = await import("../utils/sendNotification.js");
    sendNotification(booking.userId, {
      title: "رزرو شما رد شد ❌",
      message: `متأسفانه رزرو ${booking.date} ساعت ${booking.startTime} رد شد.${adminNote ? ` دلیل: ${adminNote}` : ""}`,
      type: "BOOKING",
      metadata: { bookingId: id, ctaHref: "/mybooking", ctaLabel: "مشاهده رزروها" },
      smsText: `پلتفرم رکت‌زون: رزرو شما برای ${booking.date} ساعت ${booking.startTime} رد شد.${adminNote ? ` دلیل: ${adminNote}` : ""}`,
    }).catch(() => {});

    return res.status(200).json({ booking: updated });
  } catch (error) {
    console.error("rejectBooking error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

export const getAdminMatchesController = async (req, res) => {
  try {
    const rows = await db.select().from(matches).orderBy(desc(matches.createdAt)).limit(100);
    return res.status(200).json({ matches: rows });
  } catch (error) {
    console.error("getAdminMatches error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

export const getAdminUsersController = async (req, res) => {
  try {
    const rows = await db
      .select({ id: users.id, name: users.name, phone: users.phone, createdAt: users.createdAt, subscriptionType: users.subscriptionType, isAdmin: users.isAdmin })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(100);
    return res.status(200).json({ users: rows });
  } catch (error) {
    console.error("getAdminUsers error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

// ─── Discount / Deals Management ─────────────────────────────────────────────

export const getAdminDealsController = async (req, res) => {
  try {
    const { active } = req.query; // "true" | "false" | undefined = all

    const rows = await db
      .select({
        id: deals.id,
        slotDate: deals.slotDate,
        slotStart: deals.slotStart,
        slotEnd: deals.slotEnd,
        discountPercent: deals.discountPercent,
        validUntil: deals.validUntil,
        isActive: deals.isActive,
        createdAt: deals.createdAt,
        court: {
          id: courts.id,
          name: courts.name,
          location: courts.location,
          sportType: courts.sportType,
          pricePerHour: courts.pricePerHour,
        },
      })
      .from(deals)
      .innerJoin(courts, eq(deals.courtId, courts.id))
      .where(
        active === "true"  ? and(eq(deals.isActive, true),  gte(deals.validUntil, new Date())) :
        active === "false" ? eq(deals.isActive, false) :
        undefined
      )
      .orderBy(asc(deals.validUntil));

    return res.status(200).json({ deals: rows });
  } catch (error) {
    console.error("getAdminDeals error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

export const createAdminDealController = async (req, res) => {
  try {
    const { courtId, slotDate, slotStart, slotEnd, discountPercent, validUntil } = req.body;

    if (!courtId || !slotDate || !slotStart || !slotEnd || !discountPercent || !validUntil) {
      return res.status(400).json({ message: "تمام فیلدها الزامی هستند" });
    }

    if (discountPercent < 5 || discountPercent > 90) {
      return res.status(400).json({ message: "درصد تخفیف باید بین ۵ تا ۹۰ باشد" });
    }

    const [court] = await db.select({ id: courts.id, name: courts.name }).from(courts).where(eq(courts.id, courtId)).limit(1);
    if (!court) return res.status(404).json({ message: "زمین یافت نشد" });

    const parsedUntil = new Date(validUntil);
    if (isNaN(parsedUntil.getTime()) || parsedUntil <= new Date()) {
      return res.status(400).json({ message: "زمان انقضا باید در آینده باشد" });
    }

    const [deal] = await db
      .insert(deals)
      .values({ courtId, slotDate, slotStart, slotEnd, discountPercent: parseInt(discountPercent), validUntil: parsedUntil })
      .returning();

    // Notify all users about the new deal
    const { broadcastNotification } = await import("../utils/sendNotification.js");
    broadcastNotification({
      title: `🔥 آفر ویژه ${discountPercent}% تخفیف — ${court.name}`,
      message: `زمین «${court.name}» برای ${slotDate} ساعت ${slotStart} تا ${slotEnd} با ${discountPercent}٪ تخفیف! تا ${new Date(validUntil).toLocaleString("fa-IR")} فرصت داری.`,
      type: "PROMOTION",
      isPinned: true,
      metadata: { discountCode: null, discountPct: discountPercent, ctaHref: "/mybooking", ctaLabel: "رزرو با تخفیف", dealId: deal.id },
    }).catch(() => {});

    return res.status(201).json({ deal: { ...deal, court } });
  } catch (error) {
    console.error("createAdminDeal error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

export const deleteAdminDealController = async (req, res) => {
  try {
    await db.update(deals).set({ isActive: false }).where(eq(deals.id, req.params.id));
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("deleteAdminDeal error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};
