import { eq, and, count, gte, inArray } from "drizzle-orm";
import { db } from "../db/index.js";
import { spinWheelSpins, discountCodes, matches, bookings } from "../db/schema.js";

// ─── Milestone definitions ────────────────────────────────────────────────────

export const MILESTONES = [
  {
    key: "signup",
    title: "ثبت‌نام در رکت‌زون",
    description: "فقط با ثبت‌نام، یه جایزه بگیر!",
    icon: "🎉",
  },
  {
    key: "first_match",
    title: "برگزاری اولین مسابقه",
    description: "یه مسابقه بساز و برگزار کن",
    icon: "🎾",
  },
  {
    key: "first_booking",
    title: "اولین رزرو زمین",
    description: "یه بار زمین رزرو کن",
    icon: "📅",
  },
  {
    key: "ten_bookings_month",
    title: "۱۰ رزرو در یک ماه",
    description: "در یک ماه ۱۰ رزرو داشته باش",
    icon: "🏆",
  },
];

// ─── Prizes ───────────────────────────────────────────────────────────────────

const PRIZES = [
  { label: "تخفیف ۲۰ هزار تومانی", type: "fixed", value: 20000, probability: 35 },
  { label: "تخفیف ۵۰ هزار تومانی", type: "fixed", value: 50000, probability: 25 },
  { label: "تیشرت رکت‌زون",         type: "gift",  value: 0,     probability: 10 },
  { label: "یک جلسه رایگان",        type: "gift",  value: 0,     probability: 10 },
  { label: "یک قهوه رایگان",        type: "gift",  value: 0,     probability: 20 },
];

function pickPrize() {
  const total = PRIZES.reduce((s, p) => s + p.probability, 0);
  let rand = Math.random() * total;
  for (const prize of PRIZES) {
    rand -= prize.probability;
    if (rand <= 0) return prize;
  }
  return PRIZES[PRIZES.length - 1];
}

function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "SPIN";
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// ─── Eligibility checks per milestone ────────────────────────────────────────

async function checkMilestone(key, userId) {
  switch (key) {
    case "signup":
      return true; // every registered user qualifies
    case "first_match": {
      const [row] = await db
        .select({ cnt: count() })
        .from(matches)
        .where(and(eq(matches.createdBy, userId), eq(matches.status, "completed")));
      return (row?.cnt ?? 0) > 0;
    }
    case "first_booking": {
      const [row] = await db
        .select({ cnt: count() })
        .from(bookings)
        .where(and(eq(bookings.userId, userId), inArray(bookings.status, ["approved", "pending"])));
      return (row?.cnt ?? 0) > 0;
    }
    case "ten_bookings_month": {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      const [row] = await db
        .select({ cnt: count() })
        .from(bookings)
        .where(and(
          eq(bookings.userId, userId),
          inArray(bookings.status, ["approved", "pending"]),
          gte(bookings.createdAt, monthAgo),
        ));
      return (row?.cnt ?? 0) >= 10;
    }
    default:
      return false;
  }
}

// ─── Controllers ─────────────────────────────────────────────────────────────

export const getSpinEligibilityController = async (req, res) => {
  try {
    const userId = req.user.id;

    const spunRows = await db
      .select({ reason: spinWheelSpins.reason })
      .from(spinWheelSpins)
      .where(eq(spinWheelSpins.userId, userId));

    const spunReasons = new Set(spunRows.map((r) => r.reason));

    const milestones = await Promise.all(
      MILESTONES.map(async (m) => {
        const achieved = await checkMilestone(m.key, userId);
        const spun = spunReasons.has(m.key);
        return { ...m, achieved, spun, canSpin: achieved && !spun };
      })
    );

    const hasEligible = milestones.some((m) => m.canSpin);

    return res.json({ milestones, hasEligible });
  } catch (err) {
    console.error("getSpinEligibility error:", err);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

export const performSpinController = async (req, res) => {
  try {
    const userId = req.user.id;
    const { reason, prizeLabel } = req.body;

    if (!reason || !MILESTONES.find((m) => m.key === reason)) {
      return res.status(400).json({ message: "چالش نامعتبر است" });
    }

    const [existingSpin] = await db
      .select()
      .from(spinWheelSpins)
      .where(and(eq(spinWheelSpins.userId, userId), eq(spinWheelSpins.reason, reason)))
      .limit(1);

    if (existingSpin) {
      return res.status(409).json({ message: "قبلاً برای این چالش چرخیده‌اید" });
    }

    const isEligible = await checkMilestone(reason, userId);
    if (!isEligible) {
      return res.status(403).json({ message: "شرط این چالش هنوز تکمیل نشده" });
    }

    // Use the sector the wheel landed on, fallback to random pick
    const prize = PRIZES.find((p) => p.label === prizeLabel) ?? pickPrize();
    let code = null;
    let expiresAt = null;
    let discountCodeId = null;

    if (prize.type !== "gift") {
      code = generateCode();
      expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 3);

      const [discountCode] = await db
        .insert(discountCodes)
        .values({
          clubId: null,
          code,
          discountType: prize.type,
          discountValue: prize.value,
          maxUses: 1,
          perUserLimit: 1,
          isActive: true,
          description: `جایزه چرخ شانس - ${prize.label}`,
          expiresAt,
        })
        .returning();
      discountCodeId = discountCode.id;
    }

    await db.insert(spinWheelSpins).values({
      userId,
      reason,
      prizeLabel: prize.label,
      prizeType: prize.type,
      prizeValue: prize.value,
      discountCodeId,
    });

    return res.json({ prize, code, expiresAt });
  } catch (err) {
    console.error("performSpin error:", err);
    return res.status(500).json({ message: "خطای سرور" });
  }
};
