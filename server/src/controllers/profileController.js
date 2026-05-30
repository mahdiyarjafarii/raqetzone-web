import { eq, and, desc, gte, asc } from "drizzle-orm";
import { db } from "../db/index.js";
import { users, matchParticipants, matches, bookings } from "../db/schema.js";

// ─── XP / Level helpers ───────────────────────────────────────────────────────

const XP_PER_MATCH = 15;
const XP_PER_WIN = 25;
const XP_PER_BOOKING = 8;

function computeLevel(xp) {
  // Level = floor(sqrt(xp / 80)) + 1, capped at 50
  return Math.min(50, Math.floor(Math.sqrt(xp / 80)) + 1);
}

function xpForLevel(level) {
  return Math.pow(level - 1, 2) * 80;
}

function getRank(level) {
  if (level >= 30) return { label: "Elite", color: "#F59E0B", gradient: ["#F59E0B", "#EF4444"] };
  if (level >= 15) return { label: "Gold", color: "#EAB308", gradient: ["#EAB308", "#F97316"] };
  if (level >= 8)  return { label: "Silver", color: "#94A3B8", gradient: ["#94A3B8", "#64748B"] };
  return { label: "Bronze", color: "#CD7F32", gradient: ["#CD7F32", "#92400E"] };
}

// ─── Weekly activity (last 8 weeks) ──────────────────────────────────────────

function getWeekKey(date) {
  const d = new Date(date);
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return monday.toISOString().split("T")[0];
}

function buildWeeklyActivity(participations) {
  const map = {};
  for (const p of participations) {
    const key = getWeekKey(p.joinedAt);
    map[key] = (map[key] || 0) + 1;
  }
  // Last 8 weeks
  const weeks = [];
  for (let i = 7; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i * 7);
    const key = getWeekKey(d);
    weeks.push({ week: key, count: map[key] || 0 });
  }
  return weeks;
}

// ─── Controllers ─────────────────────────────────────────────────────────────

