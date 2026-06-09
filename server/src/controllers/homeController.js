import { eq, and, asc, gte, lte, desc, ne, inArray } from "drizzle-orm";
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

export const getHomeController = async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();

    // ── Upcoming matches (open, future)
    const matchRows = await db
      .select()
      .from(matches)
      .where(and(eq(matches.status, "open"), gte(matches.scheduledAt, now)))
      .orderBy(asc(matches.scheduledAt))
      .limit(6);

    const upcomingMatches = await enrichMatches(matchRows);

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
        slotDate: deals.slotDate,
        slotEnd: deals.slotEnd,
        validUntil: deals.validUntil,
      })
      .from(deals)
      .where(eq(deals.isActive, true));

    const expiredActiveDealIds = activeDealRows
      .filter((deal) => isDealExpiredByTime(deal, now))
      .map((deal) => deal.id);

    if (expiredActiveDealIds.length > 0) {
      await db
        .update(deals)
        .set({ isActive: false })
        .where(and(eq(deals.isActive, true), inArray(deals.id, expiredActiveDealIds)));
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
