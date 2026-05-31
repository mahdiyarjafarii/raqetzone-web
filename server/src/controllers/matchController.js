import { eq, and, asc, ne, gte, lte, notInArray, inArray } from "drizzle-orm";
import { randomBytes } from "crypto";
import { db } from "../db/index.js";
import { matches, matchParticipants, matchRatings, users } from "../db/schema.js";
import { sendSMS } from "../utils/sms.js";

const RATING_TAGS = [
  "وقت‌شناس", "خوش‌اخلاق", "تیمی", "رقابتی", "مبتدی‌فرندلی",
  "حرفه‌ای", "شاد", "منضبط",
];

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

    // Send SMS to existing participants (skip if nobody was there — first joiner edge case)
    if (existingParticipants.length > 0) {
      const joiner = await db
        .select({ name: users.name, phone: users.phone })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1)
        .then((r) => r[0]);

      const otherIds = existingParticipants.map((p) => p.userId);
      const otherUsers = await db
        .select({ phone: users.phone, name: users.name })
        .from(users)
        .where(inArray(users.id, otherIds));

      const smsText =
        `${joiner?.name ?? "یک بازیکن"} به بازی «${match.title}» پیوست 🎮\n` +
        `تیم: ${team === "A" ? "آبی" : "بنفش"}\n` +
        `شماره: ${joiner?.phone ?? "-"}`;

      await Promise.allSettled(otherUsers.map((u) => sendSMS(u.phone, smsText)));
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

export const createMatchController = async (req, res) => {
  try {
    const { title, sportType, location, courtName, scheduledAt, teamSize = 2, isCertified = false } = req.body;
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
      .values({ title, sportType, location, courtName, scheduledAt: parsedDate, teamSize, isCertified: !!isCertified, createdBy: userId })
      .returning();

    const inviteToken = randomBytes(24).toString("hex");
    const [withToken] = await db
      .update(matches)
      .set({ inviteToken })
      .where(eq(matches.id, match.id))
      .returning();

    const enriched = await enrichMatch(withToken);
    return res.status(201).json({ match: enriched });
  } catch (error) {
    console.error("createMatch error:", error);
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

    const sportsLabel = { padel: "پادل", tennis: "تنیس", squash: "اسکواش", badminton: "بدمینتون", "ping-pong": "پینگ‌پنگ" };
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
