import { eq, and, asc, gte, lte, desc, ne, inArray, sql, lt } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  matches,
  matchParticipants,
  users,
  courts,
  bookings,
  promotions,
  deals,
} from "../db/schema.js";

const TEHRAN_OFFSET = "+03:30";
const MATCH_DURATION_MINUTES = 90;

function parseDealSlotDateTime(slotDate, slotTime) {
  if (!slotDate || !slotTime) return null;
  const parsed = new Date(`${slotDate}T${slotTime}:00${TEHRAN_OFFSET}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isDealExpiredByTime(deal, now = new Date()) {
  const validUntil = deal.validUntil ? new Date(deal.validUntil) : null;
  const isValidUntilExpired = validUntil && !Number.isNaN(validUntil.getTime()) && validUntil <= now;
  const slotEndDateTime = parseDealSlotDateTime(deal.slotDate, deal.slotEnd);
  const isSlotPassed = slotEndDateTime && slotEndDateTime <= now;
  return Boolean(isValidUntilExpired || isSlotPassed);
}

function toMinutes(time) {
  const [h, m] = String(time ?? "00:00").split(":").map(Number);
  return h * 60 + m;
}

function isDealSlotBookedOrPending(bookingRows, deal) {
  const dealStart = toMinutes(deal.slotStart);
  const dealEnd = toMinutes(deal.slotEnd);

  return bookingRows.some((booking) => {
    if (booking.courtId !== deal.courtId) return false;
    if (booking.date !== deal.slotDate) return false;
    if (booking.status !== "pending" && booking.status !== "approved") return false;

    const bookingStart = toMinutes(booking.startTime);
    const bookingEnd = toMinutes(booking.endTime);
    return dealStart < bookingEnd && dealEnd > bookingStart;
  });
}

async function enrichMatches(rows) {
  return Promise.all(
    rows.map(async (match) => {
      const participants = await db
        .select({
          userId: users.id,
          name: users.name,
          image: users.image,
          team: matchParticipants.team,
        })
        .from(matchParticipants)
        .innerJoin(users, eq(matchParticipants.userId, users.id))
        .where(eq(matchParticipants.matchId, match.id))
        .orderBy(asc(matchParticipants.joinedAt));

      return {
        ...match,
        teamA: participants.filter((p) => p.team === "A"),
        teamB: participants.filter((p) => p.team === "B"),
      };
    })
  );
}

// Auto-cancel open matches that have passed their start time without filling up
async function autoExpireNotHeldMatches(now) {
  await db
    .update(matches)
    .set({ status: "cancelled", updatedAt: now })
    .where(and(eq(matches.status, "open"), lt(matches.scheduledAt, now)));
}

function getTehranDayBounds(now) {
  // Get start and end of current day in Tehran timezone
  const tehranStr = now.toLocaleDateString("en-CA", { timeZone: "Asia/Tehran" });
  const startOfDay = new Date(`${tehranStr}T00:00:00${TEHRAN_OFFSET}`);
  const endOfDay = new Date(`${tehranStr}T23:59:59${TEHRAN_OFFSET}`);
  return { startOfDay, endOfDay };
}

export const getHomeController = async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();

    // Auto-expire open matches that already started without filling
    await autoExpireNotHeldMatches(now);

    // ── Upcoming matches (open, future) — general list
    const matchRows = await db
      .select()
      .from(matches)
      .where(and(eq(matches.status, "open"), gte(matches.scheduledAt, now)))
      .orderBy(asc(matches.scheduledAt))
      .limit(6);

    const upcomingMatches = await enrichMatches(matchRows);

    // ── Almost full matches (open, future, 1-2 spots remaining)
    const allOpenRows = await db
      .select()
      .from(matches)
      .where(and(eq(matches.status, "open"), gte(matches.scheduledAt, now)))
      .orderBy(asc(matches.scheduledAt))
      .limit(30);

    const allOpenEnriched = await enrichMatches(allOpenRows);
    const almostFullMatches = allOpenEnriched
      .filter((m) => {
        const total = m.teamSize * 2;
        const filled = m.teamA.length + m.teamB.length;
        const spotsLeft = total - filled;
        return spotsLeft > 0 && spotsLeft <= 2;
      })
      .slice(0, 8);

    // ── Today's matches (open or full, today in Tehran)
    const { startOfDay, endOfDay } = getTehranDayBounds(now);
    const todayMatchRows = await db
      .select()
      .from(matches)
      .where(
        and(
          inArray(matches.status, ["open", "full"]),
          gte(matches.scheduledAt, now),
          gte(matches.scheduledAt, startOfDay),
          lte(matches.scheduledAt, endOfDay)
        )
      )
      .orderBy(asc(matches.scheduledAt))
      .limit(8);

    const todayMatches = await enrichMatches(todayMatchRows);

    // ── Newest matches (open, future, ordered by creation)
    const newestMatchRows = await db
      .select()
      .from(matches)
      .where(and(eq(matches.status, "open"), gte(matches.scheduledAt, now)))
      .orderBy(desc(matches.createdAt))
      .limit(8);

    const newestMatches = await enrichMatches(newestMatchRows);

    // ── Featured courts (active, limited)
    const featuredCourts = await db
      .select()
      .from(courts)
      .where(eq(courts.isActive, true))
      .orderBy(asc(courts.name))
      .limit(8);

    // ── Active promotions
    const activePromotions = await db
      .select()
      .from(promotions)
      .where(eq(promotions.isActive, true))
      .orderBy(asc(promotions.sortOrder))
      .limit(6);

    const activeDealRows = await db
      .select({
        id: deals.id,
        courtId: deals.courtId,
        slotDate: deals.slotDate,
        slotStart: deals.slotStart,
        slotEnd: deals.slotEnd,
        validUntil: deals.validUntil,
      })
      .from(deals)
      .where(eq(deals.isActive, true));

    const dealCourtIds = [...new Set(activeDealRows.map((deal) => deal.courtId).filter(Boolean))];
    const activeBookingRows = dealCourtIds.length > 0
      ? await db
          .select({
            courtId: bookings.courtId,
            date: bookings.date,
            startTime: bookings.startTime,
            endTime: bookings.endTime,
            status: bookings.status,
          })
          .from(bookings)
          .where(and(inArray(bookings.courtId, dealCourtIds), inArray(bookings.status, ["pending", "approved"])))
      : [];

    const expiredActiveDealIds = activeDealRows
      .filter((deal) => isDealExpiredByTime(deal, now))
      .map((deal) => deal.id);

    const bookedActiveDealIds = activeDealRows
      .filter((deal) => isDealSlotBookedOrPending(activeBookingRows, deal))
      .map((deal) => deal.id);

    const deactivatedDealIds = [...new Set([...expiredActiveDealIds, ...bookedActiveDealIds])];

    if (deactivatedDealIds.length > 0) {
      await db
        .update(deals)
        .set({ isActive: false })
        .where(and(eq(deals.isActive, true), inArray(deals.id, deactivatedDealIds)));
    }

    // ── Active deals (not expired)
    const dealRows = await db
      .select({
        id: deals.id,
        slotDate: deals.slotDate,
        slotStart: deals.slotStart,
        slotEnd: deals.slotEnd,
        discountPercent: deals.discountPercent,
        validUntil: deals.validUntil,
        court: {
          id: courts.id,
          clubId: courts.clubId,
          name: courts.name,
          location: courts.location,
          sportType: courts.sportType,
          pricePerHour: courts.pricePerHour,
          image: courts.image,
        },
      })
      .from(deals)
      .innerJoin(courts, eq(deals.courtId, courts.id))
      .where(
        and(
          eq(deals.isActive, true),
          gte(deals.validUntil, now)
        )
      )
      .orderBy(asc(deals.validUntil))
      .limit(24);

    const activeDeals = dealRows
      .filter((deal) => !isDealExpiredByTime(deal, now))
      .slice(0, 6);

    // ── User's pending bookings count
    const userBookings = await db
      .select({ status: bookings.status })
      .from(bookings)
      .where(eq(bookings.userId, userId));

    const bookingSummary = {
      pending: userBookings.filter((b) => b.status === "pending").length,
      approved: userBookings.filter((b) => b.status === "approved").length,
      total: userBookings.length,
    };

    return res.status(200).json({
      upcomingMatches,
      almostFullMatches,
      todayMatches,
      newestMatches,
      featuredCourts,
      promotions: activePromotions,
      deals: activeDeals,
      bookingSummary,
    });
  } catch (error) {
    console.error("getHome error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};