export const getMyProfileController = async (req, res) => {
  try {
    const userId = req.user.id;

    // All participations
    const participations = await db
      .select({
        matchId: matchParticipants.matchId,
        team: matchParticipants.team,
        isWin: matchParticipants.isWin,
        joinedAt: matchParticipants.joinedAt,
        matchTitle: matches.title,
        matchSportType: matches.sportType,
        matchLocation: matches.location,
        matchScheduledAt: matches.scheduledAt,
        matchStatus: matches.status,
      })
      .from(matchParticipants)
      .innerJoin(matches, eq(matchParticipants.matchId, matches.id))
      .where(eq(matchParticipants.userId, userId))
      .orderBy(desc(matchParticipants.joinedAt));

    // All bookings
    const userBookings = await db
      .select({ id: bookings.id, status: bookings.status, createdAt: bookings.createdAt })
      .from(bookings)
      .where(eq(bookings.userId, userId));

    // ── Stats computation
    const totalMatches = participations.length;
    const decidedMatches = participations.filter((p) => p.isWin !== null);
    const wins = decidedMatches.filter((p) => p.isWin === true).length;
    const losses = decidedMatches.filter((p) => p.isWin === false).length;
    const winRate = decidedMatches.length > 0 ? Math.round((wins / decidedMatches.length) * 100) : 0;

    // Approximate hours: each match ≈ 1 hour
    const hoursPlayed = totalMatches;

    // Sport breakdown
    const sportCounts = {};
    for (const p of participations) {
      sportCounts[p.matchSportType] = (sportCounts[p.matchSportType] || 0) + 1;
    }
    const favoriteSportFromData =
      Object.entries(sportCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    // ── XP calculation
    const earnedXp =
      totalMatches * XP_PER_MATCH +
      wins * XP_PER_WIN +
      userBookings.filter((b) => b.status === "approved").length * XP_PER_BOOKING;

    const currentLevel = computeLevel(earnedXp);
    const currentLevelXp = xpForLevel(currentLevel);
    const nextLevelXp = xpForLevel(currentLevel + 1);
    const progressXp = earnedXp - currentLevelXp;
    const neededXp = nextLevelXp - currentLevelXp;
    const progressPct = neededXp > 0 ? Math.round((progressXp / neededXp) * 100) : 100;
    const rank = getRank(currentLevel);

    // ── Weekly activity
    const weeklyActivity = buildWeeklyActivity(participations);

    // ── Recent matches (last 10)
    const recentMatches = participations.slice(0, 10).map((p) => ({
      matchId: p.matchId,
      title: p.matchTitle,
      sportType: p.matchSportType,
      location: p.matchLocation,
      scheduledAt: p.matchScheduledAt,
      status: p.matchStatus,
      team: p.team,
      isWin: p.isWin,
    }));

    // ── Sync XP + level to DB
    await db
      .update(users)
      .set({ xp: earnedXp, level: currentLevel, updatedAt: new Date() })
      .where(eq(users.id, userId));

    // ── User record (fresh)
    const [user] = await db
      .select({
        id: users.id,
        phone: users.phone,
        name: users.name,
        image: users.image,
        bio: users.bio,
        skillLevel: users.skillLevel,
        favoriteSport: users.favoriteSport,
        xp: users.xp,
        level: users.level,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return res.status(200).json({
      user: {
        ...user,
        favoriteSport: favoriteSportFromData ?? user.favoriteSport,
      },
      stats: {
        totalMatches,
        wins,
        losses,
        winRate,
        hoursPlayed,
        totalBookings: userBookings.length,
        approvedBookings: userBookings.filter((b) => b.status === "approved").length,
      },
      level: {
        current: currentLevel,
        xp: earnedXp,
        progressXp,
        neededXp,
        progressPct,
        rank,
      },
      weeklyActivity,
      recentMatches,
      sportBreakdown: Object.entries(sportCounts).map(([sport, count]) => ({
        sport,
        count,
        pct: totalMatches > 0 ? Math.round((count / totalMatches) * 100) : 0,
      })),
    });
  } catch (error) {
    console.error("getMyProfile error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

export const updateSportsProfileController = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, bio, skillLevel, favoriteSport } = req.body;

    const VALID_SKILLS = ["beginner", "intermediate", "advanced", "pro"];
    const VALID_SPORTS = ["padel", "tennis", "squash", "badminton", "ping-pong"];

    if (skillLevel && !VALID_SKILLS.includes(skillLevel)) {
      return res.status(400).json({ message: "سطح مهارت نامعتبر است" });
    }
    if (favoriteSport && !VALID_SPORTS.includes(favoriteSport)) {
      return res.status(400).json({ message: "نوع ورزش نامعتبر است" });
    }

    const [updated] = await db
      .update(users)
      .set({
        ...(name !== undefined && { name }),
        ...(bio !== undefined && { bio }),
        ...(skillLevel !== undefined && { skillLevel }),
        ...(favoriteSport !== undefined && { favoriteSport }),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    return res.status(200).json({ user: updated });
  } catch (error) {
    console.error("updateSportsProfile error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

// ─── Public Profile (view another user) ──────────────────────────────────────

export const getPublicProfileController = async (req, res) => {
  try {
    const { userId } = req.params;

    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        image: users.image,
        bio: users.bio,
        skillLevel: users.skillLevel,
        favoriteSport: users.favoriteSport,
        level: users.level,
        xp: users.xp,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) return res.status(404).json({ message: "کاربر یافت نشد" });

    const participations = await db
      .select({
        matchId: matchParticipants.matchId,
        isWin: matchParticipants.isWin,
        joinedAt: matchParticipants.joinedAt,
        matchSportType: matches.sportType,
      })
      .from(matchParticipants)
      .innerJoin(matches, eq(matchParticipants.matchId, matches.id))
      .where(eq(matchParticipants.userId, userId));

    const totalMatches = participations.length;
    const decidedMatches = participations.filter((p) => p.isWin !== null);
    const wins = decidedMatches.filter((p) => p.isWin === true).length;
    const winRate = decidedMatches.length > 0 ? Math.round((wins / decidedMatches.length) * 100) : 0;

    const currentLevel = user.level ?? 1;
    const rank = getRank(currentLevel);
    const nextLevelXp = Math.pow(currentLevel, 2) * 80;
    const currentLevelXp = Math.pow(currentLevel - 1, 2) * 80;
    const earnedXp = user.xp ?? 0;
    const progressXp = earnedXp - currentLevelXp;
    const neededXp = nextLevelXp - currentLevelXp;
    const progressPct = neededXp > 0 ? Math.round((progressXp / neededXp) * 100) : 100;

    return res.status(200).json({
      user,
      stats: { totalMatches, wins, winRate },
      level: { current: currentLevel, xp: earnedXp, progressXp, neededXp, progressPct, rank },
    });
  } catch (error) {
    console.error("getPublicProfile error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};
