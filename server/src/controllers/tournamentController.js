import { eq, and, asc, desc, ilike, or, sql, inArray } from "drizzle-orm";
import { db } from "../db/index.js";
import { tournaments, tournamentRegistrations, tournamentMatches, users, clubs } from "../db/schema.js";
import { sendSMS } from "../utils/sms.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function enrichTournament(tournament) {
  const registrations = await db
    .select({
      id: tournamentRegistrations.id,
      userId: tournamentRegistrations.userId,
      paymentStatus: tournamentRegistrations.paymentStatus,
      registeredAt: tournamentRegistrations.registeredAt,
      name: users.name,
      image: users.image,
    })
    .from(tournamentRegistrations)
    .innerJoin(users, eq(tournamentRegistrations.userId, users.id))
    .where(eq(tournamentRegistrations.tournamentId, tournament.id))
    .orderBy(asc(tournamentRegistrations.registeredAt));

  let club = null;
  if (tournament.clubId) {
    const [clubRow] = await db
      .select({ id: clubs.id, name: clubs.name, images: clubs.images })
      .from(clubs)
      .where(eq(clubs.id, tournament.clubId))
      .limit(1);
    club = clubRow ?? null;
  }

  const now = new Date();
  const registeredCount = registrations.length;
  const deadlinePassed = new Date(tournament.registrationDeadline) < now;
  const ended = new Date(tournament.endDate) < now;

  // phase: registration | ongoing | completed
  let phase;
  if (ended || tournament.status === "completed") {
    phase = "completed";
  } else if (deadlinePassed || tournament.status === "ongoing" || tournament.status === "closed") {
    phase = "ongoing";
  } else {
    phase = "registration";
  }

  // legacy status for backward compat
  let computedStatus = tournament.status;
  if (deadlinePassed && computedStatus === "open") computedStatus = "closed";
  if (registeredCount >= tournament.maxParticipants && computedStatus === "open") computedStatus = "full";

  return {
    ...tournament,
    status: computedStatus,
    phase,
    registeredCount,
    participants: registrations,
    club,
    clubName: club?.name ?? null,
  };
}

function normalizeScoreSets(rawSets) {
  if (!Array.isArray(rawSets) || rawSets.length === 0) return null;

  const sets = rawSets
    .map((set) => ({ a: Number(set?.a), b: Number(set?.b) }))
    .filter((set) => Number.isFinite(set.a) && Number.isFinite(set.b) && set.a >= 0 && set.b >= 0 && set.a !== set.b);

  return sets.length > 0 ? sets : null;
}

function computeWinnerFromSets(sets) {
  let aWins = 0;
  let bWins = 0;
  for (const set of sets) {
    if (set.a > set.b) aWins += 1;
    else bWins += 1;
  }
  if (aWins === bWins) return null;
  return aWins > bWins ? "A" : "B";
}

async function canManageTournament(reqUser, tournament) {
  if (!reqUser) return false;
  if (reqUser.isAdmin) return true;
  if (!tournament.clubId) return false;

  const [club] = await db
    .select({ id: clubs.id })
    .from(clubs)
    .where(and(eq(clubs.id, tournament.clubId), eq(clubs.ownerId, reqUser.id)))
    .limit(1);

  return !!club;
}

async function loadTournamentMatchesWithUsers(tournamentId) {
  const rows = await db
    .select()
    .from(tournamentMatches)
    .where(eq(tournamentMatches.tournamentId, tournamentId))
    .orderBy(asc(tournamentMatches.round), asc(tournamentMatches.matchNumber));

  const userIds = [...new Set(rows.flatMap((m) => [m.playerAUserId, m.playerBUserId, m.winnerUserId].filter(Boolean)))];
  const userRows = userIds.length
    ? await db
        .select({ id: users.id, name: users.name, image: users.image })
        .from(users)
        .where(inArray(users.id, userIds))
    : [];

  const userMap = new Map(userRows.map((u) => [u.id, u]));

  return rows.map((m) => ({
    ...m,
    playerA: m.playerAUserId ? userMap.get(m.playerAUserId) ?? null : null,
    playerB: m.playerBUserId ? userMap.get(m.playerBUserId) ?? null : null,
    winner: m.winnerUserId ? userMap.get(m.winnerUserId) ?? null : null,
  }));
}

