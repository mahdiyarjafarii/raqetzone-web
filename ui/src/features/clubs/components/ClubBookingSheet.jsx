import "react-spring-bottom-sheet/dist/style.css";

import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { BottomSheet } from "react-spring-bottom-sheet";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRightIcon, CalendarIcon, ClockIcon, BanknoteIcon, CheckCircle2Icon, ClipboardListIcon, TicketIcon, XCircleIcon, CheckCircleIcon, LoaderIcon } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { bookingService } from "@/features/booking/services/bookingService";

// ── helpers ───────────────────────────────────────────────────────────────────

const SPORT_ICONS = { padel: "🏓", tennis: "🎾", squash: "🟡", badminton: "🏸" };
const SURFACE_LABEL = { artificial: "چمن مصنوعی", clay: "خاک رس", hard: "سخت", grass: "چمن طبیعی" };
const SURFACE_COLOR = {
  artificial: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  clay: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  hard: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  grass: "bg-green-500/10 text-green-700 dark:text-green-400",
};

function formatPrice(p) {
  return new Intl.NumberFormat("fa-IR").format(p);
}

function formatDateFa(dateStr) {
  return new Date(dateStr).toLocaleDateString("fa-IR", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}

function addDays(dateStr, n) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

const WEEKDAY_FA = ["یک", "دو", "سه", "چهار", "پنج", "جمعه", "شنبه"];
function formatDayShort(dateStr) {
  const d = new Date(dateStr);
  return { dayNum: d.getDate().toLocaleString("fa-IR"), dayName: WEEKDAY_FA[d.getDay()] };
}

// ── Court Selector ────────────────────────────────────────────────────────────

function CourtSelector({ courts, onSelect }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground mb-4">کدام زمین را می‌خواهید رزرو کنید؟</p>
      {courts.map((court, i) => (
        <motion.button
          key={court.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.07 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelect(court)}
          className="w-full text-right"
        >
          <div className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3 active:bg-muted transition-colors">
            <div className="h-11 w-11 rounded-xl bg-muted flex items-center justify-center text-2xl shrink-0">
              {SPORT_ICONS[court.sportType] ?? "🏅"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-foreground text-sm">{court.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                {court.surfaceType && (
                  <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", SURFACE_COLOR[court.surfaceType] ?? "bg-muted text-muted-foreground")}>
                    {SURFACE_LABEL[court.surfaceType] ?? court.surfaceType}
                  </span>
                )}
                <span className="text-muted-foreground text-xs">{court.openTime}–{court.closeTime}</span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-primary font-black text-sm">{formatPrice(court.pricePerHour)}</p>
              <p className="text-muted-foreground text-[10px]">ت/ساعت</p>
            </div>
          </div>
        </motion.button>
      ))}
    </div>
  );
}

// ── Combined Date + Slots Step ────────────────────────────────────────────────

