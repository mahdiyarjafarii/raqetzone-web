import { and, desc, eq, gt, gte, ilike, isNotNull, isNull, lt, or, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { clubs, rankingEvents, userRankings, users } from "../db/schema.js";

const toDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const getLeaderboardController = async (req, res) => {
  try {
    const limitRaw = Number(req.query.limit ?? 100);
    const offsetRaw = Number(req.query.offset ?? 0);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 200) : 100;
    const offset = Number.isFinite(offsetRaw) ? Math.max(offsetRaw, 0) : 0;
    const city = typeof req.query.city === "string" ? req.query.city.trim() : "";
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const sport = typeof req.query.sport === "string" && req.query.sport.trim()
      ? req.query.sport.trim()
      : "padel";

    const whereConditions = [];
    whereConditions.push(isNull(clubs.ownerId));
    whereConditions.push(isNotNull(users.firstName));
    whereConditions.push(isNotNull(users.lastName));
    if (city) whereConditions.push(eq(users.city, city));
    if (search) {
      const pattern = `%${search}%`;
      whereConditions.push(
        or(
          ilike(users.name, pattern),
          ilike(users.firstName, pattern),
          ilike(users.lastName, pattern)
        )
      );
    }

    const whereCondition = whereConditions.length > 0 ? and(...whereConditions) : undefined;
    const withOptionalWhere = (...conditions) => {
      const filtered = conditions.filter(Boolean);
      return filtered.length > 0 ? and(...filtered) : undefined;
    };

    const [totalRow] = await db
      .select({ count: sql`count(*)` })
      .from(users)
      .leftJoin(userRankings, and(eq(userRankings.userId, users.id), eq(userRankings.sportType, sport)))
      .leftJoin(clubs, eq(clubs.ownerId, users.id))
      .where(whereCondition);

    const total = Number(totalRow?.count ?? 0);

    const rows = await db
      .select({
        userId: users.id,
        name: users.name,
        firstName: users.firstName,
        lastName: users.lastName,
        image: users.image,
        city: users.city,
        isCoach: users.isCoach,
        points: sql`COALESCE(${userRankings.points}, 0)`,
        matchPoints: sql`COALESCE(${userRankings.matchPoints}, 0)`,
        tournamentPoints: sql`COALESCE(${userRankings.tournamentPoints}, 0)`,
        matchesCount: sql`COALESCE(${userRankings.matchesCount}, 0)`,
        tournamentsCount: sql`COALESCE(${userRankings.tournamentsCount}, 0)`,
      })
      .from(users)
      .leftJoin(userRankings, and(eq(userRankings.userId, users.id), eq(userRankings.sportType, sport)))
      .leftJoin(clubs, eq(clubs.ownerId, users.id))
      .where(whereCondition)
      .orderBy(desc(sql`COALESCE(${userRankings.points}, 0)`), desc(users.createdAt))
      .limit(limit)
      .offset(offset);

    const leaderboard = rows.map((row, index) => ({
      rank: offset + index + 1,
      ...row,
      points: Number(row.points ?? 0),
      matchPoints: Number(row.matchPoints ?? 0),
      tournamentPoints: Number(row.tournamentPoints ?? 0),
      matchesCount: Number(row.matchesCount ?? 0),
      tournamentsCount: Number(row.tournamentsCount ?? 0),
    }));

    let currentUserRank = null;
    let currentUserSummary = null;
    if (req.user?.id) {
      const [currentUserRow] = await db
        .select({
          userId: users.id,
          createdAt: users.createdAt,
          name: users.name,
          points: sql`COALESCE(${userRankings.points}, 0)`,
          matchPoints: sql`COALESCE(${userRankings.matchPoints}, 0)`,
          tournamentPoints: sql`COALESCE(${userRankings.tournamentPoints}, 0)`,
        })
        .from(users)
        .leftJoin(userRankings, and(eq(userRankings.userId, users.id), eq(userRankings.sportType, sport)))
        .leftJoin(clubs, eq(clubs.ownerId, users.id))
        .where(withOptionalWhere(whereCondition, eq(users.id, req.user.id)));

      if (currentUserRow) {
        const currentUserCreatedAt = toDate(currentUserRow.createdAt);
        const tieBreakerCondition = currentUserCreatedAt
          ? gt(users.createdAt, currentUserCreatedAt)
          : sql`false`;

        const [rankRow] = await db
          .select({
            count: sql`count(*)`,
          })
          .from(users)
          .leftJoin(userRankings, and(eq(userRankings.userId, users.id), eq(userRankings.sportType, sport)))
          .leftJoin(clubs, eq(clubs.ownerId, users.id))
          .where(
            withOptionalWhere(
              whereCondition,
              or(
                sql`COALESCE(${userRankings.points}, 0) > ${currentUserRow.points}`,
                and(
                  sql`COALESCE(${userRankings.points}, 0) = ${currentUserRow.points}`,
                  tieBreakerCondition
                )
              )
            )
          );

        currentUserRank = Number(rankRow?.count ?? 0) + 1;

        const now = new Date();
        const currentStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const previousStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

        const [currentWindow] = await db
          .select({ points: sql`COALESCE(SUM(${rankingEvents.points}), 0)` })
          .from(rankingEvents)
          .where(
            and(
              eq(rankingEvents.userId, currentUserRow.userId),
              eq(rankingEvents.sportType, sport),
              gte(rankingEvents.createdAt, currentStart),
              lt(rankingEvents.createdAt, now)
            )
          );

        const [previousWindow] = await db
          .select({ points: sql`COALESCE(SUM(${rankingEvents.points}), 0)` })
          .from(rankingEvents)
          .where(
            and(
              eq(rankingEvents.userId, currentUserRow.userId),
              eq(rankingEvents.sportType, sport),
              gte(rankingEvents.createdAt, previousStart),
              lt(rankingEvents.createdAt, currentStart)
            )
          );

        const currentWeeklyPoints = Number(currentWindow?.points ?? 0);
        const previousWeeklyPoints = Number(previousWindow?.points ?? 0);
        const delta = currentWeeklyPoints - previousWeeklyPoints;
        const trend = delta > 0 ? "up" : delta < 0 ? "down" : "flat";

        currentUserSummary = {
          userId: currentUserRow.userId,
          name: currentUserRow.name,
          points: Number(currentUserRow.points ?? 0),
          matchPoints: Number(currentUserRow.matchPoints ?? 0),
          tournamentPoints: Number(currentUserRow.tournamentPoints ?? 0),
          sportType: sport,
          weeklyPoints: currentWeeklyPoints,
          previousWeeklyPoints,
          delta,
          trend,
        };
      }
    }

    return res.status(200).json({
      leaderboard,
      pagination: {
        limit,
        offset,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
      sport,
      currentUserRank,
      currentUserSummary,
    });
  } catch (error) {
    console.error("getLeaderboard error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};
