import { and, desc, eq, gt, ilike, isNotNull, isNull, or, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { clubs, leaderboardMonthlySnapshots, rankingEvents, userRankings, users } from "../db/schema.js";

const toDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const TEHRAN_TZ = "Asia/Tehran";
const TEHRAN_OFFSET_MS = 3.5 * 60 * 60 * 1000; // UTC+3:30 in ms

/** Convert Persian/Arabic-Indic digit string to a plain integer */
function parseIntlNum(str) {
  return parseInt(
    String(str).replace(/[۰-۹]/g, (d) => "0123456789"["۰۱۲۳۴۵۶۷۸۹".indexOf(d)])
  );
}

/** Get current Persian year and month in Tehran timezone */
function getCurrentPersianYearMonth() {
  const parts = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    year: "numeric", month: "numeric", timeZone: TEHRAN_TZ,
  }).formatToParts(new Date());
  return {
    year: parseIntlNum(parts.find((p) => p.type === "year")?.value),
    month: parseIntlNum(parts.find((p) => p.type === "month")?.value),
  };
}

/** Convert any UTC Date to Persian year/month in Tehran */
function dateToPersianYearMonth(date) {
  const parts = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    year: "numeric", month: "numeric", timeZone: TEHRAN_TZ,
  }).formatToParts(date);
  return {
    year: parseIntlNum(parts.find((p) => p.type === "year")?.value),
    month: parseIntlNum(parts.find((p) => p.type === "month")?.value),
  };
}

/**
 * Find the UTC timestamp for 00:00 Tehran on the 1st day of a Persian month.
 * Strategy: approximate the Gregorian date, then search ±5 days.
 */
function findPersianMonthStartUTC(pYear, pMonth) {
  // Persian year starts ~March 20 of Gregorian year pYear+621
  const approxBase = new Date(Date.UTC(pYear + 621, 2, 18)); // March 18
  const monthDays = [0, 31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];
  let daysOffset = 0;
  for (let m = 1; m < pMonth; m++) daysOffset += monthDays[m];
  const approx = new Date(approxBase.getTime() + daysOffset * 86400000);

  for (let d = -2; d <= 6; d++) {
    const candidate = new Date(approx.getTime() + d * 86400000); // UTC midnight
    const parts = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
      year: "numeric", month: "numeric", day: "numeric", timeZone: TEHRAN_TZ,
    }).formatToParts(candidate);
    const py = parseIntlNum(parts.find((p) => p.type === "year")?.value);
    const pm = parseIntlNum(parts.find((p) => p.type === "month")?.value);
    const pd = parseIntlNum(parts.find((p) => p.type === "day")?.value);
    if (py === pYear && pm === pMonth && pd === 1) {
      // candidate UTC midnight = 03:30 Tehran on day 1
      // 00:00 Tehran on day 1 = candidate - 3.5h
      return new Date(candidate.getTime() - TEHRAN_OFFSET_MS);
    }
  }
  throw new Error(`Cannot find UTC start for Persian month ${pYear}/${pMonth}`);
}

/** Returns [startISO, endISO) for a Persian year/month boundary in UTC */
function persianMonthBounds(pYear, pMonth) {
  const start = findPersianMonthStartUTC(pYear, pMonth);
  const [ny, nm] = pMonth === 12 ? [pYear + 1, 1] : [pYear, pMonth + 1];
  const end = findPersianMonthStartUTC(ny, nm);
  return [start.toISOString(), end.toISOString()];
}

// Simple in-process cache keyed by "sport:year:month:limit:offset:search:city"
const _cache = new Map();
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes

function cacheKey(parts) {
  return parts.join(":");
}
function cacheGet(key) {
  const entry = _cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    _cache.delete(key);
    return null;
  }
  return entry.data;
}
function cacheSet(key, data) {
  _cache.set(key, { ts: Date.now(), data });
}