function DateSlotsStep({ court, selectedDate, onDateChange, slots, slotsLoading, selectedSlot, onSelectSlot }) {
  const today = new Date().toISOString().split("T")[0];
  const dates = Array.from({ length: 7 }, (_, i) => addDays(today, i));

  return (
    <div className="space-y-4">
      {/* Court chip */}
      <div className="flex items-center gap-3 bg-muted/60 rounded-xl p-3">
        <span className="text-2xl">{SPORT_ICONS[court.sportType] ?? "🏅"}</span>
        <div>
          <p className="font-bold text-sm text-foreground">{court.name}</p>
          <p className="text-xs text-muted-foreground">{formatPrice(court.pricePerHour)} ت/ساعت</p>
        </div>
      </div>

      {/* Date strip */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {dates.map((date) => {
          const { dayNum, dayName } = formatDayShort(date);
          const isSelected = date === selectedDate;
          const isToday = date === today;
          return (
            <motion.button
              key={date}
              whileTap={{ scale: 0.93 }}
              onClick={() => onDateChange(date)}
              className={cn(
                "flex flex-col items-center justify-center shrink-0 w-14 rounded-2xl border transition-all text-xs font-medium py-3",
                isSelected
                  ? "bg-primary text-primary-foreground border-primary shadow-lg"
                  : "bg-card text-foreground border-border"
              )}
            >
              <span className={cn("text-[10px]", isSelected ? "text-primary-foreground/70" : "text-muted-foreground")}>
                {dayName}
              </span>
              <span className="text-lg font-black leading-tight mt-0.5">{dayNum}</span>
              {isToday && (
                <span className={cn("text-[9px] font-semibold mt-0.5", isSelected ? "text-primary-foreground/70" : "text-primary")}>
                  امروز
                </span>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Slots */}
      <div>
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-primary inline-block" /> موجود
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-orange-400 inline-block" /> رزرو شده
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-yellow-400 inline-block" /> در بررسی
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-muted-foreground/30 inline-block" /> بسته
          </span>
        </div>

        {slotsLoading ? (
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="h-16 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : !slots || slots.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <span className="text-3xl block mb-2">📅</span>
            هیچ اسلاتی برای این روز موجود نیست
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {slots.map((slot, i) => {
              const isSelected = selectedSlot?.start === slot.start;
              const isBooked = slot.isBooked;
              const isBlocked = slot.isBlocked;
              const isManualBooked = slot.isManualBooked;
              const isPending = slot.isPending;
              const hasDiscount = slot.discount > 0 && slot.originalPrice;
              const unavailable = isBooked || isPending;

              let label = `تا ${slot.end}`;
              if (isBlocked) label = "بسته";
              else if (isManualBooked || (isBooked && !isBlocked)) label = "رزرو شده";
              else if (isPending) label = "در بررسی";

              return (
                <motion.button
                  key={slot.start}
                  initial={{ opacity: 0, scale: 0.88 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.02 }}
                  whileTap={!unavailable ? { scale: 0.94 } : {}}
                  disabled={unavailable}
                  onClick={() => !unavailable && onSelectSlot(slot)}
                  className={cn(
                    "flex flex-col items-center justify-center h-16 rounded-2xl border text-xs font-medium transition-all",
                    isBlocked
                      ? "bg-muted/40 border-border text-muted-foreground/40 cursor-not-allowed"
                      : isManualBooked || (isBooked && !isBlocked)
                      ? "bg-orange-500/10 border-orange-300 text-orange-500 cursor-not-allowed"
                      : isPending
                      ? "bg-yellow-500/10 border-yellow-400 text-yellow-600 cursor-not-allowed"
                      : isSelected
                      ? "bg-primary text-primary-foreground border-primary shadow-md"
                      : hasDiscount
                      ? "bg-emerald-500/10 border-emerald-400 text-foreground active:bg-muted"
                      : "bg-card border-border text-foreground active:bg-muted"
                  )}
                >
                  <span className="font-black text-sm">{slot.start}</span>
                  <span className={cn("text-[10px] mt-0.5", isSelected ? "text-primary-foreground/60" : "text-muted-foreground")}>
                    {label}
                  </span>
                  {!unavailable && slot.price && (
                    <span className={cn("text-[9px] font-semibold leading-none",
                      isSelected ? "text-primary-foreground/70" : hasDiscount ? "text-emerald-600" : "text-primary"
                    )}>
                      {hasDiscount && <span className="line-through opacity-50 mr-0.5">{formatPrice(slot.originalPrice)}</span>}
                      {formatPrice(slot.price)}ت
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Booking Summary ───────────────────────────────────────────────────────────

function BookingSummaryStep({ court, date, slot, clubId, onConfirm, onBack, submitting }) {
  const [notes, setNotes] = useState("");
  const [discountInput, setDiscountInput] = useState("");
  const [discountState, setDiscountState] = useState(null); // null | { valid, discountAmount, finalPrice, discountValue, discountType, discountCodeId, error }
  const [validating, setValidating] = useState(false);

  const startMin = slot.start.split(":").reduce((acc, v, i) => acc + (i === 0 ? +v * 60 : +v), 0);
  const endMin = slot.end.split(":").reduce((acc, v, i) => acc + (i === 0 ? +v * 60 : +v), 0);
  const durationHours = (endMin - startMin) / 60;
  const pricePerHour = slot.price ?? court.pricePerHour;
  const baseTotal = Math.round(pricePerHour * durationHours);
  const originalTotal = slot.originalPrice ? Math.round(slot.originalPrice * durationHours) : null;

  const voucherDiscount = discountState?.valid ? discountState.discountAmount : 0;
  const afterVoucher = Math.max(0, baseTotal - voucherDiscount);
  const tax = Math.round(afterVoucher * 0.09);
  const finalTotal = afterVoucher + tax;

  const handleValidate = async () => {
    const code = discountInput.trim().toUpperCase();
    if (!code) return;
    setValidating(true);
    setDiscountState(null);
    const res = await bookingService.validateDiscount(code, clubId, baseTotal);
    setValidating(false);
    if (res.ok) {
      setDiscountState({ valid: true, ...res.data, code });
      toast.success(`کد تخفیف اعمال شد — ${formatPrice(res.data.discountAmount)} تومان تخفیف`);
    } else {
      setDiscountState({ valid: false, error: res.data?.message ?? "کد معتبر نیست" });
    }
  };

  const handleRemoveDiscount = () => {
    setDiscountState(null);
    setDiscountInput("");
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/50 flex items-center gap-2">
          <span className="text-lg">{SPORT_ICONS[court.sportType] ?? "🏅"}</span>
          <div>
            <p className="text-xs text-muted-foreground">فاکتور رزرو</p>
            <p className="text-sm font-bold text-foreground">{court.name}</p>
          </div>
        </div>

        <div className="divide-y divide-border">
          {[
            { icon: <CalendarIcon className="w-4 h-4" />, label: "تاریخ", value: formatDateFa(date) },
            { icon: <ClockIcon className="w-4 h-4" />, label: "زمان", value: `${slot.start} – ${slot.end}` },
            { icon: <ClockIcon className="w-4 h-4" />, label: "مدت", value: `${durationHours} ساعت` },
            originalTotal ? { icon: <BanknoteIcon className="w-4 h-4" />, label: "قیمت اصلی", value: formatPrice(originalTotal) + " ت", strike: true } : null,
            originalTotal ? { icon: <BanknoteIcon className="w-4 h-4" />, label: `تخفیف اسلات (${slot.discount}٪)`, value: `- ${formatPrice(originalTotal - baseTotal)} ت`, discount: true } : null,
            { icon: <BanknoteIcon className="w-4 h-4" />, label: "اجاره", value: `${formatPrice(baseTotal)} ت` },
            voucherDiscount > 0 ? {
              icon: <TicketIcon className="w-4 h-4" />,
              label: `کد تخفیف (${discountState.code})`,
              value: `- ${formatPrice(voucherDiscount)} ت`,
              discount: true,
            } : null,
            { icon: <BanknoteIcon className="w-4 h-4" />, label: "مالیات (۹٪)", value: `${formatPrice(tax)} ت` },
          ].filter(Boolean).map((row, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3 gap-3">
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                {row.icon}
                <span>{row.label}</span>
              </div>
              <span className={cn("text-sm font-medium",
                row.strike ? "text-muted-foreground line-through" : row.discount ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
              )}>{row.value}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between px-4 py-4 bg-primary/5 border-t-2 border-primary/20">
          <span className="text-primary font-bold text-sm">مبلغ نهایی</span>
          <div className="text-right">
            {voucherDiscount > 0 && (
              <p className="text-xs text-muted-foreground line-through leading-none mb-0.5">
                {formatPrice(Math.round(baseTotal * 1.09))} ت
              </p>
            )}
            <span className="text-primary font-black text-xl">
              {formatPrice(finalTotal)} <span className="text-sm font-medium">تومان</span>
            </span>
          </div>
        </div>
      </div>

      {/* Discount code input */}
      {discountState?.valid ? (
        <div className="flex items-center gap-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 px-4 py-3">
          <CheckCircleIcon className="w-5 h-5 text-emerald-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
              کد <span className="font-mono tracking-wider">{discountState.code}</span> اعمال شد
            </p>
            <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-0.5">
              {discountState.discountType === "percent"
                ? `${discountState.discountValue}٪`
                : `${formatPrice(discountState.discountValue)} تومان`} تخفیف — صرفه‌جویی {formatPrice(voucherDiscount)} تومان
            </p>
          </div>
          <button onClick={handleRemoveDiscount} className="p-1 rounded-lg text-emerald-600/60 hover:text-red-500 transition-colors">
            <XCircleIcon className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
            <TicketIcon className="w-3.5 h-3.5" />
            کد تخفیف دارید؟
          </label>
          <div className="flex gap-2">
            <input
              value={discountInput}
              onChange={(e) => {
                setDiscountInput(e.target.value.toUpperCase());
                if (discountState?.valid === false) setDiscountState(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && handleValidate()}
              placeholder="کد تخفیف را وارد کنید"
              className={cn(
                "flex-1 h-11 rounded-xl border bg-background px-3 text-sm font-mono tracking-widest text-foreground placeholder:font-sans placeholder:tracking-normal focus:outline-none focus:ring-2 transition-colors",
                discountState?.valid === false
                  ? "border-red-400 focus:ring-red-400/30"
                  : "border-input focus:ring-ring/30"
              )}
            />
            <button
              type="button"
              onClick={handleValidate}
              disabled={!discountInput.trim() || validating}
              className="h-11 px-4 rounded-xl bg-primary/10 text-primary text-sm font-bold hover:bg-primary/20 disabled:opacity-40 transition-colors flex items-center gap-1.5"
            >
              {validating
                ? <LoaderIcon className="w-4 h-4 animate-spin" />
                : "اعمال"}
            </button>
          </div>
          {discountState?.valid === false && (
            <p className="text-xs text-red-500 flex items-center gap-1">
              <XCircleIcon className="w-3.5 h-3.5 shrink-0" />
              {discountState.error}
            </p>
          )}
        </div>
      )}

      <div>
        <label className="text-xs text-muted-foreground mb-2 block">یادداشت (اختیاری)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="توضیحات اضافه..."
          className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring transition-colors resize-none"
        />
      </div>

      <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-2.5 text-amber-700 dark:text-amber-400 text-xs leading-relaxed">
        ⏳ پس از ارسال درخواست، مدیر مجموعه تأیید می‌کند.
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} disabled={submitting} className="rounded-xl">
          بازگشت
        </Button>
        <Button
          onClick={() => onConfirm(notes, discountState?.valid ? discountState.code : undefined)}
          disabled={submitting}
          className="flex-1 rounded-xl font-bold text-sm h-12"
        >
          {submitting ? "در حال ثبت..." : "تأیید و ثبت رزرو"}
        </Button>
      </div>
    </div>
  );
}

// ── Success ───────────────────────────────────────────────────────────────────

function SuccessStep({ booking, onClose, onViewBookings }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center text-center py-6 gap-4"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", delay: 0.15 }}
        className="h-20 w-20 rounded-full bg-emerald-500/15 flex items-center justify-center"
      >
        <CheckCircle2Icon className="w-10 h-10 text-emerald-500" />
      </motion.div>

      <div>
        <h3 className="text-xl font-black text-foreground mb-1">رزرو ثبت شد! 🎉</h3>
        <p className="text-sm text-muted-foreground">درخواست شما ارسال شد و منتظر تأیید مدیر است.</p>
      </div>

      {booking && (
        <div className="w-full rounded-2xl bg-muted/50 border border-border p-4 text-sm space-y-2.5">
          <div className="flex justify-between">
            <span className="text-muted-foreground">زمین</span>
            <span className="font-semibold text-foreground">{booking.court?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">تاریخ</span>
            <span className="font-semibold text-foreground">{formatDateFa(booking.date)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">زمان</span>
            <span className="font-semibold text-foreground">{booking.startTime} – {booking.endTime}</span>
          </div>
          <div className="flex justify-between pt-2 border-t border-border">
            <span className="text-muted-foreground">وضعیت</span>
            <span className="text-amber-600 dark:text-amber-400 font-semibold text-xs bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
              در انتظار تأیید
            </span>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2.5 w-full">
        <Button onClick={onViewBookings} className="w-full rounded-xl h-12 font-bold">
          <ClipboardListIcon className="w-4 h-4 ml-2" />
          مشاهده رزروهای من
        </Button>
        <Button variant="outline" onClick={onClose} className="w-full rounded-xl h-11 text-sm">
          بازگشت به مجموعه
        </Button>
      </div>
    </motion.div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

const STEP_TITLES = {
  court:   "انتخاب زمین",
  booking: "انتخاب تاریخ و زمان",
  summary: "تأیید رزرو",
  success: "رزرو ثبت شد",
};

export default function ClubBookingSheet({ open, onClose, club, initialCourt = null }) {
  const navigate = useNavigate();
  const today = new Date().toISOString().split("T")[0];

  const courts = club?.courts ?? [];

  const [step, setStep] = useState("court");
  const [selectedCourt, setSelectedCourt] = useState(null);
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createdBooking, setCreatedBooking] = useState(null);

  const goToBooking = useCallback((court) => {
    setSelectedCourt(court);
    setStep("booking");
  }, []);

  const reset = useCallback(() => {
    setSelectedDate(today);
    setSelectedSlot(null);
    setSlots([]);
    setCreatedBooking(null);
    if (initialCourt) {
      setSelectedCourt(initialCourt);
      setStep("booking");
    } else if (courts.length === 1) {
      setSelectedCourt(courts[0]);
      setStep("booking");
    } else {
      setSelectedCourt(null);
      setStep("court");
    }
  }, [courts, initialCourt, today]);

  // Init on open
  useEffect(() => {
    if (!open) return;
    const court = initialCourt ?? (courts.length === 1 ? courts[0] : null);
    setSelectedSlot(null);
    setCreatedBooking(null);
    setSelectedDate(today);
    if (court) {
      setSelectedCourt(court);
      setStep("booking");
    } else {
      setSelectedCourt(null);
      setStep("court");
    }
  }, [open]);

  // Fetch slots whenever court or date changes (in booking step)
  useEffect(() => {
    if (step !== "booking" || !selectedCourt) return;
    setSlotsLoading(true);
    setSelectedSlot(null);
    bookingService.getAvailability(selectedCourt.id, selectedDate)
      .then((res) => {
        setSlots(res.ok ? (res.data?.slots ?? []) : []);
      })
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [selectedCourt, selectedDate, step]);

  const handleConfirm = async (notes, discountCode) => {
    if (!selectedCourt || !selectedDate || !selectedSlot) return;
    setSubmitting(true);
    try {
      const res = await bookingService.createBooking({
        courtId: selectedCourt.id,
        date: selectedDate,
        startTime: selectedSlot.start,
        endTime: selectedSlot.end,
        notes,
        ...(discountCode ? { discountCode } : {}),
      });
      if (res.ok) {
        setCreatedBooking({ ...res.data.booking, court: selectedCourt, date: selectedDate, startTime: selectedSlot.start, endTime: selectedSlot.end });
        setStep("success");
      } else {
        toast.error(res.data?.message ?? "خطا در ثبت رزرو");
      }
    } catch {
      toast.error("خطا در ثبت رزرو");
    } finally {
      setSubmitting(false);
    }
  };

  const showBack = (step === "booking" && courts.length > 1 && !initialCourt) || step === "summary";

  const handleBack = () => {
    if (step === "booking") { setStep("court"); setSelectedCourt(null); }
    else if (step === "summary") setStep("booking");
  };

  return (
    <BottomSheet
      open={open}
      onDismiss={() => { if (step !== "success") onClose(); else { reset(); onClose(); } }}
      snapPoints={({ maxHeight }) => [Math.min(maxHeight * 0.92, 720)]}
      defaultSnap={({ snapPoints }) => snapPoints[0]}
      header={
        <div className="flex items-center gap-3 px-1">
          {showBack ? (
            <button onClick={handleBack} className="p-1.5 rounded-full bg-muted">
              <ArrowRightIcon className="w-4 h-4 text-foreground" />
            </button>
          ) : <div className="w-8" />}
          <h2 className="flex-1 font-bold text-foreground text-center text-base">
            {STEP_TITLES[step]}
          </h2>
          <div className="w-8" />
        </div>
      }
    >
      <div className="px-4 pt-4 pb-8">
        <AnimatePresence mode="wait">
          {step === "court" && (
            <motion.div key="court" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              {courts.length === 0 ? (
                <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-4 text-amber-700 dark:text-amber-400 text-xs text-center">
                  ⚠️ زمین‌های این مجموعه هنوز در سیستم ثبت نشده‌اند.
                </div>
              ) : (
                <CourtSelector courts={courts} onSelect={goToBooking} />
              )}
            </motion.div>
          )}

          {step === "booking" && selectedCourt && (
            <motion.div key="booking" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <DateSlotsStep
                court={selectedCourt}
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
                slots={slots}
                slotsLoading={slotsLoading}
                selectedSlot={selectedSlot}
                onSelectSlot={(slot) => { setSelectedSlot(slot); setStep("summary"); }}
              />
            </motion.div>
          )}

          {step === "summary" && selectedCourt && selectedDate && selectedSlot && (
            <motion.div key="summary" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <BookingSummaryStep
                court={selectedCourt}
                date={selectedDate}
                slot={selectedSlot}
                clubId={club?.id}
                onConfirm={handleConfirm}
                onBack={() => setStep("booking")}
                submitting={submitting}
              />
            </motion.div>
          )}

          {step === "success" && (
            <motion.div key="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <SuccessStep
                booking={createdBooking}
                onClose={() => { reset(); onClose(); }}
                onViewBookings={() => { reset(); onClose(); navigate("/mybooking"); }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </BottomSheet>
  );
}
