import { eq, and, desc, inArray, count, sum, gte, lte } from "drizzle-orm";
import { db } from "../db/index.js";
import { clubs, courts, bookings, users, slotOverrides } from "../db/schema.js";
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
        slotDuration: parseInt(slotDuration ?? "60", 10),
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
        updates[f] = f === "pricePerHour" || f === "slotDuration"
          ? parseInt(req.body[f], 10)
          : req.body[f];
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

    sendNotification(booking.userId, {
      title: "رزرو شما تأیید شد ✅",
      message: `رزرو زمین برای ${booking.date} ساعت ${booking.startTime} تأیید شد. به موقع حاضر باشید!`,
      type: "BOOKING",
      isPinned: true,
      metadata: { bookingId: id, date: booking.date, startTime: booking.startTime, ctaHref: "/mybooking", ctaLabel: "مشاهده رزروها" },
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

    // Clubs count
    const ownerClubs = ownerId
      ? await db.select().from(clubs).where(eq(clubs.ownerId, ownerId))
      : await db.select().from(clubs);

    const clubIds = ownerClubs.map(c => c.id);
    if (clubIds.length === 0) {
      return res.json({ stats: { totalClubs: 0, totalCourts: 0, totalBookings: 0, pendingBookings: 0, approvedBookings: 0, totalRevenue: 0 } });
    }

    const ownerCourts = await db.select().from(courts).where(inArray(courts.clubId, clubIds));
    const courtIds = ownerCourts.map(c => c.id);

    let totalBookings = 0, pendingBookings = 0, approvedBookings = 0, totalRevenue = 0;

    if (courtIds.length > 0) {
      const allBookings = await db.select().from(bookings).where(inArray(bookings.courtId, courtIds));
      totalBookings = allBookings.length;
      pendingBookings = allBookings.filter(b => b.status === "pending").length;
      approvedBookings = allBookings.filter(b => b.status === "approved").length;
      totalRevenue = allBookings.filter(b => b.status === "approved").reduce((s, b) => s + b.totalPrice, 0);
    }

    return res.json({
      stats: {
        totalClubs: ownerClubs.length,
        activeCourts: ownerCourts.filter(c => c.isActive).length,
        totalCourts: ownerCourts.length,
        totalBookings,
        pendingBookings,
        approvedBookings,
        totalRevenue,
      },
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