async function propagateWinnerToNextMatch(matchRow, winnerUserId) {
  const nextRound = matchRow.round + 1;
  const nextMatchNumber = Math.ceil(matchRow.matchNumber / 2);
  const slotField = matchRow.matchNumber % 2 === 1 ? "playerAUserId" : "playerBUserId";

  const [nextMatch] = await db
    .select()
    .from(tournamentMatches)
    .where(
      and(
        eq(tournamentMatches.tournamentId, matchRow.tournamentId),
        eq(tournamentMatches.round, nextRound),
        eq(tournamentMatches.matchNumber, nextMatchNumber)
      )
    )
    .limit(1);

  if (!nextMatch) return;

  if (slotField === "playerAUserId" && nextMatch.playerAUserId !== winnerUserId) {
    await db
      .update(tournamentMatches)
      .set({ playerAUserId: winnerUserId, updatedAt: new Date() })
      .where(eq(tournamentMatches.id, nextMatch.id));
  }

  if (slotField === "playerBUserId" && nextMatch.playerBUserId !== winnerUserId) {
    await db
      .update(tournamentMatches)
      .set({ playerBUserId: winnerUserId, updatedAt: new Date() })
      .where(eq(tournamentMatches.id, nextMatch.id));
  }
}

async function resolveWalkovers(tournamentId) {
  let changed = true;
  while (changed) {
    changed = false;
    const rows = await db
      .select()
      .from(tournamentMatches)
      .where(eq(tournamentMatches.tournamentId, tournamentId))
      .orderBy(asc(tournamentMatches.round), asc(tournamentMatches.matchNumber));

    for (const row of rows) {
      if (row.winnerUserId || row.status !== "scheduled") continue;
      const onlyA = row.playerAUserId && !row.playerBUserId;
      const onlyB = !row.playerAUserId && row.playerBUserId;
      if (!onlyA && !onlyB) continue;

      const winnerUserId = row.playerAUserId ?? row.playerBUserId;
      await db
        .update(tournamentMatches)
        .set({ winnerUserId, status: "walkover", scoreSets: [], updatedAt: new Date() })
        .where(eq(tournamentMatches.id, row.id));

      await propagateWinnerToNextMatch(row, winnerUserId);
      changed = true;
    }
  }
}

async function ensureTournamentBracket(tournamentId) {
  const existing = await db
    .select({ id: tournamentMatches.id })
    .from(tournamentMatches)
    .where(eq(tournamentMatches.tournamentId, tournamentId))
    .limit(1);

  if (existing.length > 0) return;

  const registrations = await db
    .select({ userId: tournamentRegistrations.userId })
    .from(tournamentRegistrations)
    .where(eq(tournamentRegistrations.tournamentId, tournamentId))
    .orderBy(asc(tournamentRegistrations.registeredAt));

  const participants = registrations.map((r) => r.userId);
  if (participants.length < 2) return;

  const slots = 2 ** Math.ceil(Math.log2(participants.length));
  const rounds = Math.log2(slots);
  const seeded = [...participants, ...Array(slots - participants.length).fill(null)];

  const rows = [];
  for (let round = 1; round <= rounds; round += 1) {
    const matchCount = slots / 2 ** round;
    for (let matchNumber = 1; matchNumber <= matchCount; matchNumber += 1) {
      const row = {
        tournamentId,
        round,
        matchNumber,
      };

      if (round === 1) {
        const idx = (matchNumber - 1) * 2;
        row.playerAUserId = seeded[idx] ?? null;
        row.playerBUserId = seeded[idx + 1] ?? null;
      }

      rows.push(row);
    }
  }

  await db.insert(tournamentMatches).values(rows);
  await resolveWalkovers(tournamentId);
}

