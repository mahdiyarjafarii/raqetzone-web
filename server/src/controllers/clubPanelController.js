import { eq, and, desc, inArray, count, sum, gte, lte, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { clubs, courts, bookings, users, slotOverrides, tournaments, tournamentRegistrations, deals } from "../db/schema.js";
import { sendNotification } from "../utils/sendNotification.js";

// ── helpers ───────────────────────────────────────────────────────────────────

function ownerFilter(req) {
  // Super-admin sees everything; club owner is scoped to their own clubs
  return req.user.isAdmin ? undefined : req.user.id;
}

async function assertClubOwnership(req, clubId) {
  if (req.user.isAdmin) return true;
  const [club] = await db
    .select({ id: clubs.id })
    .from(clubs)
    .where(and(eq(clubs.id, clubId), eq(clubs.ownerId, req.user.id)))
    .limit(1);
  return !!club;
}

async function assertCourtOwnership(req, courtId) {
  if (req.user.isAdmin) return true;
  const [row] = await db
    .select({ id: courts.id })
    .from(courts)
    .innerJoin(clubs, eq(courts.clubId, clubs.id))
    .where(and(eq(courts.id, courtId), eq(clubs.ownerId, req.user.id)))
    .limit(1);
  return !!row;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toDateStr(date) {
  return date.toISOString().split("T")[0];
}

function minutes(time) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function timeStr(total) {
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function buildCourtSlots(court) {
  const slots = [];
  const open = minutes(court.openTime);
  const close = minutes(court.closeTime);
  const duration = Number(court.slotDuration ?? 60);
  for (let t = open; t + duration <= close; t += duration) {
    slots.push({ startTime: timeStr(t), endTime: timeStr(t + duration) });
  }
  return slots;
}

function recommendedDiscount(date, startTime) {
  const target = new Date(`${date}T${startTime}:00`);
  const hoursLeft = (target.getTime() - Date.now()) / 36e5;
  const hour = Number(startTime.slice(0, 2));
  if (hoursLeft <= 24) return 30;
  if (hoursLeft <= 48) return hour >= 12 && hour <= 17 ? 25 : 20;
  return hour >= 12 && hour <= 17 ? 20 : 10;
}

async function getOwnerCourtScope(req, clubId) {
  const ownerId = ownerFilter(req);
  let clubRows = [];
  if (clubId) {
    if (!(await assertClubOwnership(req, clubId))) return null;
    clubRows = await db.select({ id: clubs.id, name: clubs.name }).from(clubs).where(eq(clubs.id, clubId));
  } else {
    clubRows = ownerId
      ? await db.select({ id: clubs.id, name: clubs.name }).from(clubs).where(eq(clubs.ownerId, ownerId))
      : await db.select({ id: clubs.id, name: clubs.name }).from(clubs);
  }
  const clubIds = clubRows.map(c => c.id);
  if (clubIds.length === 0) return { clubRows, courtRows: [] };
  const courtRows = await db.select().from(courts).where(inArray(courts.clubId, clubIds));
  return { clubRows, courtRows };
}

// ── Clubs ─────────────────────────────────────────────────────────────────────

export const getMyClubsController = async (req, res) => {
  try {
    const ownerId = ownerFilter(req);
    const rows = await db
      .select()
      .from(clubs)
      .where(ownerId ? eq(clubs.ownerId, ownerId) : undefined)
      .orderBy(desc(clubs.createdAt));

    // Attach court count per club
    const enriched = await Promise.all(rows.map(async (club) => {
      const courtRows = await db
        .select({ id: courts.id })
        .from(courts)
        .where(eq(courts.clubId, club.id));
      return { ...club, courtCount: courtRows.length };
    }));

    return res.json({ clubs: enriched });
  } catch (error) {
    console.error("getMyClubs error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

export const createClubController = async (req, res) => {
  try {
    const { name, description, address, phone, sportTypes, amenities, images, openTime, closeTime } = req.body;
    if (!name || !address) return res.status(400).json({ message: "نام و آدرس الزامی است" });

    const [club] = await db
      .insert(clubs)
      .values({
        ownerId: req.user.id,
        name,
        description: description || null,
        address,
        phone: phone || null,
        sportTypes: sportTypes ?? [],
        amenities: amenities ?? [],
        images: images ?? [],
        openTime: openTime || "07:00",
        closeTime: closeTime || "23:00",
      })
      .returning();

    return res.status(201).json({ club });
  } catch (error) {
    console.error("createClub error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

export const updateClubController = async (req, res) => {
  try {
    const { id } = req.params;
    if (!(await assertClubOwnership(req, id))) {
      return res.status(403).json({ message: "دسترسی غیر مجاز" });
    }

    const { name, description, address, phone, sportTypes, amenities, images, openTime, closeTime, isActive } = req.body;
    const [updated] = await db
      .update(clubs)
      .set({
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(address !== undefined && { address }),
        ...(phone !== undefined && { phone }),
        ...(sportTypes !== undefined && { sportTypes }),
        ...(amenities !== undefined && { amenities }),
        ...(images !== undefined && { images }),
        ...(openTime !== undefined && { openTime }),
        ...(closeTime !== undefined && { closeTime }),
        ...(isActive !== undefined && { isActive }),
        updatedAt: new Date(),
      })
      .where(eq(clubs.id, id))
      .returning();

    return res.json({ club: updated });
  } catch (error) {
    console.error("updateClub error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

export const deleteClubController = async (req, res) => {
  try {
    const { id } = req.params;
    if (!(await assertClubOwnership(req, id))) {
      return res.status(403).json({ message: "دسترسی غیر مجاز" });
    }
    await db.delete(clubs).where(eq(clubs.id, id));
    return res.json({ ok: true });
  } catch (error) {
    console.error("deleteClub error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

// ── Courts (club-scoped) ──────────────────────────────────────────────────────

export const getClubCourtsController = async (req, res) => {
  try {
    const { clubId } = req.params;
    if (!(await assertClubOwnership(req, clubId))) {
      return res.status(403).json({ message: "دسترسی غیر مجاز" });
    }

    const rows = await db
      .select()
      .from(courts)
      .where(eq(courts.clubId, clubId))
      .orderBy(courts.createdAt);

    return res.json({ courts: rows });
  } catch (error) {
    console.error("getClubCourts error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

export const createClubCourtController = async (req, res) => {
  try {
    const { clubId } = req.params;
    if (!(await assertClubOwnership(req, clubId))) {
      return res.status(403).json({ message: "دسترسی غیر مجاز" });
    }

    const { name, location, address, surfaceType, sportType, pricePerHour, openTime, closeTime, slotDuration, description, managerPhone } = req.body;
    if (!name || !pricePerHour) return res.status(400).json({ message: "نام و قیمت الزامی است" });
    const parsedSlotDuration = parseInt(slotDuration ?? "60", 10);
    if (![60, 90].includes(parsedSlotDuration)) {
      return res.status(400).json({ message: "مدت اسلات فقط می‌تواند ۶۰ یا ۹۰ دقیقه باشد" });
    }

    // Fetch club to use as default location
    const [club] = await db.select().from(clubs).where(eq(clubs.id, clubId)).limit(1);

    const [court] = await db
      .insert(courts)
      .values({
        clubId,
        name,
        location: location || club?.name || "",
        address: address || club?.address || null,
        surfaceType: surfaceType || "artificial",
        sportType: sportType || "padel",
        pricePerHour: parseInt(pricePerHour, 10),
        openTime: openTime || club?.openTime || "07:00",
        closeTime: closeTime || club?.closeTime || "23:00",
        slotDuration: parsedSlotDuration,
        description: description || null,
        managerPhone: managerPhone || club?.phone || null,
      })
      .returning();

    return res.status(201).json({ court });
  } catch (error) {
    console.error("createClubCourt error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

export const updateClubCourtController = async (req, res) => {
  try {
    const { courtId } = req.params;
    if (!(await assertCourtOwnership(req, courtId))) {
      return res.status(403).json({ message: "دسترسی غیر مجاز" });
    }

    const fields = ["name","location","address","surfaceType","sportType","pricePerHour","openTime","closeTime","slotDuration","description","managerPhone","isActive"];
    const updates = {};
    for (const f of fields) {
      if (req.body[f] !== undefined) {
        if (f === "slotDuration") {
          const parsedSlotDuration = parseInt(req.body[f], 10);
          if (![60, 90].includes(parsedSlotDuration)) {
            return res.status(400).json({ message: "مدت اسلات فقط می‌تواند ۶۰ یا ۹۰ دقیقه باشد" });
          }
          updates[f] = parsedSlotDuration;
        } else {
          updates[f] = f === "pricePerHour" ? parseInt(req.body[f], 10) : req.body[f];
        }
      }
    }

    const [updated] = await db.update(courts).set(updates).where(eq(courts.id, courtId)).returning();
    return res.json({ court: updated });
  } catch (error) {
    console.error("updateClubCourt error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

export const deleteClubCourtController = async (req, res) => {
  try {
    const { courtId } = req.params;
    if (!(await assertCourtOwnership(req, courtId))) {
      return res.status(403).json({ message: "دسترسی غیر مجاز" });
    }
    await db.delete(courts).where(eq(courts.id, courtId));
    return res.json({ ok: true });
  } catch (error) {
    console.error("deleteClubCourt error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

// ── Bookings (club-scoped) ────────────────────────────────────────────────────

export const getClubBookingsController = async (req, res) => {
  try {
    const { status } = req.query;
    const ownerId = ownerFilter(req);

    // Find court IDs belonging to this owner
    let courtIds = [];
    if (ownerId) {
      const ownerClubs = await db.select({ id: clubs.id }).from(clubs).where(eq(clubs.ownerId, ownerId));
      const clubIds = ownerClubs.map(c => c.id);
      if (clubIds.length === 0) return res.json({ bookings: [] });

      const ownerCourts = await db.select({ id: courts.id }).from(courts).where(inArray(courts.clubId, clubIds));
      courtIds = ownerCourts.map(c => c.id);
      if (courtIds.length === 0) return res.json({ bookings: [] });
    }

    const conditions = [];
    if (ownerId && courtIds.length > 0) conditions.push(inArray(bookings.courtId, courtIds));
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
          image: users.image,
        },
        court: {
          id: courts.id,
          name: courts.name,
          location: courts.location,
          sportType: courts.sportType,
          clubId: courts.clubId,
        },
      })
      .from(bookings)
      .innerJoin(courts, eq(bookings.courtId, courts.id))
      .innerJoin(users, eq(bookings.userId, users.id))
      .where(conditions.length === 1 ? conditions[0] : conditions.length > 1 ? and(...conditions) : undefined)
      .orderBy(desc(bookings.createdAt));

    return res.json({ bookings: rows });
  } catch (error) {
    console.error("getClubBookings error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

export const approveClubBookingController = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminNote } = req.body;

    const [booking] = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1);
    if (!booking) return res.status(404).json({ message: "رزرو یافت نشد" });
    if (booking.status !== "pending") return res.status(400).json({ message: "فقط رزروهای در انتظار قابل تأیید است" });

    if (!(await assertCourtOwnership(req, booking.courtId))) {
      return res.status(403).json({ message: "دسترسی غیر مجاز" });
    }

    const [court] = await db
      .select({ name: courts.name, managerPhone: courts.managerPhone, clubName: clubs.name })
      .from(courts)
      .leftJoin(clubs, eq(courts.clubId, clubs.id))
      .where(eq(courts.id, booking.courtId))
      .limit(1);

    const [updated] = await db
      .update(bookings)
      .set({ status: "approved", adminNote: adminNote || null, updatedAt: new Date() })
      .where(eq(bookings.id, id))
      .returning();

    // Mark the slot as booked in slot_overrides so it shows as unavailable
    const [existingOverride] = await db
      .select()
      .from(slotOverrides)
      .where(and(eq(slotOverrides.courtId, booking.courtId), eq(slotOverrides.date, booking.date), eq(slotOverrides.startTime, booking.startTime)))
      .limit(1);

    if (existingOverride) {
      await db.update(slotOverrides).set({ status: "booked", updatedAt: new Date() }).where(eq(slotOverrides.id, existingOverride.id));
    } else {
      await db.insert(slotOverrides).values({ courtId: booking.courtId, date: booking.date, startTime: booking.startTime, endTime: booking.endTime, status: "booked" });
    }

    const trackingCode = booking.trackingCode;
    sendNotification(booking.userId, {
      title: "رزرو شما تأیید شد ✅",
      message: `رزرو زمین برای ${booking.date} ساعت ${booking.startTime} تأیید شد. به موقع حاضر باشید!${trackingCode ? ` کد پیگیری: ${trackingCode}` : ""}`,
      type: "BOOKING",
      isPinned: true,
      metadata: { bookingId: id, date: booking.date, startTime: booking.startTime, trackingCode, ctaHref: trackingCode ? `/booking/track/${trackingCode}` : "/mybooking", ctaLabel: "مشاهده رزرو" },
      smsText: (() => {
        const courtInfo = court?.clubName ? `زمین ${court.name} باشگاه ${court.clubName}` : `زمین ${court?.name ?? ""}`;
        const manager = court?.managerPhone ? ` تلفن مدیر زمین: ${court.managerPhone}.` : "";
        const code = trackingCode ? ` کد پیگیری: ${trackingCode}.` : "";
        return `پلتفرم رکت‌زون: رزرو ${courtInfo} برای ${booking.date} ساعت ${booking.startTime} تایید شد.${code}${manager} به امید دیدار مجدد!`;
      })(),
    }).catch(() => {});

    return res.json({ booking: updated });
  } catch (error) {
    console.error("approveClubBooking error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

export const rejectClubBookingController = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminNote } = req.body;

    const [booking] = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1);
    if (!booking) return res.status(404).json({ message: "رزرو یافت نشد" });
    if (booking.status !== "pending") return res.status(400).json({ message: "فقط رزروهای در انتظار قابل رد است" });

    if (!(await assertCourtOwnership(req, booking.courtId))) {
      return res.status(403).json({ message: "دسترسی غیر مجاز" });
    }

    const [updated] = await db
      .update(bookings)
      .set({ status: "rejected", adminNote: adminNote || null, updatedAt: new Date() })
      .where(eq(bookings.id, id))
      .returning();

    // Remove booked override if it was set
    await db.delete(slotOverrides).where(
      and(eq(slotOverrides.courtId, booking.courtId), eq(slotOverrides.date, booking.date), eq(slotOverrides.startTime, booking.startTime), eq(slotOverrides.status, "booked"))
    );

    sendNotification(booking.userId, {
      title: "رزرو شما رد شد ❌",
      message: `متأسفانه رزرو شما برای ${booking.date} ساعت ${booking.startTime} رد شد.${adminNote ? ` دلیل: ${adminNote}` : ""}`,
      type: "BOOKING",
      metadata: { bookingId: id, ctaHref: "/mybooking", ctaLabel: "مشاهده رزروها" },
      smsText: `پلتفرم رکت‌زون: رزرو شما برای ${booking.date} ساعت ${booking.startTime} رد شد.${adminNote ? ` دلیل: ${adminNote}` : ""}`,
    }).catch(() => {});

    return res.json({ booking: updated });
  } catch (error) {
    console.error("rejectClubBooking error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

// ── Dashboard Stats ───────────────────────────────────────────────────────────

export const getClubStatsController = async (req, res) => {
  try {
    const ownerId = ownerFilter(req);

    const ownerClubs = ownerId
      ? await db.select().from(clubs).where(eq(clubs.ownerId, ownerId))
      : await db.select().from(clubs);

    const clubIds = ownerClubs.map(c => c.id);
    if (clubIds.length === 0) {
      return res.json({
        stats: {
          totalClubs: 0, totalCourts: 0, activeCourts: 0,
          totalBookings: 0, pendingBookings: 0, approvedBookings: 0,
          cancelledBookings: 0, totalRevenue: 0, thisMonthRevenue: 0,
          thisMonthBookings: 0, uniqueUsers: 0,
        },
        dailyStats: [], courtUtilization: [], peakHours: [], recentBookings: [],
      });
    }

    const ownerCourts = await db.select().from(courts).where(inArray(courts.clubId, clubIds));
    const courtIds = ownerCourts.map(c => c.id);

    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const thirtyDaysAgo = new Date(now); thirtyDaysAgo.setDate(now.getDate() - 29);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0];

    let allBookings = [];
    if (courtIds.length > 0) {
      allBookings = await db
        .select({
          id: bookings.id,
          courtId: bookings.courtId,
          userId: bookings.userId,
          date: bookings.date,
          startTime: bookings.startTime,
          totalPrice: bookings.totalPrice,
          status: bookings.status,
          createdAt: bookings.createdAt,
        })
        .from(bookings)
        .where(inArray(bookings.courtId, courtIds))
        .orderBy(desc(bookings.createdAt));
    }

    const approved = allBookings.filter(b => b.status === "approved");
    const pending  = allBookings.filter(b => b.status === "pending");
    const cancelled = allBookings.filter(b => b.status === "cancelled" || b.status === "rejected");
    const thisMonth = allBookings.filter(b => b.date >= monthStart);
    const uniqueUsers = new Set(allBookings.map(b => b.userId)).size;

    // ── daily stats (last 30 days) ──────────────────────────────────────────
    const dailyMap = {};
    for (let i = 0; i < 30; i++) {
      const d = new Date(thirtyDaysAgo); d.setDate(thirtyDaysAgo.getDate() + i);
      dailyMap[d.toISOString().split("T")[0]] = { bookings: 0, revenue: 0 };
    }
    allBookings
      .filter(b => b.date >= thirtyDaysAgoStr && b.date <= todayStr)
      .forEach(b => {
        if (!dailyMap[b.date]) return;
        dailyMap[b.date].bookings++;
        if (b.status === "approved") dailyMap[b.date].revenue += b.totalPrice;
      });
    const dailyStats = Object.entries(dailyMap).map(([date, v]) => ({ date, ...v }));

    // ── court utilization ──────────────────────────────────────────────────
    const courtBookingCount = {};
    const courtRevenueMap = {};
    approved.forEach(b => {
      courtBookingCount[b.courtId] = (courtBookingCount[b.courtId] ?? 0) + 1;
      courtRevenueMap[b.courtId]   = (courtRevenueMap[b.courtId]   ?? 0) + b.totalPrice;
    });
    const courtUtilization = ownerCourts.map(c => ({
      name:     c.name,
      bookings: courtBookingCount[c.id] ?? 0,
      revenue:  courtRevenueMap[c.id]   ?? 0,
    })).sort((a, b) => b.bookings - a.bookings);

    // ── peak hours ────────────────────────────────────────────────────────
    const hourCount = {};
    approved.forEach(b => {
      const h = (b.startTime ?? "00:00").slice(0, 2);
      hourCount[h] = (hourCount[h] ?? 0) + 1;
    });
    const peakHours = Array.from({ length: 17 }, (_, i) => {
      const h = String(i + 7).padStart(2, "0");
      return { hour: `${h}:00`, count: hourCount[h] ?? 0 };
    });

    // ── recent bookings ───────────────────────────────────────────────────
    const recentBookings = allBookings.slice(0, 5).map(b => {
      const court = ownerCourts.find(c => c.id === b.courtId);
      return {
        id: b.id,
        courtName: court?.name ?? "—",
        date: b.date,
        startTime: b.startTime,
        totalPrice: b.totalPrice,
        status: b.status,
      };
    });

    return res.json({
      stats: {
        totalClubs:       ownerClubs.length,
        totalCourts:      ownerCourts.length,
        activeCourts:     ownerCourts.filter(c => c.isActive).length,
        totalBookings:    allBookings.length,
        pendingBookings:  pending.length,
        approvedBookings: approved.length,
        cancelledBookings: cancelled.length,
        totalRevenue:     approved.reduce((s, b) => s + b.totalPrice, 0),
        thisMonthRevenue: thisMonth.filter(b => b.status === "approved").reduce((s, b) => s + b.totalPrice, 0),
        thisMonthBookings: thisMonth.length,
        uniqueUsers,
      },
      dailyStats,
      courtUtilization,
      peakHours,
      recentBookings,
    });
  } catch (error) {
    console.error("getClubStats error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

// ── Slot Overrides ────────────────────────────────────────────────────────────

export const getSlotOverridesController = async (req, res) => {
  try {
    const { courtId } = req.params;
    const { from, to } = req.query;

    if (!await assertCourtOwnership(req, courtId))
      return res.status(403).json({ message: "دسترسی ندارید" });

    const conditions = [eq(slotOverrides.courtId, courtId)];
    if (from) conditions.push(gte(slotOverrides.date, from));
    if (to)   conditions.push(lte(slotOverrides.date, to));

    const rows = await db.select().from(slotOverrides).where(and(...conditions));
    return res.json({ slotOverrides: rows });
  } catch (error) {
    console.error("getSlotOverrides error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

export const getAutoFillOpportunitiesController = async (req, res) => {
  try {
    const horizonDays = Math.min(Math.max(parseInt(req.query.days ?? "3", 10), 1), 7);
    const scope = await getOwnerCourtScope(req, req.query.clubId);
    if (!scope) return res.status(403).json({ message: "دسترسی ندارید" });

    const today = new Date();
    const from = toDateStr(today);
    const to = toDateStr(addDays(today, horizonDays - 1));
    const courtRows = scope.courtRows.filter(c => c.isActive);
    const courtIds = courtRows.map(c => c.id);
    if (courtIds.length === 0) return res.json({ summary: { emptySlots: 0, revenuePotential: 0, avgDiscount: 0 }, opportunities: [] });

    const bookingRows = await db.select().from(bookings).where(and(inArray(bookings.courtId, courtIds), gte(bookings.date, from), lte(bookings.date, to)));
    const overrideRows = await db.select().from(slotOverrides).where(and(inArray(slotOverrides.courtId, courtIds), gte(slotOverrides.date, from), lte(slotOverrides.date, to)));
    const booked = new Set(bookingRows.filter(b => ["pending", "approved"].includes(b.status)).map(b => `${b.courtId}|${b.date}|${b.startTime}`));
    const overrides = new Map(overrideRows.map(o => [`${o.courtId}|${o.date}|${o.startTime}`, o]));
    const clubNameById = Object.fromEntries(scope.clubRows.map(c => [c.id, c.name]));
    const opportunities = [];

    for (const court of courtRows) {
      for (let i = 0; i < horizonDays; i++) {
        const date = toDateStr(addDays(today, i));
        for (const slot of buildCourtSlots(court)) {
          const key = `${court.id}|${date}|${slot.startTime}`;
          const targetTime = new Date(`${date}T${slot.startTime}:00`);
          const override = overrides.get(key);
          if (targetTime <= today || booked.has(key) || override?.status === "blocked" || override?.status === "booked" || Number(override?.discountPercent ?? 0) > 0) continue;
          const discountPercent = Math.max(Number(override?.discountPercent ?? 0), recommendedDiscount(date, slot.startTime));
          const price = override?.price ?? court.pricePerHour;
          opportunities.push({
            id: key,
            courtId: court.id,
            courtName: court.name,
            clubId: court.clubId,
            clubName: clubNameById[court.clubId],
            sportType: court.sportType,
            date,
            startTime: slot.startTime,
            endTime: slot.endTime,
            price,
            discountPercent,
            finalPrice: Math.round(price * (1 - discountPercent / 100)),
            hoursLeft: Math.max(0, Math.round((targetTime.getTime() - Date.now()) / 36e5)),
          });
        }
      }
    }

    opportunities.sort((a, b) => a.hoursLeft - b.hoursLeft || b.discountPercent - a.discountPercent);
    const revenuePotential = opportunities.reduce((sum, item) => sum + item.price, 0);
    const avgDiscount = opportunities.length ? Math.round(opportunities.reduce((sum, item) => sum + item.discountPercent, 0) / opportunities.length) : 0;
    return res.json({ summary: { emptySlots: opportunities.length, revenuePotential, avgDiscount }, opportunities });
  } catch (error) {
    console.error("getAutoFillOpportunities error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

export const runAutoFillController = async (req, res) => {
  try {
    const { slots = [] } = req.body;
    if (!Array.isArray(slots) || slots.length === 0) return res.status(400).json({ message: "هیچ سانسی انتخاب نشده" });
    const selected = slots.slice(0, 50);
    let applied = 0;

    for (const item of selected) {
      if (!(await assertCourtOwnership(req, item.courtId))) continue;
      const discountPercent = Math.min(Math.max(parseInt(item.discountPercent ?? "20", 10), 5), 50);
      const [existing] = await db.select().from(slotOverrides).where(and(eq(slotOverrides.courtId, item.courtId), eq(slotOverrides.date, item.date), eq(slotOverrides.startTime, item.startTime))).limit(1);
      if (existing) {
        if (["blocked", "booked"].includes(existing.status)) continue;
        if (Number(existing.discountPercent ?? 0) > 0) continue;
        await db.update(slotOverrides).set({ status: "available", price: item.price ?? existing.price, discountPercent, updatedAt: new Date() }).where(eq(slotOverrides.id, existing.id));
      } else {
        await db.insert(slotOverrides).values({ courtId: item.courtId, date: item.date, startTime: item.startTime, endTime: item.endTime, status: "available", price: item.price ?? null, discountPercent });
      }
      await db.insert(deals).values({ courtId: item.courtId, slotDate: item.date, slotStart: item.startTime, slotEnd: item.endTime, discountPercent, validUntil: new Date(`${item.date}T${item.startTime}:00`) });
      applied++;
    }

    return res.json({ applied });
  } catch (error) {
    console.error("runAutoFill error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

export const upsertSlotOverrideController = async (req, res) => {
  try {
    const { courtId } = req.params;
    const { date, startTime, endTime, status, price, discountPercent } = req.body;

    if (!await assertCourtOwnership(req, courtId))
      return res.status(403).json({ message: "دسترسی ندارید" });

    const [existing] = await db
      .select()
      .from(slotOverrides)
      .where(and(
        eq(slotOverrides.courtId, courtId),
        eq(slotOverrides.date, date),
        eq(slotOverrides.startTime, startTime),
      ))
      .limit(1);

    if (existing) {
      if (status === "available" && !price && (!discountPercent || discountPercent === 0)) {
        await db.delete(slotOverrides).where(eq(slotOverrides.id, existing.id));
        return res.json({ deleted: true });
      }
      const [updated] = await db
        .update(slotOverrides)
        .set({ status: status ?? existing.status, price: price ?? null, discountPercent: discountPercent ?? 0, updatedAt: new Date() })
        .where(eq(slotOverrides.id, existing.id))
        .returning();
      return res.json({ slotOverride: updated });
    } else {
      const [created] = await db
        .insert(slotOverrides)
        .values({ courtId, date, startTime, endTime, status: status ?? "available", price: price ?? null, discountPercent: discountPercent ?? 0 })
        .returning();
      return res.json({ slotOverride: created });
    }
  } catch (error) {
    console.error("upsertSlotOverride error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

// ── Club Customers ────────────────────────────────────────────────────────────

export const getClubCustomersController = async (req, res) => {
  try {
    const ownerId = ownerFilter(req);

    const ownerClubs = ownerId
      ? await db.select({ id: clubs.id }).from(clubs).where(eq(clubs.ownerId, ownerId))
      : await db.select({ id: clubs.id }).from(clubs);

    const clubIds = ownerClubs.map(c => c.id);
    if (clubIds.length === 0) return res.json({ customers: [] });

    const ownerCourts = await db.select({ id: courts.id }).from(courts).where(inArray(courts.clubId, clubIds));
    const courtIds = ownerCourts.map(c => c.id);

    // users who booked a court
    const bookingRows = courtIds.length > 0
      ? await db
          .select({
            userId:    bookings.userId,
            lastDate:  sql`max(${bookings.date})`,
            bookCount: sql`count(*)`,
            totalSpent: sql`sum(case when ${bookings.status} = 'approved' then ${bookings.totalPrice} else 0 end)`,
          })
          .from(bookings)
          .where(inArray(bookings.courtId, courtIds))
          .groupBy(bookings.userId)
      : [];

    // users who registered in a tournament of these clubs
    const clubTournaments = clubIds.length > 0
      ? await db.select({ id: tournaments.id }).from(tournaments).where(inArray(tournaments.clubId, clubIds))
      : [];
    const tournamentIds = clubTournaments.map(t => t.id);

    const tournamentRows = tournamentIds.length > 0
      ? await db
          .select({ userId: tournamentRegistrations.userId })
          .from(tournamentRegistrations)
          .where(inArray(tournamentRegistrations.tournamentId, tournamentIds))
      : [];

    // merge user ids
    const userMap = {};
    for (const r of bookingRows) {
      userMap[r.userId] = {
        bookCount:  Number(r.bookCount),
        totalSpent: Number(r.totalSpent),
        lastDate:   r.lastDate,
        fromTournament: false,
      };
    }
    for (const r of tournamentRows) {
      if (!userMap[r.userId]) {
        userMap[r.userId] = { bookCount: 0, totalSpent: 0, lastDate: null, fromTournament: true };
      } else {
        userMap[r.userId].fromTournament = true;
      }
    }

    const allUserIds = Object.keys(userMap);
    if (allUserIds.length === 0) return res.json({ customers: [] });

    const userRows = await db
      .select({ id: users.id, name: users.name, phone: users.phone, image: users.image, createdAt: users.createdAt })
      .from(users)
      .where(inArray(users.id, allUserIds));

    const customers = userRows.map(u => ({
      id:            u.id,
      name:          u.name,
      phone:         u.phone,
      image:         u.image,
      memberSince:   u.createdAt,
      bookCount:     userMap[u.id]?.bookCount  ?? 0,
      totalSpent:    userMap[u.id]?.totalSpent ?? 0,
      lastVisit:     userMap[u.id]?.lastDate   ?? null,
      fromTournament: userMap[u.id]?.fromTournament ?? false,
    })).sort((a, b) => b.bookCount - a.bookCount);

    return res.json({ customers });
  } catch (error) {
    console.error("getClubCustomers error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};
