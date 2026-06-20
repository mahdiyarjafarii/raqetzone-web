import { eq, and, asc, ne, gte, lte, notInArray, inArray } from "drizzle-orm";
import { randomBytes } from "crypto";
import { db } from "../db/index.js";
import {
  matches,
  matchParticipants,
  matchRatings,
  matchResults,
  matchResultVotes,
  users,
  courts,
  bookings,
  slotOverrides,
} from "../db/schema.js";
import { sendSMS, broadcastSMS } from "../utils/sms.js";
import { awardRankingPoints, MATCH_WIN_POINTS } from "../utils/ranking.js";

const RATING_TAGS = [
  "وقت‌شناس", "خوش‌اخلاق", "تیمی", "رقابتی", "مبتدی‌فرندلی",
  "حرفه‌ای", "شاد", "منضبط",
];

const SPORT_TYPES = ["padel", "tennis", "squash", "badminton", "ping-pong"];
const TEHRAN_OFFSET = "+03:30";
const MATCH_DURATION_MINUTES = 90;
const AWAITING_RESULT_GRACE_MS = 24 * 60 * 60 * 1000;

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function enrichMatch(match) {
  let creator = null;
  if (match.createdBy) {
    const [creatorRow] = await db
      .select({
        id: users.id,
        name: users.name,
        image: users.image,
      })
      .from(users)
      .where(eq(users.id, match.createdBy))
      .limit(1);
    creator = creatorRow ?? null;
  }

  const participants = await db
    .select({
      id: matchParticipants.id,
      team: matchParticipants.team,
      joinedAt: matchParticipants.joinedAt,
      userId: users.id,
      name: users.name,
      image: users.image,
    })
    .from(matchParticipants)
    .innerJoin(users, eq(matchParticipants.userId, users.id))
    .where(eq(matchParticipants.matchId, match.id))
    .orderBy(asc(matchParticipants.joinedAt));

  const teamA = participants.filter((p) => p.team === "A");
  const teamB = participants.filter((p) => p.team === "B");

  return { ...withMatchState(match), creator, teamA, teamB };
}

