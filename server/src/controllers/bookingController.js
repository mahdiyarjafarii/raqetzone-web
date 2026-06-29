import { eq, and, or, ne, desc, count, inArray } from "drizzle-orm";
import { ZarinPal } from "zarinpal-node-sdk";
import { db } from "../db/index.js";
import { bookings, courts, clubs, users, discountCodes, discountCodeUsages, slotOverrides, deals, clubAssets, bookingAssets, walletTransactions, transactions } from "../db/schema.js";
import { config } from "../config/env.js";
import { sendNotification } from "../utils/sendNotification.js";
import { sendSMS } from "../utils/sms.js";
import { formatBookingDateTimeFa } from "../utils/bookingTime.js";
import { payBookingWithWallet } from "./walletController.js";

const WELCOME_DISCOUNT_CODE = "WELCOME20";
const PLATFORM_PUBLIC_DISCOUNT_CODES = new Set([WELCOME_DISCOUNT_CODE]);
const TEHRAN_OFFSET = "+03:30";
const TEHRAN_TIME_ZONE = "Asia/Tehran";
const BOOKING_TIME_PASSED_NOTE = "تایم زمین گذشته";
const ONLINE_PAYMENT_FAILED_NOTE = "پرداخت آنلاین ناموفق بود";

const zarinpal = config.zarinpalMerchantId
  ? new ZarinPal({
      merchantId: config.zarinpalMerchantId,
      sandbox: config.zarinpalSandbox,
    })
  : null;

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

function getServerBaseUrl(req) {
  if (config.publicServerUrl) return config.publicServerUrl.replace(/\/api\/?$/, "").replace(/\/$/, "");
  const host = req.get("x-forwarded-host") || req.get("host");
  const proto = req.get("x-forwarded-proto") || req.protocol;
  return `${proto}://${host}`.replace(/\/$/, "");
}

function getFrontendBaseUrl() {
  return (config.frontendUrl || "http://localhost:5173").replace(/\/$/, "");
}

function getBookingPaymentMethod(paymentMethod, totalPrice) {
  if (totalPrice <= 0) return "none";
  if (paymentMethod === "wallet") return "wallet";
  if (paymentMethod === "online") return "online";
  return "none";
}

function extractZarinpalAuthority(response) {
  return response?.data?.authority || response?.authority || null;
}

function getZarinpalRedirectUrl(authority) {
  if (!authority) return null;
  try {
    return zarinpal?.payments?.getRedirectUrl(authority);
  } catch {
    const host = config.zarinpalSandbox ? "sandbox.zarinpal.com" : "www.zarinpal.com";
    return `https://${host}/pg/StartPay/${authority}`;
  }
}

function isZarinpalVerifySuccess(verifyResponse) {
  const code = Number(
    verifyResponse?.data?.code ?? verifyResponse?.code ?? verifyResponse?.status ?? 0
  );
  return code === 100 || code === 101;
}

function getBookingPaymentReturnUrl(status, trackingCode) {
  if (status === "success" && trackingCode) {
    const search = new URLSearchParams({ tracking: trackingCode });
    return `${getFrontendBaseUrl()}/booking/success?${search.toString()}`;
  }
  const search = new URLSearchParams({ payment: status });
  if (trackingCode) search.set("tracking", trackingCode);
  return `${getFrontendBaseUrl()}/mybooking?${search.toString()}`;
}

