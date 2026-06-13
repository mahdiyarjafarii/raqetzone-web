import { eq, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { rankingEvents, userRankings } from "../db/schema.js";

export const MATCH_WIN_POINTS = 3;
const DEFAULT_SPORT = "padel";

export async function ensureRankRows(userIds = [], sportType = DEFAULT_SPORT) {
  const normalized = [...new Set(userIds.filter(Boolean).map(String))];
  if (normalized.length === 0) return;
  const resolvedSportType = typeof sportType === "string" && sportType.trim() ? sportType.trim() : DEFAULT_SPORT;

  await db
    .insert(userRankings)
    .values(normalized.map((userId) => ({ userId, sportType: resolvedSportType })))
    .onConflictDoNothing({ target: [userRankings.userId, userRankings.sportType] });
}

export async function awardRankingPoints({ sourceType, sourceId, category, sportType = DEFAULT_SPORT, awards = [], metadata = {} }) {
  if (!sourceType || !sourceId || !category || !Array.isArray(awards) || awards.length === 0) {
    return { awardedCount: 0 };
  }
  const resolvedSportType = typeof sportType === "string" && sportType.trim() ? sportType.trim() : DEFAULT_SPORT;

  const normalizedAwards = awards
    .map((row) => ({
      userId: row?.userId,
      points: Number(row?.points ?? 0),
    }))
    .filter((row) => row.userId && Number.isFinite(row.points) && row.points > 0);

  if (normalizedAwards.length === 0) {
    return { awardedCount: 0 };
  }

  await ensureRankRows(normalizedAwards.map((row) => row.userId), resolvedSportType);

  const eventRows = normalizedAwards.map((row) => ({
    sourceType,
    sourceId,
    userId: row.userId,
    sportType: resolvedSportType,
    category,
    points: row.points,
    metadata,
  }));

  const insertedEvents = await db
    .insert(rankingEvents)
    .values(eventRows)
    .onConflictDoNothing({
      target: [rankingEvents.sourceType, rankingEvents.sourceId, rankingEvents.userId],
    })
    .returning({ userId: rankingEvents.userId, points: rankingEvents.points, category: rankingEvents.category });

  for (const eventRow of insertedEvents) {
    const isMatch = eventRow.category === "match";
    const isTournament = eventRow.category === "tournament";

    await db
      .update(userRankings)
      .set({
        points: sql`${userRankings.points} + ${eventRow.points}`,
        matchPoints: isMatch
          ? sql`${userRankings.matchPoints} + ${eventRow.points}`
          : sql`${userRankings.matchPoints}`,
        tournamentPoints: isTournament
          ? sql`${userRankings.tournamentPoints} + ${eventRow.points}`
          : sql`${userRankings.tournamentPoints}`,
        matchesCount: isMatch
          ? sql`${userRankings.matchesCount} + 1`
          : sql`${userRankings.matchesCount}`,
        tournamentsCount: isTournament
          ? sql`${userRankings.tournamentsCount} + 1`
          : sql`${userRankings.tournamentsCount}`,
        updatedAt: new Date(),
      })
      .where(
        sql`${userRankings.userId} = ${eventRow.userId} AND ${userRankings.sportType} = ${resolvedSportType}`
      );
  }

  return { awardedCount: insertedEvents.length };
}

export function buildTournamentAwards(standings = [], championPoints = 10) {
  const points = Math.max(1, Number(championPoints) || 10);
  const second = Math.max(1, Math.round(points * 0.7));
  const third = Math.max(1, Math.round(points * 0.5));
  const fourth = Math.max(1, Math.round(points * 0.3));

  return standings
    .map((row) => {
      const rank = Number(row.rank ?? 0);
      if (!Number.isFinite(rank) || rank <= 0) return null;

      let award = 1;
      if (rank === 1) award = points;
      else if (rank === 2) award = second;
      else if (rank === 3) award = third;
      else if (rank === 4) award = fourth;

      return { userId: row.userId, points: award };
    })
    .filter(Boolean);
}
