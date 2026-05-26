import { eq, and, asc, desc, ilike, or, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { tournaments, tournamentRegistrations, users, clubs } from "../db/schema.js";
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

  return { ...tournament, status: computedStatus, phase, registeredCount, participants: registrations, club };
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

    if (!title || !registrationDeadline || !startDate || !endDate) {
      return res.status(400).json({ message: "اطلاعات ناقص است" });
    }

    const now = new Date();
    if (new Date(startDate) <= now) {
      return res.status(400).json({ message: "تاریخ شروع باید در آینده باشد" });
    }
    if (new Date(registrationDeadline) >= new Date(startDate)) {
      return res.status(400).json({ message: "مهلت ثبت‌نام باید قبل از شروع مسابقه باشد" });
    }

    const [tournament] = await db
      .insert(tournaments)
      .values({
        clubId: clubId || null,
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