function parseBookingEndDateTime(date, endTime, startTime) {
  if (!date || !endTime) return null;
  // If endTime is "00:00" (midnight) and we have a start time, the session crosses into the next day
  let effectiveDate = date;
  if (endTime === "00:00" && startTime && startTime > "00:00") {
    const d = new Date(`${date}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 1);
    effectiveDate = d.toISOString().slice(0, 10);
  }
  const parsed = new Date(`${effectiveDate}T${endTime}:00${TEHRAN_OFFSET}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isPendingBookingExpiredByTime(booking, now = new Date()) {
  if (!booking || booking.status !== "pending") return false;
  const endDateTime = parseBookingEndDateTime(booking.date, booking.endTime, booking.startTime);
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
    const { courtId, date, startTime, endTime, notes, discountCode, paymentMethod = "none", assets = [] } = req.body;
    console.log("[CreateBooking] request body:", {
      userId,
      courtId,
      date,
      startTime,
      endTime,
      notes,
      discountCode,
      paymentMethod,
      assetsCount: assets.length,
    });

    if (!courtId || !date || !startTime || !endTime) {
      return res.status(400).json({ message: "اطلاعات ناقص است" });
    }

    if (!["none", "wallet", "online"].includes(paymentMethod)) {
      return res.status(400).json({ message: "روش پرداخت نامعتبر است" });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ message: "فرمت تاریخ نامعتبر است (YYYY-MM-DD)" });
    }

    const startMin = timeToMinutes(startTime);
    let endMin = timeToMinutes(endTime);
    // "00:00" means midnight (end of day); treat as 1440 when after a start time
    if (endMin <= startMin) endMin += 1440;
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
        startTime: bookings.startTime,
        endTime: bookings.endTime,
        paymentMethod: bookings.paymentMethod,
        paymentStatus: bookings.paymentStatus,
      })
      .from(bookings)
      .where(and(
        eq(bookings.userId, userId),
        eq(bookings.date, date),
      ));

    const expiredSameDayIds = await expirePendingBookings(sameDayUserBookings);
    const hasOverlappingUserBooking = sameDayUserBookings.some((booking) => {
      if (expiredSameDayIds.includes(booking.id)) return false;
      if (booking.status === "rejected" || booking.status === "cancelled") return false;
      // Allow user to retry their own unpaid online booking
      if (booking.paymentMethod === "online" && booking.paymentStatus === "unpaid") return false;
      const bookingStartMin = timeToMinutes(booking.startTime);
      let bookingEndMin = timeToMinutes(booking.endTime);
      if (bookingEndMin <= bookingStartMin) bookingEndMin += 1440;
      return startMin < bookingEndMin && endMin > bookingStartMin;
    });

    if (hasOverlappingUserBooking) {
      return res.status(409).json({ message: "شما در این بازه زمانی قبلاً رزرو ثبت کرده‌اید" });
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

    const unpaidExpiryMs = 10 * 60 * 1000;
    const hasOverlap = existing.some((b) => {
      if (b.status === "rejected" || b.status === "cancelled") return false;
      if (b.paymentMethod === "online" && b.paymentStatus === "unpaid") {
        // same user retrying → always allow
        if (b.userId === userId) return false;
        // other users → block only within 10 min window
        const age = Date.now() - new Date(b.createdAt).getTime();
        if (age > unpaidExpiryMs) return false;
      }
      const bStart = timeToMinutes(b.startTime);
      let bEnd = timeToMinutes(b.endTime);
      if (bEnd <= bStart) bEnd += 1440;
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

    // Validate and snapshot assets
    let resolvedAssets = [];
    let assetsTotal = 0;
    if (Array.isArray(assets) && assets.length > 0) {
      const assetIds = assets.map((a) => a.assetId).filter(Boolean);
      const assetRows = assetIds.length > 0
        ? await db.select().from(clubAssets).where(and(inArray(clubAssets.id, assetIds), eq(clubAssets.clubId, court.clubId), eq(clubAssets.isActive, true)))
        : [];

      for (const item of assets) {
        if (!item.assetId || !item.quantity || item.quantity <= 0) continue;
        const row = assetRows.find((r) => r.id === item.assetId);
        if (!row) return res.status(400).json({ message: `تجهیز با شناسه ${item.assetId} یافت نشد` });
        const qty = Math.floor(item.quantity);
        const unitPrice = row.pricePerUnit;
        const totalPriceForAsset = qty * unitPrice;
        assetsTotal += totalPriceForAsset;
        resolvedAssets.push({ assetId: row.id, quantity: qty, unitPrice, totalPrice: totalPriceForAsset });
      }
    }

    const totalPrice = Math.max(0, priceAfterSlot - discountAmount) + assetsTotal;
    const resolvedPaymentMethod = getBookingPaymentMethod(paymentMethod, totalPrice);
    const trackingCode = generateTrackingCode();

    let onlinePayment = null;
    if (resolvedPaymentMethod === "online") {
      if (!zarinpal) {
        return res.status(500).json({ message: "تنظیمات درگاه پرداخت کامل نیست" });
      }

      const callbackBaseUrl = getServerBaseUrl(req);
      const callbackUrl = `${callbackBaseUrl}/api/bookings/payment/callback?tracking=${encodeURIComponent(trackingCode)}`;
      console.log(callbackUrl)

      const paymentResponse = await zarinpal.payments.create({
        amount: totalPrice,
        currency: "IRT",
        callback_url: callbackUrl,
        description: `رزرو زمین ${court.name} - ${date} ${startTime}-${endTime}`,
      });
      console.log(paymentResponse)


      const authority = extractZarinpalAuthority(paymentResponse);
      const paymentUrl = getZarinpalRedirectUrl(authority);
      if (!authority || !paymentUrl) {
        return res.status(502).json({ message: "پاسخ درگاه پرداخت نامعتبر است" });
      }

      onlinePayment = { authority, paymentUrl, rawResponse: paymentResponse };
    }

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
      paymentMethod: resolvedPaymentMethod,
      paymentStatus: totalPrice === 0 ? "paid" : "unpaid",
      discountAmount,
      discountCodeId: discountCodeRow?.id ?? null,
    });

    const { booking, walletPayment } = await db.transaction(async (tx) => {
      // Cancel any previous unpaid online bookings by same user for this slot
      const prevUnpaid = sameDayUserBookings.filter(
        (b) => b.paymentMethod === "online" && b.paymentStatus === "unpaid" &&
               b.status !== "cancelled" && b.status !== "rejected"
      );
      if (prevUnpaid.length > 0) {
        await tx
          .update(bookings)
          .set({ status: "cancelled", adminNote: "رزرو مجدد توسط کاربر", updatedAt: new Date() })
          .where(inArray(bookings.id, prevUnpaid.map((b) => b.id)));
        await tx
          .update(transactions)
          .set({ status: "failed" })
          .where(and(inArray(transactions.bookingId, prevUnpaid.map((b) => b.id)), eq(transactions.status, "pending")));
      }

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
          paymentMethod: resolvedPaymentMethod,
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

      if (resolvedAssets.length > 0) {
        await tx.insert(bookingAssets).values(
          resolvedAssets.map((a) => ({ ...a, bookingId: createdBooking.id }))
        );
      }

      if (resolvedPaymentMethod === "online" && totalPrice > 0 && onlinePayment?.authority) {
        await tx.insert(walletTransactions).values({
          userId,
          amount: totalPrice,
          direction: "debit",
          type: "booking_online_payment",
          status: "pending",
          referenceType: "booking",
          referenceId: createdBooking.id,
          gatewayTrackCode: onlinePayment.authority,
          metadata: {
            gateway: "zarinpal",
            paymentUrl: onlinePayment.paymentUrl,
            paymentInitResponse: onlinePayment.rawResponse,
          },
        });

        await tx.insert(transactions).values({
          userId,
          amount: totalPrice,
          type: "booking",
          bookingId: createdBooking.id,
          status: "pending",
          authority: onlinePayment.authority,
        });
      }

      let paidByWallet = null;
      if (resolvedPaymentMethod === "wallet" && totalPrice > 0) {
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

    // For online payment, defer notifications until callback confirms payment
    if (resolvedPaymentMethod !== "online") {
      sendNotification(userId, {
        title: "درخواست رزرو ثبت شد ⏳",
        message: `رزرو ${courtFullName} برای ${bookingDateTime} ثبت شد. منتظر تأیید مدیر باشید.`,
        type: "BOOKING",
        metadata: { bookingId: booking.id, courtName: court.name, date, startTime, endTime, ctaHref: "/mybooking", ctaLabel: "مشاهده رزرو" },
        smsText: `پلتفرم رکت‌زون: درخواست رزرو ${courtFullName} برای ${bookingDateTime} ثبت شد و در انتظار تأیید مدیر زمین است.`,
      }).catch(() => {});

      const recipientPhones = [...new Set(
        [court.managerPhone, court.clubPhone, court.clubOwnerPhone].filter(Boolean)
      )];
      if (recipientPhones.length > 0) {
        const [requester] = await db.select({ name: users.name, phone: users.phone }).from(users).where(eq(users.id, userId)).limit(1);
        const requesterInfo = requester?.name ? `${requester.name} (${requester.phone})` : requester?.phone ?? "کاربر";
        const managerMsg = `پلتفرم رکت‌زون: درخواست رزرو جدید - ${courtFullName} - ${bookingDateTime} - رزرو کننده: ${requesterInfo} - لطفا از پنل تایید یا رد کنید.`;
        for (const phone of recipientPhones) {
          sendSMS(phone, managerMsg)
            .then(ok => console.log(`[SMS-Manager] ${phone}: ${ok}`))
            .catch(err => console.error(`[SMS-Manager] ${phone}:`, err.message));
        }
      }
    }

    const enriched = { ...booking, court, assets: resolvedAssets };
    return res.status(201).json({
      booking: enriched,
      wallet: walletPayment?.wallet,
      payment: onlinePayment
        ? {
            provider: "zarinpal",
            authority: onlinePayment.authority,
            redirectUrl: onlinePayment.paymentUrl,
          }
        : null,
    });
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

export const bookingPaymentCallbackController = async (req, res) => {
  const { Status, Authority, tracking } = req.query;
  const failedRedirectUrl = getBookingPaymentReturnUrl("failed", tracking);

  console.log("[Callback] query:", req.query);

  try {
    if (!tracking) return res.redirect(failedRedirectUrl);

    const [booking] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.trackingCode, String(tracking).toUpperCase()))
      .limit(1);

    if (!booking) return res.redirect(failedRedirectUrl);

    const [paymentTransaction] = await db
      .select()
      .from(walletTransactions)
      .where(
        and(
          eq(walletTransactions.referenceType, "booking"),
          eq(walletTransactions.referenceId, booking.id)
        )
      )
      .orderBy(desc(walletTransactions.createdAt))
      .limit(1);

    if (Status !== "OK" || !Authority || !zarinpal) {
      if (paymentTransaction) {
        await db
          .update(walletTransactions)
          .set({ status: "failed", callbackBody: req.query })
          .where(eq(walletTransactions.id, paymentTransaction.id));
      }

      await db
        .update(bookings)
        .set({ status: "cancelled", adminNote: ONLINE_PAYMENT_FAILED_NOTE, updatedAt: new Date() })
        .where(eq(bookings.id, booking.id));

      await db
        .update(transactions)
        .set({ status: "failed", callbackBody: req.query })
        .where(eq(transactions.bookingId, booking.id));

      return res.redirect(getBookingPaymentReturnUrl("failed", booking.trackingCode));
    }

    if (paymentTransaction?.gatewayTrackCode && paymentTransaction.gatewayTrackCode !== Authority) {
      await db
        .update(walletTransactions)
        .set({ status: "failed", callbackBody: req.query })
        .where(eq(walletTransactions.id, paymentTransaction.id));

      await db
        .update(bookings)
        .set({ status: "cancelled", adminNote: ONLINE_PAYMENT_FAILED_NOTE, updatedAt: new Date() })
        .where(eq(bookings.id, booking.id));

      await db
        .update(transactions)
        .set({ status: "failed", callbackBody: req.query })
        .where(eq(transactions.bookingId, booking.id));

      return res.redirect(getBookingPaymentReturnUrl("failed", booking.trackingCode));
    }

    const verifyResponse = await zarinpal.verifications.verify({
      authority: Authority,
      amount: booking.totalPrice,
      currency: "IRT",
    });

    console.log("[Callback] verifyResponse:", JSON.stringify(verifyResponse));

    if (!isZarinpalVerifySuccess(verifyResponse)) {
      if (paymentTransaction) {
        await db
          .update(walletTransactions)
          .set({ status: "failed", callbackBody: verifyResponse })
          .where(eq(walletTransactions.id, paymentTransaction.id));
      }

      await db
        .update(bookings)
        .set({ status: "cancelled", adminNote: ONLINE_PAYMENT_FAILED_NOTE, updatedAt: new Date() })
        .where(eq(bookings.id, booking.id));

      await db
        .update(transactions)
        .set({ status: "failed", callbackBody: verifyResponse })
        .where(and(eq(transactions.bookingId, booking.id), eq(transactions.authority, Authority)));

      return res.redirect(getBookingPaymentReturnUrl("failed", booking.trackingCode));
    }

    await db
      .update(bookings)
      .set({
        paymentMethod: "online",
        paymentStatus: "paid",
        adminNote: null,
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, booking.id));

    if (paymentTransaction) {
      await db
        .update(walletTransactions)
        .set({
          status: "completed",
          callbackBody: verifyResponse,
          gatewayTrackCode: Authority,
        })
        .where(eq(walletTransactions.id, paymentTransaction.id));
    }

    await db
      .update(transactions)
      .set({ status: "completed", callbackBody: verifyResponse })
      .where(and(eq(transactions.bookingId, booking.id), eq(transactions.authority, Authority)));

    // Notify user and managers now that payment is confirmed
    const [fullBooking] = await db
      .select({
        id: bookings.id, userId: bookings.userId, date: bookings.date,
        startTime: bookings.startTime, endTime: bookings.endTime,
        courtName: courts.name, clubName: clubs.name,
        managerPhone: courts.managerPhone, clubPhone: clubs.phone, clubOwnerPhone: users.phone,
      })
      .from(bookings)
      .leftJoin(courts, eq(bookings.courtId, courts.id))
      .leftJoin(clubs, eq(courts.clubId, clubs.id))
      .leftJoin(users, eq(clubs.ownerId, users.id))
      .where(eq(bookings.id, booking.id))
      .limit(1);

    if (fullBooking) {
      const courtFullName = fullBooking.clubName
        ? `زمین ${fullBooking.courtName} باشگاه ${fullBooking.clubName}`
        : `زمین ${fullBooking.courtName}`;
      const bookingDateTime = formatBookingDateTimeFa(fullBooking);

      sendNotification(fullBooking.userId, {
        title: "درخواست رزرو ثبت شد ⏳",
        message: `رزرو ${courtFullName} برای ${bookingDateTime} ثبت شد. منتظر تأیید مدیر باشید.`,
        type: "BOOKING",
        metadata: { bookingId: fullBooking.id, courtName: fullBooking.courtName, date: fullBooking.date, startTime: fullBooking.startTime, endTime: fullBooking.endTime, ctaHref: "/mybooking", ctaLabel: "مشاهده رزرو" },
        smsText: `پلتفرم رکت‌زون: درخواست رزرو ${courtFullName} برای ${bookingDateTime} ثبت شد و در انتظار تأیید مدیر زمین است.`,
      }).catch(() => {});

      const recipientPhones = [...new Set(
        [fullBooking.managerPhone, fullBooking.clubPhone, fullBooking.clubOwnerPhone].filter(Boolean)
      )];
      if (recipientPhones.length > 0) {
        const [requester] = await db.select({ name: users.name, phone: users.phone }).from(users).where(eq(users.id, fullBooking.userId)).limit(1);
        const requesterInfo = requester?.name ? `${requester.name} (${requester.phone})` : requester?.phone ?? "کاربر";
        const managerMsg = `پلتفرم رکت‌زون: درخواست رزرو جدید - ${courtFullName} - ${bookingDateTime} - رزرو کننده: ${requesterInfo} - لطفا از پنل تایید یا رد کنید.`;
        for (const phone of recipientPhones) {
          sendSMS(phone, managerMsg).catch(() => {});
        }
      }
    }

    return res.redirect(getBookingPaymentReturnUrl("success", booking.trackingCode));
  } catch (error) {
    console.error("bookingPaymentCallback error:", error);
    return res.redirect(failedRedirectUrl);
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
        basePrice: bookings.basePrice,
        slotDiscountPercent: bookings.slotDiscountPercent,
        discountCode: bookings.discountCode,
        discountAmount: bookings.discountAmount,
        status: bookings.status,
        notes: bookings.notes,
        adminNote: bookings.adminNote,
        trackingCode: bookings.trackingCode,
        paymentMethod: bookings.paymentMethod,
        paymentStatus: bookings.paymentStatus,
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
      .where(and(
        eq(bookings.userId, userId),
        or(ne(bookings.paymentMethod, "online"), ne(bookings.paymentStatus, "unpaid"))
      ))
      .orderBy(desc(bookings.createdAt));

    // Attach bookingAssets to each booking
    const bookingIds = rows.map((r) => r.id);
    let assetsByBookingId = {};
    if (bookingIds.length > 0) {
      const assetRows = await db
        .select({
          bookingId: bookingAssets.bookingId,
          assetId: bookingAssets.assetId,
          quantity: bookingAssets.quantity,
          unitPrice: bookingAssets.unitPrice,
          totalPrice: bookingAssets.totalPrice,
          name: clubAssets.name,
        })
        .from(bookingAssets)
        .innerJoin(clubAssets, eq(bookingAssets.assetId, clubAssets.id))
        .where(inArray(bookingAssets.bookingId, bookingIds));

      for (const ar of assetRows) {
        if (!assetsByBookingId[ar.bookingId]) assetsByBookingId[ar.bookingId] = [];
        assetsByBookingId[ar.bookingId].push(ar);
      }
    }

    const enrichedRows = rows.map((r) => ({ ...r, assets: assetsByBookingId[r.id] ?? [] }));
    return res.status(200).json({ bookings: enrichedRows });
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

    const assetRows = await db
      .select({
        assetId: bookingAssets.assetId,
        quantity: bookingAssets.quantity,
        unitPrice: bookingAssets.unitPrice,
        totalPrice: bookingAssets.totalPrice,
        name: clubAssets.name,
      })
      .from(bookingAssets)
      .innerJoin(clubAssets, eq(bookingAssets.assetId, clubAssets.id))
      .where(eq(bookingAssets.bookingId, row.id));

    return res.status(200).json({ booking: { ...row, assets: assetRows } });
  } catch (error) {
    console.error("getBookingByTrackingCode error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};
