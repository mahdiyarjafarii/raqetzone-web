import { eq, and, asc, gte, lte, desc, ne } from "drizzle-orm";
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

    // ── Active deals (not expired)
    const activeDeals = await db
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
      .limit(6);

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
