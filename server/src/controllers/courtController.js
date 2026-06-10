import { eq, and } from "drizzle-orm";
import { db } from "../db/index.js";
import { courts, bookings, clubs, slotOverrides } from "../db/schema.js";

// Build all slot strings for a court on a given date
function toMinutes(time) {
  if (!time || typeof time !== "string") return NaN;
  const [h, m] = time.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return NaN;
  return h * 60 + m;
}

function generateSlots(openTime, closeTime, slotDuration, bookedSlots, pricePerHour = 0, overrides = [], currentUserId = null) {
  const slots = [];
  const [openH, openM] = openTime.split(":").map(Number);
  const [closeH, closeM] = closeTime.split(":").map(Number);
  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;

  for (let t = openMinutes; t + slotDuration <= closeMinutes; t += slotDuration) {
    const sh = String(Math.floor(t / 60)).padStart(2, "0");
    const sm = String(t % 60).padStart(2, "0");
    const eh = String(Math.floor((t + slotDuration) / 60)).padStart(2, "0");
    const em = String((t + slotDuration) % 60).padStart(2, "0");
    const start = `${sh}:${sm}`;
    const end = `${eh}:${em}`;

    const override = overrides.find((o) => o.startTime === start);
    const overlapping = bookedSlots.find((b) => {
      if (b.status === "rejected" || b.status === "cancelled") return false;
      const bStart = toMinutes(b.startTime);
      const bEnd = toMinutes(b.endTime);
      return t < bEnd && t + slotDuration > bStart;
    });

    const isPending = overlapping?.status === "pending";
    const isBookedByUser = overlapping?.status === "approved";
    const isMine = Boolean(currentUserId && overlapping?.userId === currentUserId);

    const overrideStatus = override?.status ?? "available";
    const effectivePrice = override?.price ?? pricePerHour;
    const discount = override?.discountPercent ?? 0;
    const finalPrice = discount > 0 ? Math.round(effectivePrice * (1 - discount / 100)) : effectivePrice;

    slots.push({
      start,
      end,
      isBooked: isBookedByUser || overrideStatus === "blocked" || overrideStatus === "booked",
      isPending: isPending && !isBookedByUser,
      isBlocked: overrideStatus === "blocked",
      isManualBooked: overrideStatus === "booked",
      isMine,
      price: finalPrice,
      originalPrice: discount > 0 ? effectivePrice : null,
      discount,
    });
  }
  return slots;
}


export const getCourtsController = async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(courts)
      .where(eq(courts.isActive, true));
    return res.status(200).json({ courts: rows });
  } catch (error) {
    console.error("getCourts error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

export const getCourtByIdController = async (req, res) => {
  try {
    const [court] = await db
      .select()
      .from(courts)
      .where(and(eq(courts.id, req.params.id), eq(courts.isActive, true)))
      .limit(1);

    if (!court) return res.status(404).json({ message: "زمین یافت نشد" });
    return res.status(200).json({ court });
  } catch (error) {
    console.error("getCourtById error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

export const getCourtAvailabilityController = async (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.query; // YYYY-MM-DD

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ message: "تاریخ نامعتبر است" });
    }

    const [court] = await db
      .select()
      .from(courts)
      .where(and(eq(courts.id, id), eq(courts.isActive, true)))
      .limit(1);

    if (!court) return res.status(404).json({ message: "زمین یافت نشد" });

    const bookedSlots = await db
      .select({ startTime: bookings.startTime, endTime: bookings.endTime, status: bookings.status, userId: bookings.userId })
      .from(bookings)
      .where(and(eq(bookings.courtId, id), eq(bookings.date, date)));

    let overrides = [];
    try {
      overrides = await db
        .select()
        .from(slotOverrides)
        .where(and(eq(slotOverrides.courtId, id), eq(slotOverrides.date, date)));
    } catch { /* table may not exist yet */ }

    const slots = generateSlots(
      court.openTime,
      court.closeTime,
      court.slotDuration,
      bookedSlots,
      court.pricePerHour,
      overrides,
      req.user?.id ?? null,
    );

    return res.status(200).json({ date, slots, court });
  } catch (error) {
    console.error("getCourtAvailability error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

// ── Public clubs listing (no auth required) ───────────────────────────────────
export const getPublicClubsController = async (req, res) => {
  try {
    const clubRows = await db
      .select()
      .from(clubs)
      .where(eq(clubs.isActive, true));

    const enriched = await Promise.all(clubRows.map(async (club) => {
      const courtRows = await db
        .select()
        .from(courts)
        .where(and(eq(courts.clubId, club.id), eq(courts.isActive, true)));

      return {
        ...club,
        courts: courtRows,
        priceFrom: courtRows.length > 0
          ? Math.min(...courtRows.map(c => c.pricePerHour))
          : 0,
        sportTypes: club.sportTypes?.length > 0
          ? club.sportTypes
          : [...new Set(courtRows.map(c => c.sportType))],
      };
    }));

    return res.json({ clubs: enriched });
  } catch (error) {
    console.error("getPublicClubs error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};
