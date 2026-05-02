import { eq, and, asc, desc, gte } from "drizzle-orm";
import { db } from "../db/index.js";
import { matches, matchParticipants, users } from "../db/schema.js";

const SPORT_TYPES = ["padel", "tennis", "squash", "badminton", "ping-pong"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function enrichMatch(match) {
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

  return { ...match, teamA, teamB };
}

// ─── Controllers ─────────────────────────────────────────────────────────────

export const getMatchesController = async (req, res) => {
  try {
    const { sport, status = "open" } = req.query;

    const conditions = [];
    if (status) conditions.push(eq(matches.status, status));
    if (sport) conditions.push(eq(matches.sportType, sport));

    const rows = await db
      .select()
      .from(matches)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(asc(matches.scheduledAt));

    const enriched = await Promise.all(rows.map(enrichMatch));

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

    const enriched = await enrichMatch({ ...match });
    // Re-fetch to get fresh status
    const [updated] = await db.select().from(matches).where(eq(matches.id, id)).limit(1);
    const result = await enrichMatch(updated);

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

export const createMatchController = async (req, res) => {
  try {
    const { title, sportType, location, courtName, scheduledAt, teamSize = 2 } = req.body;
    const userId = req.user.id;

    if (!title || !sportType || !location || !scheduledAt) {
      return res.status(400).json({ message: "اطلاعات ناقص است" });
    }

    if (!SPORT_TYPES.includes(sportType)) {
      return res.status(400).json({ message: "نوع ورزش نامعتبر است" });
    }

    const parsedDate = new Date(scheduledAt);
    if (isNaN(parsedDate.getTime()) || parsedDate <= new Date()) {
      return res.status(400).json({ message: "زمان مسابقه باید در آینده باشد" });
    }

    const [match] = await db
      .insert(matches)
      .values({ title, sportType, location, courtName, scheduledAt: parsedDate, teamSize, createdBy: userId })
      .returning();

    const enriched = await enrichMatch(match);
    return res.status(201).json({ match: enriched });
  } catch (error) {
    console.error("createMatch error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};