async function buildTournamentStandings(tournamentId) {
  const participants = await db
    .select({
      userId: tournamentRegistrations.userId,
      name: users.name,
      image: users.image,
    })
    .from(tournamentRegistrations)
    .innerJoin(users, eq(tournamentRegistrations.userId, users.id))
    .where(eq(tournamentRegistrations.tournamentId, tournamentId));

  const standingsMap = new Map(
    participants.map((p) => [String(p.userId), {
      userId: p.userId,
      name: p.name,
      image: p.image,
      played: 0,
      wins: 0,
      losses: 0,
      setWins: 0,
      setLosses: 0,
      points: 0,
    }])
  );

  const matches = await db
    .select()
    .from(tournamentMatches)
    .where(eq(tournamentMatches.tournamentId, tournamentId));

  for (const match of matches) {
    if (!match.winnerUserId || !match.playerAUserId || !match.playerBUserId) continue;
    const a = standingsMap.get(String(match.playerAUserId));
    const b = standingsMap.get(String(match.playerBUserId));
    if (!a || !b) continue;

    a.played += 1;
    b.played += 1;

    if (String(match.winnerUserId) === String(match.playerAUserId)) {
      a.wins += 1;
      a.points += 3;
      b.losses += 1;
    } else {
      b.wins += 1;
      b.points += 3;
      a.losses += 1;
    }

    const sets = Array.isArray(match.scoreSets) ? match.scoreSets : [];
    for (const set of sets) {
      const scoreA = Number(set?.a);
      const scoreB = Number(set?.b);
      if (!Number.isFinite(scoreA) || !Number.isFinite(scoreB) || scoreA === scoreB) continue;
      if (scoreA > scoreB) {
        a.setWins += 1;
        b.setLosses += 1;
      } else {
        b.setWins += 1;
        a.setLosses += 1;
      }
    }
  }

  const standings = [...standingsMap.values()]
    .sort((x, y) => {
      if (y.points !== x.points) return y.points - x.points;
      if (y.wins !== x.wins) return y.wins - x.wins;
      return (y.setWins - y.setLosses) - (x.setWins - x.setLosses);
    })
    .map((row, i) => ({
      rank: i + 1,
      ...row,
      setDiff: row.setWins - row.setLosses,
    }));

  return standings;
}

// ─── List Tournaments ─────────────────────────────────────────────────────────

