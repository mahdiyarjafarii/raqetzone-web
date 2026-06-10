import { eq, and, desc, count, inArray } from "drizzle-orm";
import { db } from "../db/index.js";
import { bookings, courts, clubs, users, discountCodes, discountCodeUsages, slotOverrides, deals } from "../db/schema.js";
import { sendNotification } from "../utils/sendNotification.js";
import { sendSMS } from "../utils/sms.js";
import { formatBookingDateTimeFa } from "../utils/bookingTime.js";
import { payBookingWithWallet } from "./walletController.js";

const WELCOME_DISCOUNT_CODE = "WELCOME20";
const PLATFORM_PUBLIC_DISCOUNT_CODES = new Set([WELCOME_DISCOUNT_CODE]);
const TEHRAN_OFFSET = "+03:30";
const TEHRAN_TIME_ZONE = "Asia/Tehran";
const BOOKING_TIME_PASSED_NOTE = "تایم زمین گذشته";

function getDatePart(parts, type) {
  return parts.find((part) => part.type === type)?.value;
}

function getTodayDateKeyInTehran(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: TEHRAN_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = getDatePart(parts, "year");
  const month = getDatePart(parts, "month");
  const day = getDatePart(parts, "day");

  return `${year}-${month}-${day}`;
}

function isPlatformPublicDiscountCode(code) {
  if (!code) return false;
  return PLATFORM_PUBLIC_DISCOUNT_CODES.has(String(code).toUpperCase().trim());
}

function generateTrackingCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "RZ-";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function timeToMinutes(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function parseBookingEndDateTime(date, endTime) {
  if (!date || !endTime) return null;
  const parsed = new Date(`${date}T${endTime}:00${TEHRAN_OFFSET}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isPendingBookingExpiredByTime(booking, now = new Date()) {
  if (!booking || booking.status !== "pending") return false;
  const endDateTime = parseBookingEndDateTime(booking.date, booking.endTime);
  return Boolean(endDateTime && endDateTime <= now);
}

async function notifyBookingExpiredByTime(booking) {
  if (!booking?.userId) return;
  const bookingDateTime = formatBookingDateTimeFa(booking);
  await sendNotification(booking.userId, {
    title: "رزرو شما منقضی شد ⌛️",
    message: `درخواست رزرو شما برای ${bookingDateTime} به‌صورت خودکار رد شد چون تایم زمین گذشته است.`,
    type: "BOOKING",
    metadata: {
      bookingId: booking.id,
      date: booking.date,
      startTime: booking.startTime,
      ctaHref: "/mybooking",
      ctaLabel: "مشاهده رزروها",
    },
  }).catch(() => {});
}

async function expirePendingBookings(bookingsList) {
  const now = new Date();
  const expiredBookings = bookingsList
    .filter((booking) => isPendingBookingExpiredByTime(booking, now));
  const expiredIds = expiredBookings.map((booking) => booking.id);

  if (expiredIds.length === 0) return [];

  await db
    .update(bookings)
    .set({
      status: "rejected",
      adminNote: BOOKING_TIME_PASSED_NOTE,
      updatedAt: now,
    })
    .where(inArray(bookings.id, expiredIds));

  await Promise.allSettled(expiredBookings.map((booking) => notifyBookingExpiredByTime(booking)));

  return expiredIds;
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

// ─── User endpoints ───────────────────────────────────────────────────────────

export const createBookingController = async (req, res) => {
  try {
    const userId = req.user.id;
    const { courtId, date, startTime, endTime, notes, discountCode, paymentMethod = "none" } = req.body;
    console.log("[CreateBooking] request body:", {
      userId,
      courtId,
      date,
      startTime,
      endTime,
      notes,
      discountCode,
      paymentMethod,
    });

    if (!courtId || !date || !startTime || !endTime) {
      return res.status(400).json({ message: "اطلاعات ناقص است" });
    }

    if (!["none", "wallet"].includes(paymentMethod)) {
      return res.status(400).json({ message: "روش پرداخت نامعتبر است" });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ message: "فرمت تاریخ نامعتبر است (YYYY-MM-DD)" });
    }

    const startMin = timeToMinutes(startTime);
    const endMin = timeToMinutes(endTime);
    if (endMin <= startMin) {
      return res.status(400).json({ message: "زمان پایان باید بعد از زمان شروع باشد" });
    }

    // Check date is not in the past
    const today = getTodayDateKeyInTehran();
    if (date < today) {
      return res.status(400).json({ message: "نمی‌توان برای تاریخ گذشته رزرو کرد" });
    }

    const sameDayUserBookings = await db
      .select({
        id: bookings.id,
        status: bookings.status,
        date: bookings.date,
        endTime: bookings.endTime,
      })
      .from(bookings)
      .where(and(
        eq(bookings.userId, userId),
        eq(bookings.date, date),
      ));

    const expiredSameDayIds = await expirePendingBookings(sameDayUserBookings);
    const hasAnotherSameDayBooking = sameDayUserBookings.some((booking) => {
      if (expiredSameDayIds.includes(booking.id)) return false;
      return booking.status !== "rejected" && booking.status !== "cancelled";
    });

    if (hasAnotherSameDayBooking) {
      return res.status(409).json({ message: "شما در این تاریخ قبلاً رزرو ثبت کرده‌اید" });
    }

    const [court] = await db
      .select({ id: courts.id, clubId: courts.clubId, name: courts.name, location: courts.location, address: courts.address,
                surfaceType: courts.surfaceType, sportType: courts.sportType, pricePerHour: courts.pricePerHour,
                image: courts.image, managerPhone: courts.managerPhone, openTime: courts.openTime,
                closeTime: courts.closeTime, slotDuration: courts.slotDuration, isActive: courts.isActive,
                clubName: clubs.name, clubPhone: clubs.phone, clubOwnerPhone: users.phone })
      .from(courts)
      .leftJoin(clubs, eq(courts.clubId, clubs.id))
      .leftJoin(users, eq(clubs.ownerId, users.id))
      .where(and(eq(courts.id, courtId), eq(courts.isActive, true)))
      .limit(1);

    if (!court) return res.status(404).json({ message: "زمین یافت نشد" });

    // Prevent double booking — check overlapping active bookings
    const existing = await db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.courtId, courtId),
          eq(bookings.date, date)
        )
      );

    const hasOverlap = existing.some((b) => {
      if (b.status === "rejected" || b.status === "cancelled") return false;
      const bStart = timeToMinutes(b.startTime);
      const bEnd = timeToMinutes(b.endTime);
      return startMin < bEnd && endMin > bStart;
    });

    if (hasOverlap) {
      return res.status(409).json({ message: "این بازه زمانی قبلاً رزرو شده است" });
    }

    const durationHours = (endMin - startMin) / 60;
    const storedDurationHours = Math.ceil(durationHours);

    // Read the slot override (deal / custom price) for this exact slot so the
    // booking is charged the same discounted price the user saw. Mirrors the
    // computation in courtController.generateSlots to avoid rounding drift.
    let slotOverride = null;
    try {
      [slotOverride] = await db
        .select()
        .from(slotOverrides)
        .where(and(
          eq(slotOverrides.courtId, courtId),
          eq(slotOverrides.date, date),
          eq(slotOverrides.startTime, startTime),
        ))
        .limit(1);
    } catch { /* table may not exist yet */ }

    const effectivePerHour = slotOverride?.price ?? court.pricePerHour;
    const slotDiscountPercent = slotOverride?.discountPercent ?? 0;
    const basePrice = Math.round(effectivePerHour * durationHours); // original price before any discount
    const finalPerHour = slotDiscountPercent > 0
      ? Math.round(effectivePerHour * (1 - slotDiscountPercent / 100))
      : effectivePerHour;
    const priceAfterSlot = Math.round(finalPerHour * durationHours); // after slot/deal discount
    console.log("[CreateBooking] calculated values:", {
      startMin,
      endMin,
      durationHours,
      storedDurationHours,
      pricePerHour: court.pricePerHour,
      effectivePerHour,
      slotDiscountPercent,
      basePrice,
      priceAfterSlot,
      slotDuration: court.slotDuration,
    });

    // Apply discount code if provided
    let discountCodeRow = null;
    let discountAmount = 0;
    if (discountCode) {
      const normalizedDiscountCode = discountCode.toUpperCase().trim();
      const isPlatformCode = isPlatformPublicDiscountCode(normalizedDiscountCode);
      if (normalizedDiscountCode === WELCOME_DISCOUNT_CODE) {
        discountCodeRow = await findOrCreateWelcomeDiscount(court.clubId);
      } else {
        [discountCodeRow] = await db
          .select()
          .from(discountCodes)
          .where(eq(discountCodes.code, normalizedDiscountCode))
          .limit(1);
      }

      if (discountCodeRow && !isPlatformCode && discountCodeRow.clubId !== court.clubId) {
        discountCodeRow = null;
      }

      if (discountCodeRow?.isActive) {
        const now = new Date();
        const expired = discountCodeRow.expiresAt && now > new Date(discountCodeRow.expiresAt);
        const maxedOut = discountCodeRow.maxUses !== null && discountCodeRow.usedCount >= discountCodeRow.maxUses;
        const belowMin = discountCodeRow.minBookingPrice && priceAfterSlot < discountCodeRow.minBookingPrice;

        if (!expired && !maxedOut && !belowMin) {
          const usageCount = isPlatformCode
            ? await getDiscountUsageCountByPhone(discountCodeRow.id, await getUserPhone(userId))
            : (await db
                .select({ cnt: count() })
                .from(discountCodeUsages)
                .where(and(eq(discountCodeUsages.discountCodeId, discountCodeRow.id), eq(discountCodeUsages.userId, userId))))[0]?.cnt ?? 0;

          if (usageCount < discountCodeRow.perUserLimit) {
            // Code discount stacks on top of the slot/deal discount
            discountAmount = discountCodeRow.discountType === "percent"
              ? Math.round(priceAfterSlot * discountCodeRow.discountValue / 100)
              : Math.min(discountCodeRow.discountValue, priceAfterSlot);
          }
        }
      }
    }

    const totalPrice = Math.max(0, priceAfterSlot - discountAmount);
    const trackingCode = generateTrackingCode();
    console.log("[CreateBooking] insert values:", {
      userId,
      courtId,
      date,
      startTime,
      endTime,
      durationHours: storedDurationHours,
      actualDurationHours: durationHours,
      totalPrice,
      notes,
      trackingCode,
      paymentMethod: paymentMethod === "wallet" ? "wallet" : "none",
      paymentStatus: totalPrice === 0 ? "paid" : "unpaid",
      discountAmount,
      discountCodeId: discountCodeRow?.id ?? null,
    });

    const { booking, walletPayment } = await db.transaction(async (tx) => {
      const [createdBooking] = await tx
        .insert(bookings)
        .values({
          userId,
          courtId,
          date,
          startTime,
          endTime,
          durationHours: storedDurationHours,
          totalPrice,
          basePrice,
          slotDiscountPercent,
          discountCode: discountAmount > 0 ? (discountCodeRow?.code ?? null) : null,
          discountAmount,
          notes,
          trackingCode,
          paymentMethod: paymentMethod === "wallet" ? "wallet" : "none",
          paymentStatus: totalPrice === 0 ? "paid" : "unpaid",
        })
        .returning();

      if (discountCodeRow && discountAmount > 0) {
        await tx.insert(discountCodeUsages).values({
          discountCodeId: discountCodeRow.id,
          userId,
          bookingId: createdBooking.id,
          discountAmount,
        });
        await tx.update(discountCodes)
          .set({ usedCount: discountCodeRow.usedCount + 1, updatedAt: new Date() })
          .where(eq(discountCodes.id, discountCodeRow.id));
      }

      let paidByWallet = null;
      if (paymentMethod === "wallet" && totalPrice > 0) {
        paidByWallet = await payBookingWithWallet({ userId, bookingId: createdBooking.id, amount: totalPrice }, tx);
        createdBooking.paymentMethod = "wallet";
        createdBooking.paymentStatus = "paid";
      }

      await tx
        .update(deals)
        .set({ isActive: false })
        .where(and(
          eq(deals.courtId, courtId),
          eq(deals.slotDate, date),
          eq(deals.slotStart, startTime),
          eq(deals.isActive, true),
        ));

      return { booking: createdBooking, walletPayment: paidByWallet };
    });

    const courtFullName = court.clubName ? `زمین ${court.name} باشگاه ${court.clubName}` : `زمین ${court.name}`;
    const bookingDateTime = formatBookingDateTimeFa({ date, startTime, endTime });

    // Notify user of pending booking
    sendNotification(userId, {
      title: "درخواست رزرو ثبت شد ⏳",
      message: `رزرو ${courtFullName} برای ${bookingDateTime} ثبت شد. منتظر تأیید مدیر باشید.`,
      type: "BOOKING",
      metadata: { bookingId: booking.id, courtName: court.name, date, startTime, endTime, ctaHref: "/mybooking", ctaLabel: "مشاهده رزرو" },
      smsText: `پلتفرم رکت‌زون: درخواست رزرو ${courtFullName} برای ${bookingDateTime} ثبت شد و در انتظار تأیید مدیر زمین است.`,
    }).catch(() => {});

    // Notify court manager
    const managerPhone = court.managerPhone || court.clubPhone || court.clubOwnerPhone;
    const managerPhoneSource = court.managerPhone ? "court.managerPhone" : court.clubPhone ? "club.phone" : court.clubOwnerPhone ? "club.owner.phone" : null;
    if (managerPhone) {
      const [requester] = await db.select({ name: users.name, phone: users.phone }).from(users).where(eq(users.id, userId)).limit(1);
      const requesterInfo = requester?.name ? `${requester.name} (${requester.phone})` : requester?.phone ?? "کاربر";
      const managerMsg = `پلتفرم رکت‌زون: درخواست رزرو جدید - ${courtFullName} - ${bookingDateTime} - رزرو کننده: ${requesterInfo} - لطفا از پنل تایید یا رد کنید.`;
      console.log(`[SMS-Manager] → ${managerPhone} (${managerPhoneSource})`);
      sendSMS(managerPhone, managerMsg)
        .then(ok => console.log(`[SMS-Manager] result: ${ok}`))
        .catch(err => console.error("[SMS-Manager] error:", err.message));
    } else {
      console.log(`[SMS-Manager] skipped — no manager phone, club phone, or owner phone for court ${court.id}`);
    }

    const enriched = { ...booking, court };
    return res.status(201).json({ booking: enriched, wallet: walletPayment?.wallet });
  } catch (error) {
    console.error("createBooking error:", {
      message: error.message,
      code: error.code,
      detail: error.detail,
      where: error.where,
      stack: error.stack,
    });
    return res.status(error.statusCode ?? 500).json({ message: error.statusCode ? error.message : "خطای سرور" });
  }
};

export const getMyBookingsController = async (req, res) => {
  try {
    const userId = req.user.id;

    const pendingRows = await db
      .select({
        id: bookings.id,
        userId: bookings.userId,
        date: bookings.date,
        startTime: bookings.startTime,
        endTime: bookings.endTime,
        status: bookings.status,
      })
      .from(bookings)
      .where(and(eq(bookings.userId, userId), eq(bookings.status, "pending")));

    await expirePendingBookings(pendingRows);

    const rows = await db
      .select({
        id: bookings.id,
        date: bookings.date,
        startTime: bookings.startTime,
        endTime: bookings.endTime,
        durationHours: bookings.durationHours,
        totalPrice: bookings.totalPrice,
        status: bookings.status,
        notes: bookings.notes,
        adminNote: bookings.adminNote,
        createdAt: bookings.createdAt,
        court: {
          id: courts.id,
          name: courts.name,
          location: courts.location,
          surfaceType: courts.surfaceType,
          sportType: courts.sportType,
          pricePerHour: courts.pricePerHour,
          image: courts.image,
          managerPhone: courts.managerPhone,
        },
      })
      .from(bookings)
      .innerJoin(courts, eq(bookings.courtId, courts.id))
      .where(eq(bookings.userId, userId))
      .orderBy(desc(bookings.createdAt));

    return res.status(200).json({ bookings: rows });
  } catch (error) {
    console.error("getMyBookings error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

export const cancelBookingController = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const [booking] = await db
      .select()
      .from(bookings)
      .where(and(eq(bookings.id, id), eq(bookings.userId, userId)))
      .limit(1);

    if (!booking) return res.status(404).json({ message: "رزرو یافت نشد" });
    if (booking.status === "approved") {
      return res.status(400).json({ message: "رزرو تأیید شده را نمی‌توان لغو کرد" });
    }

    const [updated] = await db
      .update(bookings)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(bookings.id, id))
      .returning();

    return res.status(200).json({ booking: updated });
  } catch (error) {
    console.error("cancelBooking error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

// ─── Admin endpoints ──────────────────────────────────────────────────────────

export const getAdminBookingsController = async (req, res) => {
  try {
    const { status } = req.query;

    if (!status || status === "pending") {
      const pendingRows = await db
        .select({
          id: bookings.id,
          userId: bookings.userId,
          date: bookings.date,
          startTime: bookings.startTime,
          endTime: bookings.endTime,
          status: bookings.status,
        })
        .from(bookings)
        .where(eq(bookings.status, "pending"));

      await expirePendingBookings(pendingRows);
    }

    const conditions = [];
    if (status) conditions.push(eq(bookings.status, status));

    const rows = await db
      .select({
        id: bookings.id,
        date: bookings.date,
        startTime: bookings.startTime,
        endTime: bookings.endTime,
        durationHours: bookings.durationHours,
        totalPrice: bookings.totalPrice,
        status: bookings.status,
        notes: bookings.notes,
        adminNote: bookings.adminNote,
        createdAt: bookings.createdAt,
        user: {
          id: users.id,
          name: users.name,
          phone: users.phone,
        },
        court: {
          id: courts.id,
          name: courts.name,
          location: courts.location,
        },
      })
      .from(bookings)
      .innerJoin(courts, eq(bookings.courtId, courts.id))
      .innerJoin(users, eq(bookings.userId, users.id))
      .where(conditions.length ? conditions[0] : undefined)
      .orderBy(desc(bookings.createdAt));

    return res.status(200).json({ bookings: rows });
  } catch (error) {
    console.error("getAdminBookings error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

export const updateBookingStatusController = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNote } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "وضعیت باید approved یا rejected باشد" });
    }

    const [booking] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, id))
      .limit(1);

    if (!booking) return res.status(404).json({ message: "رزرو یافت نشد" });
    if (booking.status !== "pending") {
      return res.status(400).json({ message: "فقط رزروهای در انتظار قابل بررسی هستند" });
    }

    if (isPendingBookingExpiredByTime(booking)) {
      await db
        .update(bookings)
        .set({
          status: "rejected",
          adminNote: BOOKING_TIME_PASSED_NOTE,
          updatedAt: new Date(),
        })
        .where(eq(bookings.id, id));

      await notifyBookingExpiredByTime(booking);

      return res.status(400).json({ message: BOOKING_TIME_PASSED_NOTE });
    }

    const [updated] = await db
      .update(bookings)
      .set({ status, adminNote: adminNote || null, updatedAt: new Date() })
      .where(eq(bookings.id, id))
      .returning();

    // Notify the booking owner
    const isApproved = status === "approved";
    const bookingDateTime = formatBookingDateTimeFa(booking);
    const approvedMsg = `رزرو زمین برای ${bookingDateTime} تأیید شد. کد پیگیری: ${booking.trackingCode}`;
    const rejectedMsg = `متأسفانه رزرو شما برای ${bookingDateTime} رد شد.${adminNote ? ` دلیل: ${adminNote}` : ""}`;

    const frontendUrl = process.env.FRONTEND_URL ?? "https://raqetzone.ir";
    const trackingCode = booking.trackingCode;

    const approvedSms = trackingCode
      ? `رکت‌زون: رزرو شما برای ${bookingDateTime} تایید شد. کد پیگیری: ${trackingCode}`
      : `رکت‌زون: رزرو شما برای ${bookingDateTime} تایید شد.`;

    const rejectedSms = `رکت‌زون: رزرو شما برای ${bookingDateTime} رد شد.${adminNote ? ` دلیل: ${adminNote}` : ""}`;

    sendNotification(booking.userId, {
      title: isApproved ? "رزرو شما تأیید شد ✅" : "رزرو شما رد شد ❌",
      message: isApproved ? approvedMsg : rejectedMsg,
      type: "BOOKING",
      isPinned: isApproved,
      metadata: {
        bookingId: id,
        trackingCode,
        date: booking.date,
        startTime: booking.startTime,
        ctaHref: isApproved && trackingCode ? `/booking/track/${trackingCode}` : "/mybooking",
        ctaLabel: isApproved ? "مشاهده جزئیات رزرو" : "مشاهده رزروها",
      },
      smsText: isApproved ? approvedSms : rejectedSms,
    }).catch(() => {});

    return res.status(200).json({ booking: updated });
  } catch (error) {
    console.error("updateBookingStatus error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

// ─── Public tracking endpoint ─────────────────────────────────────────────────

export const getBookingByTrackingCodeController = async (req, res) => {
  try {
    const { code } = req.params;

    const [row] = await db
      .select({
        id:           bookings.id,
        trackingCode: bookings.trackingCode,
        date:         bookings.date,
        startTime:    bookings.startTime,
        endTime:      bookings.endTime,
        durationHours: bookings.durationHours,
        totalPrice:   bookings.totalPrice,
        status:       bookings.status,
        notes:        bookings.notes,
        adminNote:    bookings.adminNote,
        createdAt:    bookings.createdAt,
        user: {
          name:  users.name,
        },
        court: {
          id:            courts.id,
          name:          courts.name,
          location:      courts.location,
          address:       courts.address,
          sportType:     courts.sportType,
          surfaceType:   courts.surfaceType,
          pricePerHour:  courts.pricePerHour,
          image:         courts.image,
          managerPhone:  courts.managerPhone,
        },
      })
      .from(bookings)
      .innerJoin(courts, eq(bookings.courtId, courts.id))
      .innerJoin(users,  eq(bookings.userId,  users.id))
      .where(eq(bookings.trackingCode, code.toUpperCase()))
      .limit(1);

    if (!row) return res.status(404).json({ message: "رزروی با این کد یافت نشد" });

    if (isPendingBookingExpiredByTime(row)) {
      await db
        .update(bookings)
        .set({
          status: "rejected",
          adminNote: BOOKING_TIME_PASSED_NOTE,
          updatedAt: new Date(),
        })
        .where(eq(bookings.id, row.id));

      row.status = "rejected";
      row.adminNote = BOOKING_TIME_PASSED_NOTE;
    }

    return res.status(200).json({ booking: row });
  } catch (error) {
    console.error("getBookingByTrackingCode error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};
