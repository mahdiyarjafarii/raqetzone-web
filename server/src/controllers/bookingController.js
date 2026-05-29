import { eq, and, desc, count } from "drizzle-orm";
import { db } from "../db/index.js";
import { bookings, courts, clubs, users, discountCodes, discountCodeUsages } from "../db/schema.js";
import { sendNotification } from "../utils/sendNotification.js";
import { sendSMS } from "../utils/sms.js";

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

// ─── User endpoints ───────────────────────────────────────────────────────────

export const createBookingController = async (req, res) => {
  try {
    const userId = req.user.id;
    const { courtId, date, startTime, endTime, notes, discountCode } = req.body;

    if (!courtId || !date || !startTime || !endTime) {
      return res.status(400).json({ message: "اطلاعات ناقص است" });
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
    const today = new Date().toISOString().split("T")[0];
    if (date < today) {
      return res.status(400).json({ message: "نمی‌توان برای تاریخ گذشته رزرو کرد" });
    }

    const [court] = await db
      .select({ id: courts.id, name: courts.name, location: courts.location, address: courts.address,
                surfaceType: courts.surfaceType, sportType: courts.sportType, pricePerHour: courts.pricePerHour,
                image: courts.image, managerPhone: courts.managerPhone, openTime: courts.openTime,
                closeTime: courts.closeTime, slotDuration: courts.slotDuration, isActive: courts.isActive,
                clubName: clubs.name })
      .from(courts)
      .leftJoin(clubs, eq(courts.clubId, clubs.id))
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
    const basePrice = Math.round(court.pricePerHour * durationHours);

    // Apply discount code if provided
    let discountCodeRow = null;
    let discountAmount = 0;
    if (discountCode) {
      [discountCodeRow] = await db
        .select()
        .from(discountCodes)
        .where(and(eq(discountCodes.code, discountCode.toUpperCase().trim()), eq(discountCodes.isActive, true)))
        .limit(1);

      if (discountCodeRow) {
        const now = new Date();
        const expired = discountCodeRow.expiresAt && now > new Date(discountCodeRow.expiresAt);
        const maxedOut = discountCodeRow.maxUses !== null && discountCodeRow.usedCount >= discountCodeRow.maxUses;
        const belowMin = discountCodeRow.minBookingPrice && basePrice < discountCodeRow.minBookingPrice;

        if (!expired && !maxedOut && !belowMin) {
          const [userUsageCount] = await db
            .select({ cnt: count() })
            .from(discountCodeUsages)
            .where(and(eq(discountCodeUsages.discountCodeId, discountCodeRow.id), eq(discountCodeUsages.userId, userId)));

          if ((userUsageCount?.cnt ?? 0) < discountCodeRow.perUserLimit) {
            discountAmount = discountCodeRow.discountType === "percent"
              ? Math.round(basePrice * discountCodeRow.discountValue / 100)
              : Math.min(discountCodeRow.discountValue, basePrice);
          }
        }
      }
    }

    const totalPrice = Math.max(0, basePrice - discountAmount);
    const trackingCode = generateTrackingCode();

    const [booking] = await db
      .insert(bookings)
      .values({ userId, courtId, date, startTime, endTime, durationHours, totalPrice, notes, trackingCode })
      .returning();

    // Record discount usage
    if (discountCodeRow && discountAmount > 0) {
      await db.insert(discountCodeUsages).values({
        discountCodeId: discountCodeRow.id,
        userId,
        bookingId: booking.id,
        discountAmount,
      });
      await db.update(discountCodes)
        .set({ usedCount: discountCodeRow.usedCount + 1, updatedAt: new Date() })
        .where(eq(discountCodes.id, discountCodeRow.id));
    }

    const courtFullName = court.clubName ? `زمین ${court.name} باشگاه ${court.clubName}` : `زمین ${court.name}`;

    // Notify user of pending booking
    sendNotification(userId, {
      title: "درخواست رزرو ثبت شد ⏳",
      message: `رزرو ${courtFullName} برای ${date} ساعت ${startTime} ثبت شد. منتظر تأیید مدیر باشید.`,
      type: "BOOKING",
      metadata: { bookingId: booking.id, courtName: court.name, date, startTime, endTime, ctaHref: "/mybooking", ctaLabel: "مشاهده رزرو" },
      smsText: `پلتفرم رکت‌زون: درخواست رزرو ${courtFullName} برای ${date} ساعت ${startTime} ثبت شد و در انتظار تأیید مدیر زمین است.`,
    }).catch(() => {});

    // Notify court manager
    if (court.managerPhone) {
      const [requester] = await db.select({ name: users.name, phone: users.phone }).from(users).where(eq(users.id, userId)).limit(1);
      const requesterInfo = requester?.name ? `${requester.name} (${requester.phone})` : requester?.phone ?? "کاربر";
      const managerMsg = `پلتفرم رکت‌زون: درخواست رزرو جدید - ${courtFullName} - تاریخ ${date} ساعت ${startTime} تا ${endTime} - رزرو کننده: ${requesterInfo} - لطفا از پنل تایید یا رد کنید.`;
      console.log(`[SMS-Manager] → ${court.managerPhone}`);
      sendSMS(court.managerPhone, managerMsg)
        .then(ok => console.log(`[SMS-Manager] result: ${ok}`))
        .catch(err => console.error("[SMS-Manager] error:", err.message));
    } else {
      console.log(`[SMS-Manager] skipped — no managerPhone for court ${court.id}`);
    }

    const enriched = { ...booking, court };
    return res.status(201).json({ booking: enriched });
  } catch (error) {
    console.error("createBooking error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

export const getMyBookingsController = async (req, res) => {
  try {
    const userId = req.user.id;

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

    const [updated] = await db
      .update(bookings)
      .set({ status, adminNote: adminNote || null, updatedAt: new Date() })
      .where(eq(bookings.id, id))
      .returning();

    // Notify the booking owner
    const isApproved = status === "approved";
    const approvedMsg = `رزرو زمین برای ${booking.date} ساعت ${booking.startTime} تأیید شد. کد پیگیری: ${booking.trackingCode}`;
    const rejectedMsg = `متأسفانه رزرو شما برای ${booking.date} ساعت ${booking.startTime} رد شد.${adminNote ? ` دلیل: ${adminNote}` : ""}`;

    const frontendUrl = process.env.FRONTEND_URL ?? "https://raqetzone.ir";
    const trackingCode = booking.trackingCode;

    const approvedSms = trackingCode
      ? `رکت‌زون: رزرو شما تایید شد. کد پیگیری: ${trackingCode}`
      : `رکت‌زون: رزرو شما برای ${booking.date} ساعت ${booking.startTime} تایید شد.`;

    const rejectedSms = `رکت‌زون: رزرو شما برای ${booking.date} ساعت ${booking.startTime} رد شد.${adminNote ? ` دلیل: ${adminNote}` : ""}`;

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

    return res.status(200).json({ booking: row });
  } catch (error) {
    console.error("getBookingByTrackingCode error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};