export const getTournamentsController = async (req, res) => {
  try {
    const { club, price, availability, search, sport } = req.query;

    let rows = await db
      .select()
      .from(tournaments)
      .orderBy(asc(tournaments.startDate));

    const enriched = await Promise.all(rows.map(enrichTournament));

    let filtered = enriched;

    if (club) filtered = filtered.filter((t) => t.clubId === club);
    if (sport) filtered = filtered.filter((t) => t.sportType === sport);

    if (price === "free") filtered = filtered.filter((t) => t.entryFee === 0);
    if (price === "paid") filtered = filtered.filter((t) => t.entryFee > 0);

    if (availability === "open") filtered = filtered.filter((t) => t.status === "open");
    if (availability === "full") filtered = filtered.filter((t) => t.status === "full");
    if (availability === "closed") filtered = filtered.filter((t) => t.status === "closed");

    if (search?.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter((t) => t.title.toLowerCase().includes(q));
    }

    return res.status(200).json({ tournaments: filtered });
  } catch (error) {
    console.error("getTournaments error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

// ─── Get One ──────────────────────────────────────────────────────────────────

export const getTournamentByIdController = async (req, res) => {
  try {
    const { id } = req.params;

    const [tournament] = await db
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, id))
      .limit(1);

    if (!tournament) return res.status(404).json({ message: "تورنومنت یافت نشد" });

    const enriched = await enrichTournament(tournament);
    return res.status(200).json({ tournament: enriched });
  } catch (error) {
    console.error("getTournamentById error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

// ─── Create Tournament (club owner / admin) ────────────────────────────────

export const createTournamentController = async (req, res) => {
  try {
    const {
      clubId,
      title,
      description,
      entryFee = 0,
      maxParticipants = 16,
      registrationDeadline,
      startDate,
      endDate,
      minLevel = 1,
      sportType = "padel",
      prize,
      rules,
    } = req.body;

    let resolvedClubId = clubId || null;
    if (!resolvedClubId && req.user?.id) {
      const [ownedClub] = await db
        .select({ id: clubs.id })
        .from(clubs)
        .where(eq(clubs.ownerId, req.user.id))
        .limit(1);
      resolvedClubId = ownedClub?.id ?? null;
    }

    if (!resolvedClubId && !req.user?.isAdmin) {
      return res.status(403).json({ message: "برای ساخت تورنومنت باید باشگاه داشته باشید" });
    }

    if (!title || !registrationDeadline || !startDate || !endDate) {
      return res.status(400).json({ message: "اطلاعات ناقص است" });
    }

    const now = new Date();
    const registrationDeadlineDate = new Date(registrationDeadline);
    const startDateValue = new Date(startDate);
    if (registrationDeadlineDate < now) {
      return res.status(400).json({ message: "مهلت ثبت‌نام نباید قبل از زمان فعلی باشد" });
    }
    if (startDateValue <= now) {
      return res.status(400).json({ message: "تاریخ شروع باید در آینده باشد" });
    }
    if (registrationDeadlineDate >= startDateValue) {
      return res.status(400).json({ message: "مهلت ثبت‌نام باید قبل از شروع مسابقه باشد" });
    }

    const [tournament] = await db
      .insert(tournaments)
      .values({
        clubId: resolvedClubId,
        title,
        description,
        entryFee: Number(entryFee),
        maxParticipants: Number(maxParticipants),
        registrationDeadline: new Date(registrationDeadline),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        minLevel: Number(minLevel),
        sportType,
        prize: prize || null,
        rules,
      })
      .returning();

    const enriched = await enrichTournament(tournament);
    return res.status(201).json({ tournament: enriched });
  } catch (error) {
    console.error("createTournament error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

// ─── Delete Tournament ────────────────────────────────────────────────────────

export const deleteTournamentController = async (req, res) => {
  try {
    const { id } = req.params;

    const [tournament] = await db.select().from(tournaments).where(eq(tournaments.id, id)).limit(1);
    if (!tournament) return res.status(404).json({ message: "تورنومنت یافت نشد" });

    await db.delete(tournamentRegistrations).where(eq(tournamentRegistrations.tournamentId, id));
    await db.delete(tournaments).where(eq(tournaments.id, id));

    return res.status(200).json({ message: "تورنومنت حذف شد" });
  } catch (error) {
    console.error("deleteTournament error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

// ─── Update Tournament ────────────────────────────────────────────────────────

export const updateTournamentController = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const [tournament] = await db
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, id))
      .limit(1);

    if (!tournament) return res.status(404).json({ message: "تورنومنت یافت نشد" });

    const allowed = ["title", "description", "entryFee", "maxParticipants",
      "registrationDeadline", "startDate", "endDate", "minLevel", "sportType", "prize", "rules", "status"];

    const patch = {};
    for (const key of allowed) {
      if (updates[key] !== undefined) patch[key] = updates[key];
    }
    if (patch.entryFee !== undefined) patch.entryFee = Number(patch.entryFee);
    if (patch.maxParticipants !== undefined) patch.maxParticipants = Number(patch.maxParticipants);
    if (patch.minLevel !== undefined) patch.minLevel = Number(patch.minLevel);
    if (patch.registrationDeadline !== undefined) patch.registrationDeadline = new Date(patch.registrationDeadline);
    if (patch.startDate !== undefined) patch.startDate = new Date(patch.startDate);
    if (patch.endDate !== undefined) patch.endDate = new Date(patch.endDate);

    const now = new Date();
    if (patch.registrationDeadline !== undefined && patch.registrationDeadline < now) {
      return res.status(400).json({ message: "مهلت ثبت‌نام نباید قبل از زمان فعلی باشد" });
    }

    patch.updatedAt = new Date();

    const [updated] = await db
      .update(tournaments)
      .set(patch)
      .where(eq(tournaments.id, id))
      .returning();

    const enriched = await enrichTournament(updated);
    return res.status(200).json({ tournament: enriched });
  } catch (error) {
    console.error("updateTournament error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

// ─── Register for Tournament ──────────────────────────────────────────────────

export const registerTournamentController = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const [tournament] = await db
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, id))
      .limit(1);

    if (!tournament) return res.status(404).json({ message: "تورنومنت یافت نشد" });

    const now = new Date();
    if (new Date(tournament.registrationDeadline) < now) {
      return res.status(400).json({ message: "مهلت ثبت‌نام به پایان رسیده است" });
    }

    if (tournament.status !== "open") {
      return res.status(400).json({ message: "ثبت‌نام این تورنومنت امکان‌پذیر نیست" });
    }

    // Check level requirement
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (user.level < tournament.minLevel) {
      return res.status(400).json({
        message: `حداقل سطح مورد نیاز ${tournament.minLevel} است. سطح شما ${user.level} می‌باشد`,
      });
    }

    // Prevent duplicate registration
    const [existing] = await db
      .select()
      .from(tournamentRegistrations)
      .where(
        and(
          eq(tournamentRegistrations.tournamentId, id),
          eq(tournamentRegistrations.userId, userId)
        )
      )
      .limit(1);

    if (existing) {
      return res.status(409).json({ message: "شما قبلاً در این تورنومنت ثبت‌نام کرده‌اید" });
    }

    // Check capacity
    const registrationCount = await db
      .select({ count: sql`count(*)` })
      .from(tournamentRegistrations)
      .where(eq(tournamentRegistrations.tournamentId, id));

    const count = Number(registrationCount[0].count);
    if (count >= tournament.maxParticipants) {
      return res.status(400).json({ message: "ظرفیت تورنومنت تکمیل شده است" });
    }

    // mark as paid immediately — payment gateway integration is handled separately
    const paymentStatus = "paid";

    const [registration] = await db
      .insert(tournamentRegistrations)
      .values({ tournamentId: id, userId, paymentStatus })
      .returning();

    // Mark as full if needed
    if (count + 1 >= tournament.maxParticipants) {
      await db
        .update(tournaments)
        .set({ status: "full", updatedAt: new Date() })
        .where(eq(tournaments.id, id));
    }

    // SMS confirmation
    sendSMS(
      req.user.phone,
      `رکت‌زون: ثبت‌نام شما در تورنومنت «${tournament.title}» با موفقیت انجام شد 🏆`
    ).catch(() => {});

    return res.status(201).json({ registration, message: "ثبت‌نام با موفقیت انجام شد" });
  } catch (error) {
    console.error("registerTournament error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

// ─── Unregister ───────────────────────────────────────────────────────────────

export const unregisterTournamentController = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const [existing] = await db
      .select()
      .from(tournamentRegistrations)
      .where(
        and(
          eq(tournamentRegistrations.tournamentId, id),
          eq(tournamentRegistrations.userId, userId)
        )
      )
      .limit(1);

    if (!existing) {
      return res.status(404).json({ message: "ثبت‌نامی یافت نشد" });
    }

    await db
      .delete(tournamentRegistrations)
      .where(
        and(
          eq(tournamentRegistrations.tournamentId, id),
          eq(tournamentRegistrations.userId, userId)
        )
      );

    // Re-open if was full
    const [tournament] = await db.select().from(tournaments).where(eq(tournaments.id, id)).limit(1);
    if (tournament?.status === "full") {
      await db
        .update(tournaments)
        .set({ status: "open", updatedAt: new Date() })
        .where(eq(tournaments.id, id));
    }

    return res.status(200).json({ message: "انصراف با موفقیت ثبت شد" });
  } catch (error) {
    console.error("unregisterTournament error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

// ─── Get Participants (club owner / admin) ─────────────────────────────────

export const getTournamentParticipantsController = async (req, res) => {
  try {
    const { id } = req.params;

    const [tournament] = await db
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, id))
      .limit(1);

    if (!tournament) return res.status(404).json({ message: "تورنومنت یافت نشد" });

    const participants = await db
      .select({
        id: tournamentRegistrations.id,
        userId: tournamentRegistrations.userId,
        paymentStatus: tournamentRegistrations.paymentStatus,
        registeredAt: tournamentRegistrations.registeredAt,
        name: users.name,
        image: users.image,
        phone: users.phone,
        level: users.level,
        skillLevel: users.skillLevel,
      })
      .from(tournamentRegistrations)
      .innerJoin(users, eq(tournamentRegistrations.userId, users.id))
      .where(eq(tournamentRegistrations.tournamentId, id))
      .orderBy(asc(tournamentRegistrations.registeredAt));

    return res.status(200).json({ participants, total: participants.length });
  } catch (error) {
    console.error("getTournamentParticipants error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

// ─── Tournament Results (bracket + standings) ───────────────────────────────

export const getTournamentResultsController = async (req, res) => {
  try {
    const { id } = req.params;

    const [tournament] = await db
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, id))
      .limit(1);

    if (!tournament) return res.status(404).json({ message: "تورنومنت یافت نشد" });

    const matches = await loadTournamentMatchesWithUsers(id);
    const standings = await buildTournamentStandings(id);
    return res.status(200).json({ matches, standings });
  } catch (error) {
    console.error("getTournamentResults error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

export const setTournamentMatchResultController = async (req, res) => {
  try {
    const { id, matchId } = req.params;
    const { sets, playerAUserId, playerBUserId, round } = req.body;

    const [tournament] = await db
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, id))
      .limit(1);

    if (!tournament) return res.status(404).json({ message: "تورنومنت یافت نشد" });
    if (!(await canManageTournament(req.user, tournament))) {
      return res.status(403).json({ message: "دسترسی ندارید" });
    }

    if (matchId === "manual") {
      const selectedRound = Number(round ?? 1);
      if (!Number.isInteger(selectedRound) || selectedRound < 1 || selectedRound > 99) {
        return res.status(400).json({ message: "راند نامعتبر است" });
      }

      if (!playerAUserId || !playerBUserId) {
        return res.status(400).json({ message: "بازیکن A و بازیکن B الزامی هستند" });
      }
      if (String(playerAUserId) === String(playerBUserId)) {
        return res.status(400).json({ message: "بازیکنان باید متفاوت باشند" });
      }

      const normalizedSets = normalizeScoreSets(sets);
      if (!normalizedSets) {
        return res.status(400).json({ message: "فرمت ست‌ها نامعتبر است" });
      }

      const participantRows = await db
        .select({ userId: tournamentRegistrations.userId })
        .from(tournamentRegistrations)
        .where(eq(tournamentRegistrations.tournamentId, id));
      const participantIds = new Set(participantRows.map((row) => String(row.userId)));
      if (!participantIds.has(String(playerAUserId)) || !participantIds.has(String(playerBUserId))) {
        return res.status(400).json({ message: "هر دو بازیکن باید جزو شرکت‌کنندگان تورنومنت باشند" });
      }

      const winnerSide = computeWinnerFromSets(normalizedSets);
      if (!winnerSide) {
        return res.status(400).json({ message: "مجموع نتیجه ست‌ها برنده مشخصی ندارد" });
      }

      const winnerUserId = winnerSide === "A" ? playerAUserId : playerBUserId;

      const [maxMatch] = await db
        .select({ maxMatch: sql`COALESCE(MAX(${tournamentMatches.matchNumber}), 0)` })
        .from(tournamentMatches)
        .where(and(eq(tournamentMatches.tournamentId, id), eq(tournamentMatches.round, selectedRound)));

      const nextMatchNumber = Number(maxMatch?.maxMatch ?? 0) + 1;

      await db.insert(tournamentMatches).values({
        tournamentId: id,
        round: selectedRound,
        matchNumber: nextMatchNumber,
        playerAUserId,
        playerBUserId,
        winnerUserId,
        scoreSets: normalizedSets,
        status: "finished",
      });

      const matches = await loadTournamentMatchesWithUsers(id);
      const standings = await buildTournamentStandings(id);
      return res.status(200).json({ message: "نتیجه ثبت شد", matches, standings });
    }

    const [matchRow] = await db
      .select()
      .from(tournamentMatches)
      .where(and(eq(tournamentMatches.id, matchId), eq(tournamentMatches.tournamentId, id)))
      .limit(1);

    if (!matchRow) return res.status(404).json({ message: "بازی یافت نشد" });
    if (!matchRow.playerAUserId || !matchRow.playerBUserId) {
      return res.status(400).json({ message: "این بازی هنوز کامل نشده و بازیکنان آن مشخص نیستند" });
    }
    if (matchRow.status !== "scheduled") {
      return res.status(409).json({ message: "نتیجه این بازی قبلاً ثبت شده است" });
    }

    const normalizedSets = normalizeScoreSets(sets);
    if (!normalizedSets) {
      return res.status(400).json({ message: "فرمت ست‌ها نامعتبر است" });
    }

    const winnerSide = computeWinnerFromSets(normalizedSets);
    if (!winnerSide) {
      return res.status(400).json({ message: "مجموع نتیجه ست‌ها برنده مشخصی ندارد" });
    }

    const winnerUserId = winnerSide === "A" ? matchRow.playerAUserId : matchRow.playerBUserId;

    await db
      .update(tournamentMatches)
      .set({
        scoreSets: normalizedSets,
        winnerUserId,
        status: "finished",
        updatedAt: new Date(),
      })
      .where(eq(tournamentMatches.id, matchRow.id));

    const matches = await loadTournamentMatchesWithUsers(id);
    const standings = await buildTournamentStandings(id);
    return res.status(200).json({ message: "نتیجه ثبت شد", matches, standings });
  } catch (error) {
    console.error("setTournamentMatchResult error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

// ─── Club's tournaments (for club panel) ─────────────────────────────────────

export const getClubTournamentsController = async (req, res) => {
  try {
    const { clubId } = req.params;

    const rows = await db
      .select()
      .from(tournaments)
      .where(eq(tournaments.clubId, clubId))
      .orderBy(desc(tournaments.createdAt));

    const enriched = await Promise.all(rows.map(enrichTournament));
    return res.status(200).json({ tournaments: enriched });
  } catch (error) {
    console.error("getClubTournaments error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};
