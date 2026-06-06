import { eq, and, desc, count, inArray, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { discountCodes, discountCodeUsages, clubs, courts, bookings, users, tournaments, tournamentRegistrations } from "../db/schema.js";
import { sendSMS } from "../utils/sms.js";

const WELCOME_DISCOUNT_CODE = "WELCOME20";

async function assertClubOwnership(req, clubId) {
  if (req.user.isAdmin) return true;
  const [club] = await db
    .select({ id: clubs.id })
    .from(clubs)
    .where(and(eq(clubs.id, clubId), eq(clubs.ownerId, req.user.id)))
    .limit(1);
  return !!club;
}

function generateCode(length = 8) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < length; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

async function getUserPhone(userId) {
  const [user] = await db
    .select({ phone: users.phone })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return user?.phone ?? null;
}

async function getDiscountUsageCountByPhone(discountCodeId, phone) {
  if (!phone) return 0;
  const [usageCount] = await db
    .select({ cnt: count() })
    .from(discountCodeUsages)
    .innerJoin(users, eq(discountCodeUsages.userId, users.id))
    .where(and(
      eq(discountCodeUsages.discountCodeId, discountCodeId),
      eq(users.phone, phone),
    ));
  return usageCount?.cnt ?? 0;
}

async function findOrCreateWelcomeDiscount(clubId) {
  const [existing] = await db
    .select()
    .from(discountCodes)
    .where(eq(discountCodes.code, WELCOME_DISCOUNT_CODE))
    .limit(1);
  if (existing) return existing;
  if (!clubId) return null;

  const [created] = await db
    .insert(discountCodes)
    .values({
      clubId,
      code: WELCOME_DISCOUNT_CODE,
      discountType: "percent",
      discountValue: 20,
      maxUses: null,
      perUserLimit: 1,
      minBookingPrice: 0,
      description: "تخفیف خوش‌آمدگویی کاربران جدید",
    })
    .onConflictDoNothing({ target: discountCodes.code })
    .returning();

  if (created) return created;

  const [row] = await db
    .select()
    .from(discountCodes)
    .where(eq(discountCodes.code, WELCOME_DISCOUNT_CODE))
    .limit(1);
  return row ?? null;
}

// ─── Club Panel: CRUD ─────────────────────────────────────────────────────────

export const getDiscountCodesController = async (req, res) => {
  try {
    const { clubId } = req.params;
    if (!(await assertClubOwnership(req, clubId))) {
      return res.status(403).json({ message: "دسترسی ندارید" });
    }

    const codes = await db
      .select()
      .from(discountCodes)
      .where(eq(discountCodes.clubId, clubId))
      .orderBy(desc(discountCodes.createdAt));

    return res.json(codes);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

export const createDiscountCodeController = async (req, res) => {
  try {
    const { clubId } = req.params;
    if (!(await assertClubOwnership(req, clubId))) {
      return res.status(403).json({ message: "دسترسی ندارید" });
    }

    const {
      code,
      discountType = "percent",
      discountValue,
      maxUses,
      perUserLimit = 1,
      minBookingPrice = 0,
      expiresAt,
      description,
    } = req.body;

    if (!discountValue || discountValue <= 0) {
      return res.status(400).json({ message: "مقدار تخفیف نامعتبر است" });
    }
    if (discountType === "percent" && discountValue > 100) {
      return res.status(400).json({ message: "درصد تخفیف نمی‌تواند بیش از ۱۰۰ باشد" });
    }

    const finalCode = (code || generateCode()).toUpperCase().trim();

    const existing = await db
      .select({ id: discountCodes.id })
      .from(discountCodes)
      .where(eq(discountCodes.code, finalCode))
      .limit(1);

    if (existing.length > 0) {
      return res.status(409).json({ message: "این کد قبلاً استفاده شده است" });
    }

    const [created] = await db
      .insert(discountCodes)
      .values({
        clubId,
        code: finalCode,
        discountType,
        discountValue,
        maxUses: maxUses || null,
        perUserLimit,
        minBookingPrice,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        description,
      })
      .returning();

    return res.status(201).json(created);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

export const updateDiscountCodeController = async (req, res) => {
  try {
    const { clubId, codeId } = req.params;
    if (!(await assertClubOwnership(req, clubId))) {
      return res.status(403).json({ message: "دسترسی ندارید" });
    }

    const [existing] = await db
      .select()
      .from(discountCodes)
      .where(and(eq(discountCodes.id, codeId), eq(discountCodes.clubId, clubId)))
      .limit(1);

    if (!existing) return res.status(404).json({ message: "کد تخفیف یافت نشد" });

    const {
      discountType, discountValue, maxUses, perUserLimit,
      minBookingPrice, expiresAt, description, isActive,
    } = req.body;

    const [updated] = await db
      .update(discountCodes)
      .set({
        ...(discountType !== undefined && { discountType }),
        ...(discountValue !== undefined && { discountValue }),
        ...(maxUses !== undefined && { maxUses: maxUses || null }),
        ...(perUserLimit !== undefined && { perUserLimit }),
        ...(minBookingPrice !== undefined && { minBookingPrice }),
        ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
        ...(description !== undefined && { description }),
        ...(isActive !== undefined && { isActive }),
        updatedAt: new Date(),
      })
      .where(eq(discountCodes.id, codeId))
      .returning();

    return res.json(updated);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

export const deleteDiscountCodeController = async (req, res) => {
  try {
    const { clubId, codeId } = req.params;
    if (!(await assertClubOwnership(req, clubId))) {
      return res.status(403).json({ message: "دسترسی ندارید" });
    }

    await db
      .delete(discountCodes)
      .where(and(eq(discountCodes.id, codeId), eq(discountCodes.clubId, clubId)));

    return res.json({ message: "کد تخفیف حذف شد" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

export const getDiscountCodeUsagesController = async (req, res) => {
  try {
    const { clubId, codeId } = req.params;
    if (!(await assertClubOwnership(req, clubId))) {
      return res.status(403).json({ message: "دسترسی ندارید" });
    }

    const [codeRow] = await db
      .select({ id: discountCodes.id })
      .from(discountCodes)
      .where(and(eq(discountCodes.id, codeId), eq(discountCodes.clubId, clubId)))
      .limit(1);

    if (!codeRow) return res.status(404).json({ message: "کد تخفیف یافت نشد" });

    const usages = await db
      .select({
        id: discountCodeUsages.id,
        discountAmount: discountCodeUsages.discountAmount,
        usedAt: discountCodeUsages.usedAt,
        userName: users.name,
        userPhone: users.phone,
        bookingId: discountCodeUsages.bookingId,
      })
      .from(discountCodeUsages)
      .leftJoin(users, eq(discountCodeUsages.userId, users.id))
      .where(eq(discountCodeUsages.discountCodeId, codeId))
      .orderBy(desc(discountCodeUsages.usedAt));

    return res.json(usages);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

// ─── Club Panel: SMS Campaign ─────────────────────────────────────────────────

export const sendSmsCampaignController = async (req, res) => {
  try {
    const { clubId } = req.params;
    if (!(await assertClubOwnership(req, clubId))) {
      return res.status(403).json({ message: "دسترسی ندارید" });
    }

    const { discountCodeId, message, recipientFilter = "all" } = req.body;

    if (!message || message.trim().length < 5) {
      return res.status(400).json({ message: "متن پیام بسیار کوتاه است" });
    }

    // Resolve discount code if provided
    let discountCode = null;
    if (discountCodeId) {
      const [row] = await db
        .select()
        .from(discountCodes)
        .where(and(eq(discountCodes.id, discountCodeId), eq(discountCodes.clubId, clubId)))
        .limit(1);
      if (!row) return res.status(404).json({ message: "کد تخفیف یافت نشد" });
      discountCode = row;
    }

    const clubCourts = await db.select({ id: courts.id }).from(courts).where(eq(courts.clubId, clubId));
    const courtIds = clubCourts.map(c => c.id);

    const bookingRows = courtIds.length > 0
      ? await db
          .select({
            userId: bookings.userId,
            lastDate: sql`max(${bookings.date})`,
            bookCount: sql`count(*)`,
            totalSpent: sql`sum(case when ${bookings.status} = 'approved' then ${bookings.totalPrice} else 0 end)`,
          })
          .from(bookings)
          .where(inArray(bookings.courtId, courtIds))
          .groupBy(bookings.userId)
      : [];

    const clubTournaments = await db.select({ id: tournaments.id }).from(tournaments).where(eq(tournaments.clubId, clubId));
    const tournamentIds = clubTournaments.map(t => t.id);

    const tournamentRows = tournamentIds.length > 0
      ? await db.select({ userId: tournamentRegistrations.userId }).from(tournamentRegistrations).where(inArray(tournamentRegistrations.tournamentId, tournamentIds))
      : [];

    const bookedUserIds = new Set(bookingRows.map(r => r.userId));
    const tournamentUserIds = new Set(tournamentRows.map(r => r.userId));
    const now = new Date();
    const dormantBefore = new Date(now); dormantBefore.setDate(now.getDate() - 30);
    const freshAfter = new Date(now); freshAfter.setDate(now.getDate() - 14);
    const dormantBeforeStr = dormantBefore.toISOString().split("T")[0];
    const freshAfterStr = freshAfter.toISOString().split("T")[0];

    let targetUserIds;
    if (recipientFilter === "booked") {
      targetUserIds = [...bookedUserIds];
    } else if (recipientFilter === "tournament") {
      targetUserIds = [...tournamentUserIds];
    } else if (recipientFilter === "vip") {
      targetUserIds = bookingRows.filter(r => Number(r.bookCount) >= 3 || Number(r.totalSpent) >= 3000000).map(r => r.userId);
    } else if (recipientFilter === "dormant") {
      targetUserIds = bookingRows.filter(r => r.lastDate && r.lastDate < dormantBeforeStr).map(r => r.userId);
    } else if (recipientFilter === "new") {
      targetUserIds = bookingRows.filter(r => r.lastDate && r.lastDate >= freshAfterStr && Number(r.bookCount) <= 2).map(r => r.userId);
    } else if (recipientFilter === "low_activity") {
      targetUserIds = bookingRows.filter(r => Number(r.bookCount) <= 1).map(r => r.userId);
    } else {
      targetUserIds = [...new Set([...bookedUserIds, ...tournamentUserIds])];
    }

    if (targetUserIds.length === 0) {
      return res.status(400).json({ message: "هیچ مشتری‌ای برای ارسال پیدا نشد" });
    }

    const targetUsers = await db
      .select({ id: users.id, phone: users.phone, name: users.name })
      .from(users)
      .where(inArray(users.id, targetUserIds));

    const usersWithPhone = targetUsers.filter(u => u.phone);

    if (usersWithPhone.length === 0) {
      return res.status(400).json({ message: "هیچ کاربری شماره تلفن ندارد" });
    }

    // Replace placeholders in message
    const buildMessage = (user) =>
      message
        .replace(/\{name\}/g, user.name ?? "دوست عزیز")
        .replace(/\{code\}/g, discountCode?.code ?? "")
        .replace(/\{discount\}/g, discountCode
          ? discountCode.discountType === "percent"
            ? `${discountCode.discountValue}٪`
            : `${discountCode.discountValue.toLocaleString()} تومان`
          : "");

    // Send in background — respond immediately with total count
    let sent = 0;
    let failed = 0;

    // Fire-and-forget with result tracking
    const sendPromises = usersWithPhone.map(async (user) => {
      const text = buildMessage(user);
      const ok = await sendSMS(user.phone, text);
      if (ok) sent++; else failed++;
    });

    // Wait for all but cap total time to 20s to avoid gateway timeout
    await Promise.race([
      Promise.all(sendPromises),
      new Promise(r => setTimeout(r, 20000)),
    ]);

    return res.json({
      total: usersWithPhone.length,
      sent,
      failed,
      message: `پیام برای ${sent} نفر ارسال شد${failed > 0 ? `، ${failed} نفر ناموفق` : ""}`,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

export const getMarketingSegmentsController = async (req, res) => {
  try {
    const { clubId } = req.params;
    if (!(await assertClubOwnership(req, clubId))) {
      return res.status(403).json({ message: "دسترسی ندارید" });
    }

    const clubCourts = await db.select({ id: courts.id }).from(courts).where(eq(courts.clubId, clubId));
    const courtIds = clubCourts.map(c => c.id);
    const bookingRows = courtIds.length > 0
      ? await db
          .select({
            userId: bookings.userId,
            lastDate: sql`max(${bookings.date})`,
            bookCount: sql`count(*)`,
            totalSpent: sql`sum(case when ${bookings.status} = 'approved' then ${bookings.totalPrice} else 0 end)`,
          })
          .from(bookings)
          .where(inArray(bookings.courtId, courtIds))
          .groupBy(bookings.userId)
      : [];

    const clubTournaments = await db.select({ id: tournaments.id }).from(tournaments).where(eq(tournaments.clubId, clubId));
    const tournamentIds = clubTournaments.map(t => t.id);
    const tournamentRows = tournamentIds.length > 0
      ? await db.select({ userId: tournamentRegistrations.userId }).from(tournamentRegistrations).where(inArray(tournamentRegistrations.tournamentId, tournamentIds))
      : [];

    const now = new Date();
    const dormantBefore = new Date(now); dormantBefore.setDate(now.getDate() - 30);
    const freshAfter = new Date(now); freshAfter.setDate(now.getDate() - 14);
    const dormantBeforeStr = dormantBefore.toISOString().split("T")[0];
    const freshAfterStr = freshAfter.toISOString().split("T")[0];
    const bookedUserIds = new Set(bookingRows.map(r => r.userId));
    const tournamentUserIds = new Set(tournamentRows.map(r => r.userId));
    const allUserIds = new Set([...bookedUserIds, ...tournamentUserIds]);
    const countRows = (fn) => bookingRows.filter(fn).length;

    return res.json({
      segments: [
        { key: "all", label: "همه مشتریان", count: allUserIds.size, recommendedDiscount: 15 },
        { key: "vip", label: "مشتریان VIP", count: countRows(r => Number(r.bookCount) >= 3 || Number(r.totalSpent) >= 3000000), recommendedDiscount: 10 },
        { key: "dormant", label: "مشتریان خوابیده", count: countRows(r => r.lastDate && r.lastDate < dormantBeforeStr), recommendedDiscount: 25 },
        { key: "new", label: "مشتریان تازه‌وارد", count: countRows(r => r.lastDate && r.lastDate >= freshAfterStr && Number(r.bookCount) <= 2), recommendedDiscount: 15 },
        { key: "low_activity", label: "کم‌فعال‌ها", count: countRows(r => Number(r.bookCount) <= 1), recommendedDiscount: 20 },
        { key: "tournament", label: "تورنومنتی‌ها", count: tournamentUserIds.size, recommendedDiscount: 12 },
      ],
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

// ─── User: Validate a discount code ──────────────────────────────────────────

export const validateDiscountCodeController = async (req, res) => {
  try {
    const userId = req.user.id;
    const { code, clubId, bookingPrice } = req.body;
    const normalizedCode = code?.toUpperCase().trim();

    if (!normalizedCode || (!clubId && normalizedCode !== WELCOME_DISCOUNT_CODE)) {
      return res.status(400).json({ message: "اطلاعات ناقص است" });
    }

    const [regularDiscountCode] = normalizedCode === WELCOME_DISCOUNT_CODE
      ? []
      : await db
          .select()
          .from(discountCodes)
          .where(and(eq(discountCodes.code, normalizedCode), eq(discountCodes.clubId, clubId)))
          .limit(1);
    const discountCode = normalizedCode === WELCOME_DISCOUNT_CODE
      ? await findOrCreateWelcomeDiscount(clubId)
      : regularDiscountCode;

    if (!discountCode) {
      return res.status(404).json({ message: "کد تخفیف معتبر نیست" });
    }

    if (!discountCode.isActive) {
      return res.status(400).json({ message: "این کد تخفیف غیرفعال است" });
    }

    if (discountCode.expiresAt && new Date() > new Date(discountCode.expiresAt)) {
      return res.status(400).json({ message: "کد تخفیف منقضی شده است" });
    }

    if (discountCode.maxUses !== null && discountCode.usedCount >= discountCode.maxUses) {
      return res.status(400).json({ message: "ظرفیت استفاده از این کد تخفیف پر شده است" });
    }

    if (bookingPrice && discountCode.minBookingPrice && bookingPrice < discountCode.minBookingPrice) {
      return res.status(400).json({
        message: `حداقل مبلغ رزرو برای این کد ${discountCode.minBookingPrice.toLocaleString()} تومان است`,
      });
    }

    const usageCount = normalizedCode === WELCOME_DISCOUNT_CODE
      ? await getDiscountUsageCountByPhone(discountCode.id, await getUserPhone(userId))
      : (await db
          .select({ cnt: count() })
          .from(discountCodeUsages)
          .where(and(
            eq(discountCodeUsages.discountCodeId, discountCode.id),
            eq(discountCodeUsages.userId, userId),
          )))[0]?.cnt ?? 0;

    if (usageCount >= discountCode.perUserLimit) {
      return res.status(400).json({ message: "قبلاً از این کد تخفیف استفاده کرده‌اید" });
    }

    const price = bookingPrice ?? 0;
    const discountAmount = discountCode.discountType === "percent"
      ? Math.round(price * discountCode.discountValue / 100)
      : Math.min(discountCode.discountValue, price);

    return res.json({
      valid: true,
      discountCodeId: discountCode.id,
      discountType: discountCode.discountType,
      discountValue: discountCode.discountValue,
      discountAmount,
      finalPrice: Math.max(0, price - discountAmount),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "خطای سرور" });
  }
};