export const getMatchResultController = async (req, res) => {
  try {
    const { id } = req.params;

    const [match] = await db
      .select()
      .from(matches)
      .where(eq(matches.id, id))
      .limit(1);

    if (!match) return res.status(404).json({ message: "مسابقه یافت نشد" });

    const expired = await expireAwaitingResultMatchIfNeeded(match);
    if (expired) {
      return res.status(410).json({ message: "مهلت ثبت نتیجه این بازی تمام شده است" });
    }

    const payload = await buildMatchResultPayload(match, req.user.id);
    return res.status(200).json(payload);
  } catch (error) {
    console.error("getMatchResult error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

export const submitMatchResultController = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { sets } = req.body;

    const [match] = await db
      .select()
      .from(matches)
      .where(eq(matches.id, id))
      .limit(1);

    if (!match) return res.status(404).json({ message: "مسابقه یافت نشد" });

    const expired = await expireAwaitingResultMatchIfNeeded(match);
    if (expired) {
      return res.status(410).json({ message: "مهلت ثبت نتیجه این بازی تمام شده است" });
    }

    if (!hasMatchEnded(match)) {
      return res.status(400).json({ message: "نتیجه‌گذاری بعد از پایان زمان بازی فعال می‌شود" });
    }
    if (match.status === "cancelled") {
      return res.status(409).json({ message: "برای بازی لغوشده نمی‌توان نتیجه ثبت کرد" });
    }

    const [participant] = await db
      .select({ id: matchParticipants.id })
      .from(matchParticipants)
      .where(and(eq(matchParticipants.matchId, id), eq(matchParticipants.userId, userId)))
      .limit(1);

    if (!participant) {
      return res.status(403).json({ message: "فقط بازیکنان همین مسابقه می‌توانند نتیجه ثبت کنند" });
    }

    const normalizedSets = normalizeMatchScoreSets(sets);
    if (!normalizedSets) {
      return res.status(400).json({ message: "فرمت نتیجه نامعتبر است" });
    }

    const winnerTeam = computeWinnerTeamFromSets(normalizedSets);
    if (!winnerTeam) {
      return res.status(400).json({ message: "از مجموع ست‌ها برنده مشخص نیست" });
    }

    const [existingResult] = await db
      .select()
      .from(matchResults)
      .where(eq(matchResults.matchId, id))
      .limit(1);

    let resultId = existingResult?.id;

    if (existingResult?.status === "confirmed") {
      return res.status(409).json({ message: "نتیجه این مسابقه قبلاً نهایی شده است" });
    }

    if (existingResult) {
      await db
        .update(matchResults)
        .set({
          submittedByUserId: userId,
          winnerTeam,
          scoreSets: normalizedSets,
          status: "pending",
          confirmedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(matchResults.id, existingResult.id));

      await db
        .delete(matchResultVotes)
        .where(eq(matchResultVotes.matchResultId, existingResult.id));
    } else {
      const [createdResult] = await db
        .insert(matchResults)
        .values({
          matchId: id,
          submittedByUserId: userId,
          winnerTeam,
          scoreSets: normalizedSets,
          status: "pending",
        })
        .returning();

      resultId = createdResult.id;
    }

    await db
      .insert(matchResultVotes)
      .values({ matchResultId: resultId, userId, vote: "confirm" })
      .onConflictDoUpdate({
        target: [matchResultVotes.matchResultId, matchResultVotes.userId],
        set: { vote: "confirm", updatedAt: new Date() },
      });

    await evaluateMatchResultStatus(match, resultId);

    const payload = await buildMatchResultPayload(match, userId);
    return res.status(200).json({ message: "نتیجه ثبت شد", ...payload });
  } catch (error) {
    console.error("submitMatchResult error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

export const voteMatchResultController = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { vote } = req.body;

    if (!vote || !["confirm", "reject"].includes(vote)) {
      return res.status(400).json({ message: "رای نامعتبر است" });
    }

    const [match] = await db
      .select()
      .from(matches)
      .where(eq(matches.id, id))
      .limit(1);

    if (!match) return res.status(404).json({ message: "مسابقه یافت نشد" });

    const expired = await expireAwaitingResultMatchIfNeeded(match);
    if (expired) {
      return res.status(410).json({ message: "مهلت ثبت نتیجه این بازی تمام شده است" });
    }

    const [participant] = await db
      .select({ id: matchParticipants.id })
      .from(matchParticipants)
      .where(and(eq(matchParticipants.matchId, id), eq(matchParticipants.userId, userId)))
      .limit(1);

    if (!participant) {
      return res.status(403).json({ message: "فقط بازیکنان همین مسابقه می‌توانند رای دهند" });
    }

    const [resultRow] = await db
      .select()
      .from(matchResults)
      .where(eq(matchResults.matchId, id))
      .limit(1);

    if (!resultRow) {
      return res.status(404).json({ message: "ابتدا باید نتیجه‌ای ثبت شود" });
    }

    if (resultRow.status === "confirmed") {
      return res.status(409).json({ message: "نتیجه این مسابقه نهایی شده است" });
    }

    await db
      .insert(matchResultVotes)
      .values({ matchResultId: resultRow.id, userId, vote })
      .onConflictDoUpdate({
        target: [matchResultVotes.matchResultId, matchResultVotes.userId],
        set: { vote, updatedAt: new Date() },
      });

    await evaluateMatchResultStatus(match, resultRow.id);

    const payload = await buildMatchResultPayload(match, userId);
    return res.status(200).json({ message: "رای شما ثبت شد", ...payload });
  } catch (error) {
    console.error("voteMatchResult error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

function timeToMinutes(value) {
  if (!value || typeof value !== "string") return NaN;
  const [h, m] = value.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return NaN;
  return h * 60 + m;
}

function getTehranDateAndTimeKey(date) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    dateKey: `${map.year}-${map.month}-${map.day}`,
    timeKey: `${map.hour}:${map.minute}`,
  };
}

function parseScheduledAt(value) {
  if (!value || typeof value !== "string") return null;
  const trimmedValue = value.trim();
  if (!trimmedValue) return null;

  const hasExplicitTimezone = /([zZ]|[+\-]\d{2}:\d{2})$/.test(trimmedValue);
  const normalized = hasExplicitTimezone
    ? trimmedValue
    : `${trimmedValue}:00${TEHRAN_OFFSET}`;

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function hasMatchStarted(match, now = new Date()) {
  if (!match?.scheduledAt) return false;
  const scheduledAt = new Date(match.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime())) return false;
  return scheduledAt <= now;
}

function hasMatchEnded(match, now = new Date()) {
  if (!match?.scheduledAt) return false;
  const scheduledAt = new Date(match.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime())) return false;
  const endAt = new Date(scheduledAt.getTime() + MATCH_DURATION_MINUTES * 60 * 1000);
  return endAt <= now;
}

function isMatchInProgress(match, now = new Date()) {
  if (!match) return false;
  if (!("status" in match)) return false;
  if (match.status !== "open" && match.status !== "full") return false;
  return hasMatchStarted(match, now) && !hasMatchEnded(match, now);
}

function isMatchAwaitingResult(match, now = new Date()) {
  if (!match) return false;
  if (!("status" in match)) return false;
  if (match.status !== "open" && match.status !== "full") return false;
  return hasMatchEnded(match, now);
}

function getAwaitingResultDeadline(match) {
  if (!match?.scheduledAt) return null;
  const scheduledAt = new Date(match.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime())) return null;
  return new Date(scheduledAt.getTime() + MATCH_DURATION_MINUTES * 60 * 1000 + AWAITING_RESULT_GRACE_MS);
}

function isAwaitingResultWindowExpired(match, now = new Date()) {
  if (!isMatchAwaitingResult(match, now)) return false;
  const deadline = getAwaitingResultDeadline(match);
  if (!deadline) return false;
  return now > deadline;
}

async function expireAwaitingResultMatchIfNeeded(match, now = new Date()) {
  if (!match) return false;
  if (!isAwaitingResultWindowExpired(match, now)) return false;
  if (match.status !== "open" && match.status !== "full") return false;

  const [updated] = await db
    .update(matches)
    .set({ status: "cancelled", updatedAt: now })
    .where(and(eq(matches.id, match.id), inArray(matches.status, ["open", "full"])))
    .returning({ id: matches.id });

  return Boolean(updated);
}

function withMatchState(match, now = new Date()) {
  const awaitingResult = isMatchAwaitingResult(match, now);
  const isInProgress = isMatchInProgress(match, now);
  return {
    ...match,
    isInProgress,
    awaitingResult,
    isJoinClosed: hasMatchStarted(match, now) || match.status !== "open",
  };
}

function normalizeMatchScoreSets(rawSets) {
  if (!Array.isArray(rawSets) || rawSets.length === 0) return null;

  const sets = rawSets
    .map((set) => ({ a: Number(set?.a), b: Number(set?.b) }))
    .filter((set) => Number.isFinite(set.a) && Number.isFinite(set.b) && set.a >= 0 && set.b >= 0 && set.a !== set.b);

  return sets.length > 0 ? sets : null;
}

function computeWinnerTeamFromSets(sets) {
  let aWins = 0;
  let bWins = 0;

  for (const set of sets) {
    if (set.a > set.b) aWins += 1;
    else bWins += 1;
  }

  if (aWins === bWins) return null;
  return aWins > bWins ? "A" : "B";
}

async function getMatchParticipantRows(matchId) {
  return db
    .select({
      userId: matchParticipants.userId,
      team: matchParticipants.team,
      name: users.name,
      image: users.image,
    })
    .from(matchParticipants)
    .innerJoin(users, eq(matchParticipants.userId, users.id))
    .where(eq(matchParticipants.matchId, matchId));
}

async function buildMatchResultPayload(match, currentUserId) {
  const participants = await getMatchParticipantRows(match.id);

  const [result] = await db
    .select()
    .from(matchResults)
    .where(eq(matchResults.matchId, match.id))
    .limit(1);

  if (!result) {
    return {
      result: null,
      participants,
      canSubmit: participants.some((p) => String(p.userId) === String(currentUserId))
        && hasMatchEnded(match)
        && match.status !== "cancelled",
      canVote: false,
      myVote: null,
      awaitingVotes: [],
    };
  }

  const votes = await db
    .select({
      userId: matchResultVotes.userId,
      vote: matchResultVotes.vote,
      name: users.name,
    })
    .from(matchResultVotes)
    .innerJoin(users, eq(matchResultVotes.userId, users.id))
    .where(eq(matchResultVotes.matchResultId, result.id));

  const participantIds = new Set(participants.map((p) => String(p.userId)));
  const confirmIds = new Set(votes.filter((v) => v.vote === "confirm").map((v) => String(v.userId)));
  const awaitingVotes = participants.filter((p) => !confirmIds.has(String(p.userId))).map((p) => p.userId);
  const myVote = votes.find((v) => String(v.userId) === String(currentUserId))?.vote ?? null;

  const canVote = participantIds.has(String(currentUserId))
    && result.status !== "confirmed"
    && match.status !== "cancelled";

  const canSubmit = participantIds.has(String(currentUserId))
    && hasMatchEnded(match)
    && result.status !== "confirmed"
    && match.status !== "cancelled";

  return {
    result: {
      ...result,
      votes,
    },
    participants,
    canSubmit,
    canVote,
    myVote,
    awaitingVotes,
  };
}

async function syncConfirmedMatchResult(match, resultRow) {
  if (!resultRow?.winnerTeam) return;

  await db
    .update(matches)
    .set({ status: "completed", updatedAt: new Date() })
    .where(eq(matches.id, match.id));

  await db
    .update(matchParticipants)
    .set({ isWin: resultRow.winnerTeam === "A" })
    .where(and(eq(matchParticipants.matchId, match.id), eq(matchParticipants.team, "A")));

  await db
    .update(matchParticipants)
    .set({ isWin: resultRow.winnerTeam === "B" })
    .where(and(eq(matchParticipants.matchId, match.id), eq(matchParticipants.team, "B")));

  const winnerParticipants = await db
    .select({ userId: matchParticipants.userId })
    .from(matchParticipants)
    .where(and(eq(matchParticipants.matchId, match.id), eq(matchParticipants.team, resultRow.winnerTeam)));

  await awardRankingPoints({
    sourceType: "match",
    sourceId: match.id,
    category: "match",
    sportType: match.sportType,
    awards: winnerParticipants.map((row) => ({ userId: row.userId, points: MATCH_WIN_POINTS })),
    metadata: { winnerTeam: resultRow.winnerTeam, sportType: match.sportType },
  });
}

async function evaluateMatchResultStatus(match, resultId) {
  const [resultRow] = await db
    .select()
    .from(matchResults)
    .where(eq(matchResults.id, resultId))
    .limit(1);

  if (!resultRow || resultRow.status === "confirmed") return;

  const participants = await db
    .select({ userId: matchParticipants.userId })
    .from(matchParticipants)
    .where(eq(matchParticipants.matchId, match.id));

  if (participants.length === 0) return;

  const votes = await db
    .select({ userId: matchResultVotes.userId, vote: matchResultVotes.vote })
    .from(matchResultVotes)
    .where(eq(matchResultVotes.matchResultId, resultId));

  if (votes.some((voteRow) => voteRow.vote === "reject")) {
    await db
      .update(matchResults)
      .set({ status: "disputed", updatedAt: new Date() })
      .where(eq(matchResults.id, resultId));
    return;
  }

  const participantIds = participants.map((p) => String(p.userId));
  const confirmIds = new Set(votes.filter((v) => v.vote === "confirm").map((v) => String(v.userId)));
  const allConfirmed = participantIds.every((id) => confirmIds.has(id));

  if (!allConfirmed) {
    await db
      .update(matchResults)
      .set({ status: "pending", updatedAt: new Date() })
      .where(eq(matchResults.id, resultId));
    return;
  }

  await db
    .update(matchResults)
    .set({ status: "confirmed", confirmedAt: new Date(), updatedAt: new Date() })
    .where(eq(matchResults.id, resultId));

  await syncConfirmedMatchResult(match, resultRow);
}

// ─── Controllers ─────────────────────────────────────────────────────────────

export const getMatchesController = async (req, res) => {
  try {
    const { sport, status } = req.query;

    const conditions = [];
    if (status) {
      conditions.push(eq(matches.status, status));
    } else {
      conditions.push(inArray(matches.status, ["open", "full"]));
    }
    if (sport) conditions.push(eq(matches.sportType, sport));

    const rows = await db
      .select()
      .from(matches)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(asc(matches.scheduledAt));

    const now = new Date();
    const visibleRows = [];
    for (const row of rows) {
      const expired = await expireAwaitingResultMatchIfNeeded(row, now);
      if (!expired) visibleRows.push(row);
    }

    const enriched = await Promise.all(visibleRows.map(enrichMatch));

    return res.status(200).json({ matches: enriched });
  } catch (error) {
    console.error("getMatches error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

export const getMatchByIdController = async (req, res) => {
  try {
    const { id } = req.params;

    const [match] = await db
      .select()
      .from(matches)
      .where(eq(matches.id, id))
      .limit(1);

    if (!match) return res.status(404).json({ message: "مسابقه یافت نشد" });

    const enriched = await enrichMatch(match);
    return res.status(200).json({ match: enriched });
  } catch (error) {
    console.error("getMatchById error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

export const joinMatchController = async (req, res) => {
  try {
    const { id } = req.params;
    const { team } = req.body;
    const userId = req.user.id;

    if (!["A", "B"].includes(team)) {
      return res.status(400).json({ message: "تیم باید A یا B باشد" });
    }

    const [match] = await db
      .select()
      .from(matches)
      .where(eq(matches.id, id))
      .limit(1);

    if (!match) return res.status(404).json({ message: "مسابقه یافت نشد" });
    if (hasMatchStarted(match)) {
      return res.status(400).json({ message: "بازی شروع شده و امکان پیوستن وجود ندارد" });
    }
    if (match.status !== "open") {
      return res.status(400).json({ message: "این مسابقه دیگر باز نیست" });
    }

    // Prevent duplicate join
    const [existing] = await db
      .select()
      .from(matchParticipants)
      .where(and(eq(matchParticipants.matchId, id), eq(matchParticipants.userId, userId)))
      .limit(1);

    if (existing) {
      return res.status(409).json({ message: "شما قبلاً به این مسابقه پیوسته‌اید" });
    }

    // Check team capacity
    const teamMembers = await db
      .select()
      .from(matchParticipants)
      .where(and(eq(matchParticipants.matchId, id), eq(matchParticipants.team, team)));

    if (teamMembers.length >= match.teamSize) {
      return res.status(400).json({ message: "این تیم پر است" });
    }

    // Fetch existing participants (before insert) to notify them
    const existingParticipants = await db
      .select({ userId: matchParticipants.userId })
      .from(matchParticipants)
      .where(eq(matchParticipants.matchId, id));

    await db.insert(matchParticipants).values({ matchId: id, userId, team });

    // Check if match is now full and update status
    const allParticipants = await db
      .select()
      .from(matchParticipants)
      .where(eq(matchParticipants.matchId, id));

    if (allParticipants.length >= match.teamSize * 2) {
      await db
        .update(matches)
        .set({ status: "full", updatedAt: new Date() })
        .where(eq(matches.id, id));
    }

    // Re-fetch to get fresh status
    const [updated] = await db.select().from(matches).where(eq(matches.id, id)).limit(1);
    const result = await enrichMatch(updated);

    // Notify all participants about the new joiner
    const joiner = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
      .then((r) => r[0]);

    const joinerName = joiner?.name ?? "یک بازیکن";
    const teamName = team === "A" ? "۱" : "۲";
    const isFull = allParticipants.length >= match.teamSize * 2;

    const allParticipantIds = allParticipants.map((p) => p.userId);
    const allParticipantUsers = await db
      .select({ phone: users.phone })
      .from(users)
      .where(inArray(users.id, allParticipantIds));

    if (isFull) {
      // Match is now full — send completion message to everyone
      const fullSmsText =
        `🎉 مچ «${match.title}» تکمیل شد!\n` +
        `همه بازیکنا آماده‌ان. میبینمتون تو زمین! 🎾\n` +
        `📍 ${match.location}${match.courtName ? ` - ${match.courtName}` : ''}\n` +
        `رکت زون 🏆`;

      await Promise.allSettled(allParticipantUsers.map((u) => u.phone && sendSMS(u.phone, fullSmsText)));
    } else if (existingParticipants.length > 0) {
      // Notify existing participants about the new joiner
      const spotsLeft = match.teamSize * 2 - allParticipants.length;
      const joinSmsText =
        `🎮 ${joinerName} به تیم ${teamName} بازی «${match.title}» پیوست!\n` +
        `هنوز ${spotsLeft} جای خالی داریم، بگو بیان! 🙌\n` +
        `رکت زون 🎾`;

      const othersPhones = allParticipantUsers.filter((u) => u.phone);
      await Promise.allSettled(othersPhones.map((u) => sendSMS(u.phone, joinSmsText)));
    }

    return res.status(200).json({ match: result });
  } catch (error) {
    console.error("joinMatch error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

export const leaveMatchController = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const [match] = await db
      .select()
      .from(matches)
      .where(eq(matches.id, id))
      .limit(1);

    if (!match) return res.status(404).json({ message: "مسابقه یافت نشد" });
    if (match.status === "completed") {
      return res.status(400).json({ message: "نمی‌توان از مسابقه تمام‌شده خارج شد" });
    }

    const [existing] = await db
      .select()
      .from(matchParticipants)
      .where(and(eq(matchParticipants.matchId, id), eq(matchParticipants.userId, userId)))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ message: "شما در این مسابقه نیستید" });
    }

    await db
      .delete(matchParticipants)
      .where(and(eq(matchParticipants.matchId, id), eq(matchParticipants.userId, userId)));

    // Re-open match if it was full
    if (match.status === "full") {
      await db
        .update(matches)
        .set({ status: "open", updatedAt: new Date() })
        .where(eq(matches.id, id));
    }

    const [updated] = await db.select().from(matches).where(eq(matches.id, id)).limit(1);
    const result = await enrichMatch(updated);

    return res.status(200).json({ match: result });
  } catch (error) {
    console.error("leaveMatch error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

export const finalizeMatchController = async (req, res) => {
  try {
    const { id } = req.params;
    const { didPlay } = req.body;
    const userId = req.user.id;

    if (typeof didPlay !== "boolean") {
      return res.status(400).json({ message: "وضعیت انجام بازی نامعتبر است" });
    }

    const [match] = await db
      .select()
      .from(matches)
      .where(eq(matches.id, id))
      .limit(1);

    if (!match) return res.status(404).json({ message: "مسابقه یافت نشد" });
    if (match.createdBy !== userId) {
      return res.status(403).json({ message: "فقط سازنده می‌تواند وضعیت نهایی بازی را ثبت کند" });
    }
    if (!hasMatchStarted(match)) {
      return res.status(400).json({ message: "هنوز زمان شروع بازی نرسیده است" });
    }

    if (didPlay) {
      return res.status(409).json({
        message: "برای ثبت بازی انجام‌شده باید نتیجه توسط بازیکنان ثبت و تایید شود",
      });
    }

    const nextStatus = "cancelled";
    const [updated] = await db
      .update(matches)
      .set({ status: nextStatus, updatedAt: new Date() })
      .where(eq(matches.id, id))
      .returning();

    return res.status(200).json({ match: await enrichMatch(updated) });
  } catch (error) {
    console.error("finalizeMatch error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

export const createMatchController = async (req, res) => {
  try {
    const { title, sportType, location, courtName, scheduledAt, teamSize = 2, isCertified = false, courtId } = req.body;
    const userId = req.user.id;

    if (!title || !sportType || !location || !scheduledAt) {
      return res.status(400).json({ message: "اطلاعات ناقص است" });
    }

    if (!SPORT_TYPES.includes(sportType)) {
      return res.status(400).json({ message: "نوع ورزش نامعتبر است" });
    }

    const parsedDate = parseScheduledAt(scheduledAt);
    if (!parsedDate || parsedDate <= new Date()) {
      return res.status(400).json({ message: "زمان مسابقه باید در آینده باشد" });
    }

    if (courtId) {
      const [court] = await db
        .select({ id: courts.id, slotDuration: courts.slotDuration, isActive: courts.isActive })
        .from(courts)
        .where(eq(courts.id, courtId))
        .limit(1);

      if (!court || !court.isActive) {
        return res.status(404).json({ message: "زمین یافت نشد" });
      }

      const { dateKey, timeKey } = getTehranDateAndTimeKey(parsedDate);
      const matchStartMin = timeToMinutes(timeKey);
      const matchEndMin = matchStartMin + (court.slotDuration || 60);

      const sameDayBookings = await db
        .select({ userId: bookings.userId, startTime: bookings.startTime, endTime: bookings.endTime, status: bookings.status })
        .from(bookings)
        .where(and(eq(bookings.courtId, courtId), eq(bookings.date, dateKey)));

      const conflictingBooking = sameDayBookings.find((booking) => {
        if (booking.status === "rejected" || booking.status === "cancelled") return false;
        if (booking.userId === userId) return false;

        const bookingStart = timeToMinutes(booking.startTime);
        const bookingEnd = timeToMinutes(booking.endTime);
        return matchStartMin < bookingEnd && matchEndMin > bookingStart;
      });

      if (conflictingBooking) {
        return res.status(409).json({ message: "این بازه زمانی برای این زمین قبلاً رزرو شده است" });
      }

      const [blockingOverride] = await db
        .select({ id: slotOverrides.id })
        .from(slotOverrides)
        .where(
          and(
            eq(slotOverrides.courtId, courtId),
            eq(slotOverrides.date, dateKey),
            eq(slotOverrides.startTime, timeKey),
            inArray(slotOverrides.status, ["blocked", "booked"]),
          )
        )
        .limit(1);

      if (blockingOverride) {
        return res.status(409).json({ message: "این تایم برای این زمین در دسترس نیست" });
      }
    }

    const [match] = await db
      .insert(matches)
      .values({ title, sportType, location, courtName, scheduledAt: parsedDate, teamSize, isCertified: !!isCertified, createdBy: userId })
      .returning();

    const inviteToken = randomBytes(24).toString("hex");
    const [withToken] = await db
      .update(matches)
      .set({ inviteToken })
      .where(eq(matches.id, match.id))
      .returning();

    // Auto-join creator to team A
    await db.insert(matchParticipants).values({ matchId: match.id, userId, team: "A" });

    const enriched = await enrichMatch(withToken);

    // Fire-and-forget SMS broadcast to all users
    const spotsLeft = match.teamSize * 2 - 1; // creator already joined
    const sportLabels = { padel: "پدل", tennis: "تنیس", squash: "اسکواش", badminton: "بدمینتون", "ping-pong": "پینگ‌پنگ" };
    const sportLabel = sportLabels[match.sportType] ?? match.sportType;
    const dateStr = parsedDate.toLocaleDateString("fa-IR-u-ca-persian", { timeZone: "Asia/Tehran", year: "numeric", month: "long", day: "numeric" });
    const timeStr = parsedDate.toLocaleTimeString("fa-IR", { timeZone: "Asia/Tehran", hour: "2-digit", minute: "2-digit" });
    const smsText =
      `سلام ورزشکار عزیز 👋\n` +
      `🎾 همین الان یک بازی جدید ساخته شد!\n` +
      `ما می‌خوایم بازی کنیم و بازیکن کم داریم! 😄\n` +
      `برای تکمیل این بازی به ${spotsLeft} بازیکن دیگر نیاز داریم.\n` +
      `🏆 مچ: ${match.title}\n` +
      `🎯 نوع بازی: ${sportLabel}\n` +
      `📍 باشگاه: ${match.location}${match.courtName ? ` - ${match.courtName}` : ''}\n` +
      `📅 ${dateStr}\n` +
      `🕒 ${timeStr}\n` +
      `اگر آماده بازی هستی، همین حالا وارد اپلیکیشن رکت زون شو، به بخش بازی‌ها برو و درخواست پیوستن به این بازی را ثبت کن.\n` +
      `رکت زون | جامع‌ترین پلتفرم هوشمند ورزش‌های راکتی 🎾`;
    broadcastSMS(smsText);

    return res.status(201).json({ match: enriched });
  } catch (error) {
    console.error("createMatch error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

// ─── Delete Match (creator only) ─────────────────────────────────────────────

export const deleteMatchController = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const [match] = await db
      .select()
      .from(matches)
      .where(eq(matches.id, id))
      .limit(1);

    if (!match) return res.status(404).json({ message: "مسابقه یافت نشد" });
    if (match.createdBy !== userId) return res.status(403).json({ message: "فقط سازنده می‌تواند بازی را حذف کند" });
    if (match.status === "completed") return res.status(400).json({ message: "بازی‌های تمام‌شده قابل حذف نیستند" });

    await db.delete(matchParticipants).where(eq(matchParticipants.matchId, id));
    await db.delete(matches).where(eq(matches.id, id));

    return res.status(200).json({ message: "بازی با موفقیت حذف شد" });
  } catch (error) {
    console.error("deleteMatch error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

// ─── Certified Match (admin only) ────────────────────────────────────────────

export const certifyMatchController = async (req, res) => {
  try {
    const { id } = req.params;
    const { certified } = req.body;

    const [match] = await db
      .update(matches)
      .set({ isCertified: !!certified, updatedAt: new Date() })
      .where(eq(matches.id, id))
      .returning();

    if (!match) return res.status(404).json({ message: "مسابقه یافت نشد" });
    return res.status(200).json({ match: await enrichMatch(match) });
  } catch (error) {
    console.error("certifyMatch error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

// ─── Emergency Sub ───────────────────────────────────────────────────────────

export const emergencySubController = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const [match] = await db.select().from(matches).where(eq(matches.id, id)).limit(1);
    if (!match) return res.status(404).json({ message: "مسابقه یافت نشد" });

    if (match.createdBy !== userId) {
      return res.status(403).json({ message: "فقط سازنده بازی می‌تواند این کار را کند" });
    }
    if (match.status === "full" || match.status === "completed") {
      return res.status(400).json({ message: "بازی پر یا تمام شده است" });
    }

    // Find participants already in this match to exclude them
    const alreadyIn = await db
      .select({ userId: matchParticipants.userId })
      .from(matchParticipants)
      .where(eq(matchParticipants.matchId, id));
    const excludeIds = [userId, ...alreadyIn.map((p) => p.userId)];

    // Find users who have a match overlapping the ±2h window around this match's time
    const matchStart = new Date(match.scheduledAt);
    const windowStart = new Date(matchStart.getTime() - 2 * 3600000);
    const windowEnd = new Date(matchStart.getTime() + 2 * 3600000);

    const busyParticipants = await db
      .select({ userId: matchParticipants.userId })
      .from(matchParticipants)
      .innerJoin(matches, eq(matchParticipants.matchId, matches.id))
      .where(
        and(
          ne(matches.id, id),
          gte(matches.scheduledAt, windowStart),
          lte(matches.scheduledAt, windowEnd),
        )
      );

    const busyIds = busyParticipants.map((p) => p.userId);
    const allExcludeIds = [...new Set([...excludeIds, ...busyIds])];

    // Get available users (not busy, not already in match)
    const candidates = await db
      .select({ phone: users.phone, name: users.name })
      .from(users)
      .where(
        allExcludeIds.length > 0
          ? notInArray(users.id, allExcludeIds)
          : undefined
      )
      .limit(50);

    const sportsLabel = { padel: "پدل", tennis: "تنیس", squash: "اسکواش", badminton: "بدمینتون", "ping-pong": "پینگ‌پنگ" };
    const smsText =
      `🚨 یار دقیقه‌نودی!\n` +
      `بچه‌های «${match.location}» همین الان به یک بازیکن ${sportsLabel[match.sportType] ?? match.sportType} نیاز دارند.\n` +
      `سهم زمین رایگانه! رکت‌زون رو باز کن.`;

    const results = await Promise.allSettled(candidates.map((u) => sendSMS(u.phone, smsText)));
    const sent = results.filter((r) => r.status === "fulfilled").length;

    return res.status(200).json({ message: `پیام به ${sent} بازیکن ارسال شد`, notified: sent });
  } catch (error) {
    console.error("emergencySub error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

// ─── Match Rating (MQI) ──────────────────────────────────────────────────────

export const rateMatchController = async (req, res) => {
  try {
    const { id } = req.params;
    const { ratings } = req.body; // [{ toUserId, tags: string[] }]
    const fromUserId = req.user.id;

    if (!Array.isArray(ratings) || ratings.length === 0) {
      return res.status(400).json({ message: "امتیازها ارسال نشده‌اند" });
    }

    const [match] = await db.select().from(matches).where(eq(matches.id, id)).limit(1);
    if (!match) return res.status(404).json({ message: "مسابقه یافت نشد" });

    const expired = await expireAwaitingResultMatchIfNeeded(match);
    if (expired) {
      return res.status(410).json({ message: "مهلت امتیازدهی این بازی تمام شده است" });
    }

    if (!isMatchAwaitingResult(match)) {
      return res.status(400).json({ message: "امتیازدهی فقط تا ۲۴ ساعت بعد از پایان بازی مجاز است" });
    }

    const participant = await db
      .select()
      .from(matchParticipants)
      .where(and(eq(matchParticipants.matchId, id), eq(matchParticipants.userId, fromUserId)))
      .limit(1);

    if (participant.length === 0) {
      return res.status(403).json({ message: "شما در این بازی نبوده‌اید" });
    }

    const validTags = new Set(RATING_TAGS);
    const rows = ratings
      .filter((r) => r.toUserId && r.toUserId !== fromUserId)
      .map((r) => ({
        matchId: id,
        fromUserId,
        toUserId: r.toUserId,
        tags: (r.tags ?? []).filter((t) => validTags.has(t)),
      }));

    if (rows.length === 0) return res.status(400).json({ message: "داده‌های نامعتبر" });

    await db
      .insert(matchRatings)
      .values(rows)
      .onConflictDoUpdate({
        target: [matchRatings.matchId, matchRatings.fromUserId, matchRatings.toUserId],
        set: { tags: matchRatings.tags },
      });

    return res.status(200).json({ message: "امتیازها ثبت شد" });
  } catch (error) {
    console.error("rateMatch error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

export const getCompatibilityController = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const [match] = await db.select().from(matches).where(eq(matches.id, id)).limit(1);
    if (!match) return res.status(404).json({ message: "مسابقه یافت نشد" });

    // Get all participants of this match
    const participants = await db
      .select({ userId: matchParticipants.userId })
      .from(matchParticipants)
      .where(eq(matchParticipants.matchId, id));

    const participantIds = participants.map((p) => p.userId);
    if (participantIds.length === 0) return res.status(200).json({ compatibility: 100 });

    // Get tags received by current user historically
    const myReceivedTags = await db
      .select({ tags: matchRatings.tags })
      .from(matchRatings)
      .where(eq(matchRatings.toUserId, userId));

    // Get tags received by match participants historically
    if (participantIds.length === 0) return res.status(200).json({ compatibility: 100 });

    const theirReceivedTags = await db
      .select({ tags: matchRatings.tags })
      .from(matchRatings)
      .where(inArray(matchRatings.toUserId, participantIds));

    const flattenTags = (rows) => rows.flatMap((r) => r.tags ?? []);
    const countTags = (tags) => {
      const counts = {};
      tags.forEach((t) => { counts[t] = (counts[t] ?? 0) + 1; });
      return counts;
    };

    const myCounts = countTags(flattenTags(myReceivedTags));
    const theirCounts = countTags(flattenTags(theirReceivedTags));

    const allTags = new Set([...Object.keys(myCounts), ...Object.keys(theirCounts)]);
    if (allTags.size === 0) return res.status(200).json({ compatibility: 85 }); // no data → neutral

    let dot = 0, magA = 0, magB = 0;
    allTags.forEach((tag) => {
      const a = myCounts[tag] ?? 0;
      const b = theirCounts[tag] ?? 0;
      dot += a * b;
      magA += a * a;
      magB += b * b;
    });

    const similarity = magA && magB ? dot / (Math.sqrt(magA) * Math.sqrt(magB)) : 0.85;
    const compatibility = Math.round(50 + similarity * 50); // map [0,1] → [50,100]

    return res.status(200).json({ compatibility });
  } catch (error) {
    console.error("getCompatibility error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

// ─── Invite Link ─────────────────────────────────────────────────────────────

export const getInviteLinkController = async (req, res) => {
  try {
    const { id } = req.params;

    const [match] = await db.select().from(matches).where(eq(matches.id, id)).limit(1);
    if (!match) return res.status(404).json({ message: "مسابقه یافت نشد" });

    let token = match.inviteToken;
    if (!token) {
      token = randomBytes(24).toString("hex");
      await db.update(matches).set({ inviteToken: token }).where(eq(matches.id, id));
    }

    const appBaseUrl = process.env.APP_BASE_URL ?? "https://raqetzone.com";
    const inviteUrl = `${appBaseUrl}/join/${token}`;

    return res.status(200).json({ inviteUrl, token });
  } catch (error) {
    console.error("getInviteLink error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

export const getMatchByInviteTokenController = async (req, res) => {
  try {
    const { token } = req.params;

    const [match] = await db
      .select()
      .from(matches)
      .where(eq(matches.inviteToken, token))
      .limit(1);

    if (!match) return res.status(404).json({ message: "لینک نامعتبر است" });

    const enriched = await enrichMatch(match);
    return res.status(200).json({ match: enriched });
  } catch (error) {
    console.error("getMatchByInviteToken error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};