export const getLeaderboardController = async (req, res) => {
  try {
    const limitRaw = Number(req.query.limit ?? 50);
    const offsetRaw = Number(req.query.offset ?? 0);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 200) : 50;
    const offset = Number.isFinite(offsetRaw) ? Math.max(offsetRaw, 0) : 0;
    const city = typeof req.query.city === "string" ? req.query.city.trim() : "";
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const sport = typeof req.query.sport === "string" && req.query.sport.trim()
      ? req.query.sport.trim()
      : "padel";

    // Monthly mode: use Persian calendar (Tehran timezone)
    const { year: currentYear, month: currentMonth } = getCurrentPersianYearMonth();

    const yearRaw = Number(req.query.year ?? currentYear);
    const monthRaw = Number(req.query.month ?? currentMonth);
    const year = Number.isFinite(yearRaw) && yearRaw >= 1380 && yearRaw <= 1500 ? yearRaw : currentYear;
    const month = Number.isFinite(monthRaw) && monthRaw >= 1 && monthRaw <= 12 ? monthRaw : currentMonth;

    const isCurrentPeriod = year === currentYear && month === currentMonth;

    const ck = cacheKey([sport, year, month, limit, offset, search, city]);
    const cached = cacheGet(ck);
    if (cached) {
      return res.status(200).json(cached);
    }

    const [periodStart, periodEnd] = persianMonthBounds(year, month);

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

    // Monthly points subquery: sum of ranking_events in the period
    const monthlyPointsExpr = sql`COALESCE((
      SELECT SUM(re.points) FROM ranking_events re
      WHERE re.user_id = ${users.id}
        AND re.sport_type = ${sport}
        AND re.created_at >= ${periodStart}
        AND re.created_at < ${periodEnd}
    ), 0)`;

    const monthlyMatchPointsExpr = sql`COALESCE((
      SELECT SUM(re.points) FROM ranking_events re
      WHERE re.user_id = ${users.id}
        AND re.sport_type = ${sport}
        AND re.category = 'match'
        AND re.created_at >= ${periodStart}
        AND re.created_at < ${periodEnd}
    ), 0)`;

    const monthlyTournamentPointsExpr = sql`COALESCE((
      SELECT SUM(re.points) FROM ranking_events re
      WHERE re.user_id = ${users.id}
        AND re.sport_type = ${sport}
        AND re.category = 'tournament'
        AND re.created_at >= ${periodStart}
        AND re.created_at < ${periodEnd}
    ), 0)`;

    const monthlyMatchesCountExpr = sql`COALESCE((
      SELECT COUNT(*) FROM ranking_events re
      WHERE re.user_id = ${users.id}
        AND re.sport_type = ${sport}
        AND re.category = 'match'
        AND re.created_at >= ${periodStart}
        AND re.created_at < ${periodEnd}
    ), 0)`;

    const monthlyTournamentsCountExpr = sql`COALESCE((
      SELECT COUNT(*) FROM ranking_events re
      WHERE re.user_id = ${users.id}
        AND re.sport_type = ${sport}
        AND re.category = 'tournament'
        AND re.created_at >= ${periodStart}
        AND re.created_at < ${periodEnd}
    ), 0)`;

    // Total count (only users who participated this period or all-time for embedded)
    const [totalRow] = await db
      .select({ count: sql`count(*)` })
      .from(users)
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
        points: monthlyPointsExpr,
        matchPoints: monthlyMatchPointsExpr,
        tournamentPoints: monthlyTournamentPointsExpr,
        matchesCount: monthlyMatchesCountExpr,
        tournamentsCount: monthlyTournamentsCountExpr,
      })
      .from(users)
      .leftJoin(clubs, eq(clubs.ownerId, users.id))
      .where(whereCondition)
      .orderBy(desc(monthlyPointsExpr), desc(users.createdAt))
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

    // Top score for progress bars
    const topPoints = leaderboard.length > 0 ? leaderboard[0].points : 0;

    let currentUserRank = null;
    let currentUserSummary = null;
    if (req.user?.id) {
      const [currentUserRow] = await db
        .select({
          userId: users.id,
          createdAt: users.createdAt,
          name: users.name,
          points: monthlyPointsExpr,
          matchPoints: monthlyMatchPointsExpr,
          tournamentPoints: monthlyTournamentPointsExpr,
        })
        .from(users)
        .leftJoin(clubs, eq(clubs.ownerId, users.id))
        .where(withOptionalWhere(isNull(clubs.ownerId), eq(users.id, req.user.id)));

      if (currentUserRow) {
        const userPoints = Number(currentUserRow.points ?? 0);
        const currentUserCreatedAt = toDate(currentUserRow.createdAt);
        const tieBreakerCondition = currentUserCreatedAt
          ? gt(users.createdAt, currentUserCreatedAt)
          : sql`false`;

        const monthlyUserPoints = sql`COALESCE((
          SELECT SUM(re.points) FROM ranking_events re
          WHERE re.user_id = users.id
            AND re.sport_type = ${sport}
            AND re.created_at >= ${periodStart}
            AND re.created_at < ${periodEnd}
        ), 0)`;

        const [rankRow] = await db
          .select({ count: sql`count(*)` })
          .from(users)
          .leftJoin(clubs, eq(clubs.ownerId, users.id))
          .where(
            withOptionalWhere(
              isNull(clubs.ownerId),
              isNotNull(users.firstName),
              isNotNull(users.lastName),
              or(
                sql`(SELECT COALESCE(SUM(re.points), 0) FROM ranking_events re WHERE re.user_id = users.id AND re.sport_type = ${sport} AND re.created_at >= ${periodStart} AND re.created_at < ${periodEnd}) > ${userPoints}`,
                and(
                  sql`(SELECT COALESCE(SUM(re.points), 0) FROM ranking_events re WHERE re.user_id = users.id AND re.sport_type = ${sport} AND re.created_at >= ${periodStart} AND re.created_at < ${periodEnd}) = ${userPoints}`,
                  tieBreakerCondition
                )
              )
            )
          );

        currentUserRank = Number(rankRow?.count ?? 0) + 1;

        // Previous month trend
        const [prevStart, prevEnd] = persianMonthBounds(month === 1 ? year - 1 : year, month === 1 ? 12 : month - 1);
        const [prevWindow] = await db
          .select({ points: sql`COALESCE(SUM(${rankingEvents.points}), 0)` })
          .from(rankingEvents)
          .where(
            and(
              eq(rankingEvents.userId, currentUserRow.userId),
              eq(rankingEvents.sportType, sport),
              sql`${rankingEvents.createdAt} >= ${prevStart}::timestamptz`,
              sql`${rankingEvents.createdAt} < ${prevEnd}::timestamptz`
            )
          );

        const prevMonthPoints = Number(prevWindow?.points ?? 0);
        const delta = userPoints - prevMonthPoints;
        const trend = delta > 0 ? "up" : delta < 0 ? "down" : "flat";

        // Nearest top-10 distance
        const distanceToTop10 = Math.max(0, currentUserRank - 10);

        currentUserSummary = {
          userId: currentUserRow.userId,
          name: currentUserRow.name,
          points: userPoints,
          matchPoints: Number(currentUserRow.matchPoints ?? 0),
          tournamentPoints: Number(currentUserRow.tournamentPoints ?? 0),
          sportType: sport,
          periodYear: year,
          periodMonth: month,
          prevMonthPoints,
          delta,
          trend,
          distanceToTop10,
        };
      }
    }

    const payload = {
      leaderboard,
      topPoints,
      pagination: {
        limit,
        offset,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        hasMore: offset + limit < total,
      },
      sport,
      period: { year, month, isCurrentPeriod },
      currentUserRank,
      currentUserSummary,
    };

    // Cache only current period results (past months are immutable, always cacheable longer — but keep it simple)
    cacheSet(ck, payload);

    return res.status(200).json(payload);
  } catch (error) {
    console.error("getLeaderboard error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

/** Snapshot current month leaderboard into leaderboard_monthly_snapshots */
export const snapshotMonthlyLeaderboard = async (year, month, sport = "padel") => {
  const [periodStart, periodEnd] = persianMonthBounds(year, month);

  const rows = await db
    .select({
      userId: users.id,
      points: sql`COALESCE((SELECT SUM(re.points) FROM ranking_events re WHERE re.user_id = users.id AND re.sport_type = ${sport} AND re.created_at >= ${periodStart} AND re.created_at < ${periodEnd}), 0)`,
      matchPoints: sql`COALESCE((SELECT SUM(re.points) FROM ranking_events re WHERE re.user_id = users.id AND re.sport_type = ${sport} AND re.category = 'match' AND re.created_at >= ${periodStart} AND re.created_at < ${periodEnd}), 0)`,
      tournamentPoints: sql`COALESCE((SELECT SUM(re.points) FROM ranking_events re WHERE re.user_id = users.id AND re.sport_type = ${sport} AND re.category = 'tournament' AND re.created_at >= ${periodStart} AND re.created_at < ${periodEnd}), 0)`,
      matchesCount: sql`COALESCE((SELECT COUNT(*) FROM ranking_events re WHERE re.user_id = users.id AND re.sport_type = ${sport} AND re.category = 'match' AND re.created_at >= ${periodStart} AND re.created_at < ${periodEnd}), 0)`,
      tournamentsCount: sql`COALESCE((SELECT COUNT(*) FROM ranking_events re WHERE re.user_id = users.id AND re.sport_type = ${sport} AND re.category = 'tournament' AND re.created_at >= ${periodStart} AND re.created_at < ${periodEnd}), 0)`,
    })
    .from(users)
    .leftJoin(clubs, eq(clubs.ownerId, users.id))
    .where(and(isNull(clubs.ownerId), isNotNull(users.firstName), isNotNull(users.lastName)))
    .orderBy(desc(sql`COALESCE((SELECT SUM(re.points) FROM ranking_events re WHERE re.user_id = users.id AND re.sport_type = ${sport} AND re.created_at >= ${periodStart} AND re.created_at < ${periodEnd}), 0)`), desc(users.createdAt));

  const snapshots = rows
    .map((row, index) => ({
      userId: row.userId,
      sportType: sport,
      periodYear: year,
      periodMonth: month,
      rank: index + 1,
      points: Number(row.points ?? 0),
      matchPoints: Number(row.matchPoints ?? 0),
      tournamentPoints: Number(row.tournamentPoints ?? 0),
      matchesCount: Number(row.matchesCount ?? 0),
      tournamentsCount: Number(row.tournamentsCount ?? 0),
    }))
    .filter((row) => row.points > 0); // only snapshot users who actually played

  if (snapshots.length === 0) return { snapshotCount: 0 };

  // Batch insert in chunks of 500
  const chunkSize = 500;
  let inserted = 0;
  for (let i = 0; i < snapshots.length; i += chunkSize) {
    const chunk = snapshots.slice(i, i + chunkSize);
    await db
      .insert(leaderboardMonthlySnapshots)
      .values(chunk)
      .onConflictDoNothing({
        target: [leaderboardMonthlySnapshots.userId, leaderboardMonthlySnapshots.sportType, leaderboardMonthlySnapshots.periodYear, leaderboardMonthlySnapshots.periodMonth],
      });
    inserted += chunk.length;
  }

  return { snapshotCount: inserted };
};

/** GET /api/rankings/history?year=2026&month=5&sport=padel&limit=50&offset=0 */
export const getMonthlyHistoryController = async (req, res) => {
  try {
    const now = new Date();
    const yearRaw = Number(req.query.year ?? now.getUTCFullYear());
    const monthRaw = Number(req.query.month ?? now.getUTCMonth() + 1);
    const year = Number.isFinite(yearRaw) ? yearRaw : now.getUTCFullYear();
    const month = Number.isFinite(monthRaw) && monthRaw >= 1 && monthRaw <= 12 ? monthRaw : now.getUTCMonth() + 1;
    const sport = typeof req.query.sport === "string" && req.query.sport.trim() ? req.query.sport.trim() : "padel";
    const limitRaw = Number(req.query.limit ?? 50);
    const offsetRaw = Number(req.query.offset ?? 0);
    const limit = Math.min(Math.max(limitRaw, 1), 200);
    const offset = Math.max(offsetRaw, 0);

    const [totalRow] = await db
      .select({ count: sql`count(*)` })
      .from(leaderboardMonthlySnapshots)
      .where(
        and(
          eq(leaderboardMonthlySnapshots.sportType, sport),
          eq(leaderboardMonthlySnapshots.periodYear, year),
          eq(leaderboardMonthlySnapshots.periodMonth, month)
        )
      );

    const total = Number(totalRow?.count ?? 0);

    const rows = await db
      .select({
        rank: leaderboardMonthlySnapshots.rank,
        userId: leaderboardMonthlySnapshots.userId,
        name: users.name,
        firstName: users.firstName,
        lastName: users.lastName,
        image: users.image,
        city: users.city,
        points: leaderboardMonthlySnapshots.points,
        matchPoints: leaderboardMonthlySnapshots.matchPoints,
        tournamentPoints: leaderboardMonthlySnapshots.tournamentPoints,
        matchesCount: leaderboardMonthlySnapshots.matchesCount,
        tournamentsCount: leaderboardMonthlySnapshots.tournamentsCount,
      })
      .from(leaderboardMonthlySnapshots)
      .leftJoin(users, eq(users.id, leaderboardMonthlySnapshots.userId))
      .where(
        and(
          eq(leaderboardMonthlySnapshots.sportType, sport),
          eq(leaderboardMonthlySnapshots.periodYear, year),
          eq(leaderboardMonthlySnapshots.periodMonth, month)
        )
      )
      .orderBy(leaderboardMonthlySnapshots.rank)
      .limit(limit)
      .offset(offset);

    return res.status(200).json({
      leaderboard: rows,
      topPoints: rows.length > 0 ? rows[0].points : 0,
      pagination: { limit, offset, total, totalPages: Math.max(1, Math.ceil(total / limit)), hasMore: offset + limit < total },
      sport,
      period: { year, month, isCurrentPeriod: false },
    });
  } catch (error) {
    console.error("getMonthlyHistory error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

/** GET /api/rankings/periods?sport=padel — returns months that have at least 1 ranking_event */
export const getActivePeriodsController = async (req, res) => {
  try {
    const sport = typeof req.query.sport === "string" && req.query.sport.trim() ? req.query.sport.trim() : "padel";

    const rows = await db
      .select({
        year: sql`EXTRACT(YEAR FROM ${rankingEvents.createdAt})::int`,
        month: sql`EXTRACT(MONTH FROM ${rankingEvents.createdAt})::int`,
      })
      .from(rankingEvents)
      .where(eq(rankingEvents.sportType, sport))
      .groupBy(
        sql`EXTRACT(YEAR FROM ${rankingEvents.createdAt})`,
        sql`EXTRACT(MONTH FROM ${rankingEvents.createdAt})`
      )
      .orderBy(
        desc(sql`EXTRACT(YEAR FROM ${rankingEvents.createdAt})`),
        desc(sql`EXTRACT(MONTH FROM ${rankingEvents.createdAt})`)
      );

    // Convert UTC year/month to Persian year/month (check multiple days per UTC month to catch boundary events)
    const persianPeriodsMap = new Map();
    for (const row of rows) {
      for (const day of [1, 15, 22]) {
        const d = new Date(Date.UTC(row.year, row.month - 1, day));
        if (d.getUTCMonth() !== row.month - 1) break; // day past end of month
        const { year: py, month: pm } = dateToPersianYearMonth(d);
        const key = `${py}-${pm}`;
        if (!persianPeriodsMap.has(key)) persianPeriodsMap.set(key, { year: py, month: pm });
      }
    }

    // Sort descending
    const persianPeriods = Array.from(persianPeriodsMap.values())
      .sort((a, b) => (b.year !== a.year ? b.year - a.year : b.month - a.month));

    // Always include current Persian month even if no data yet
    const { year: currentYear, month: currentMonth } = getCurrentPersianYearMonth();
    const hasCurrent = persianPeriods.some((r) => r.year === currentYear && r.month === currentMonth);
    const periods = hasCurrent ? persianPeriods : [{ year: currentYear, month: currentMonth }, ...persianPeriods];

    return res.status(200).json({ periods, sport });
  } catch (error) {
    console.error("getActivePeriods error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};
