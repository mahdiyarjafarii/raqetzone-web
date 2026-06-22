import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { XIcon, LockIcon, UserCheckIcon, CheckCircleIcon, CheckSquareIcon, SquareIcon, Trash2Icon } from "lucide-react";
import toast from "react-hot-toast";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import apiClient from "@/lib/apiClient";
import { cn, fmt, getUserFullName } from "@/lib/utils";

const TEHRAN_TIME_ZONE = "Asia/Tehran";

function formatDateKeyInTehran(date) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: TEHRAN_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return `${year}-${month}-${day}`;
}

function parseDateKey(dateStr) {
  const [year, month, day] = (dateStr ?? "").split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
}

function addDays(dateStr, n) {
  const d = parseDateKey(dateStr);
  if (!d) return dateStr;
  d.setUTCDate(d.getUTCDate() + n);
  return formatDateKeyInTehran(d);
}

function formatDateFa(dateStr) {
  const date = parseDateKey(dateStr);
  if (!date) return dateStr;
  return date.toLocaleDateString("fa-IR-u-ca-persian", {
    timeZone: TEHRAN_TIME_ZONE,
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function generateSlots(openTime, closeTime, slotDuration) {
  const [oh, om] = (openTime ?? "07:00").split(":").map(Number);
  const [ch, cm] = (closeTime ?? "23:00").split(":").map(Number);
  const open = oh * 60 + om;
  let close = ch * 60 + cm;
  const dur = parseInt(slotDuration ?? 60, 10);
  // Handle midnight close ("00:00") and cross-day schedules
  if (close <= open) close += 1440;
  const slots = [];
  for (let t = open; t + dur <= close; t += dur) {
    const sh = String(Math.floor(t / 60) % 24).padStart(2, "0");
    const sm = String(t % 60).padStart(2, "0");
    const endT = t + dur;
    const eh = String(Math.floor(endT / 60) % 24).padStart(2, "0");
    const em = String(endT % 60).padStart(2, "0");
    slots.push({ start: `${sh}:${sm}`, end: `${eh}:${em}` });
  }
  return slots;
}

function getSlotDurationHours(slot) {
  const [sh, sm] = slot.start.split(":").map(Number);
  const [eh, em] = slot.end.split(":").map(Number);
  let startMin = sh * 60 + sm;
  let endMin = eh * 60 + em;
  if (endMin <= startMin) endMin += 1440;
  return (endMin - startMin) / 60;
}

const today = formatDateKeyInTehran(new Date());
const DAYS = Array.from({ length: 7 }, (_, i) => addDays(today, i));

const STATUS_CONFIG = {
  available: { label: "باز",         bg: "bg-emerald-500/10 border-emerald-500/40 text-emerald-700",  icon: CheckCircleIcon },
  blocked:   { label: "بسته",        bg: "bg-red-500/10 border-red-500/40 text-red-600",               icon: LockIcon },
  booked:    { label: "رزرو شده",    bg: "bg-orange-500/10 border-orange-500/40 text-orange-600",      icon: UserCheckIcon },
};

// Edit panel shown below the grid
function SlotEditPanel({ slot, override, booking, courtPrice, slotDurationHours, onSave, onClose }) {
  const current = override ?? { status: "available", price: null, discountPercent: 0 };
  const [status, setStatus] = useState(current.status);
  const [price, setPrice] = useState(current.price ?? "");
  const [discount, setDiscount] = useState(current.discountPercent ?? 0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setStatus(current.status);
    setPrice(current.price ?? "");
    setDiscount(current.discountPercent ?? 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slot?.start, override]);

  const effectiveHourlyPrice = price !== "" ? Number(price) : courtPrice;
  const effectivePrice = Math.round(effectiveHourlyPrice * slotDurationHours);
  const finalPrice = discount > 0 ? Math.round(effectivePrice * (1 - discount / 100)) : effectivePrice;
  const bookingUserName = getUserFullName({
    firstName: booking?.userFirstName,
    lastName: booking?.userLastName,
  });

  const handleSave = async () => {
    setSaving(true);
    await onSave({ status, price: price !== "" ? Number(price) : null, discountPercent: Number(discount) });
    setSaving(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="mt-4 rounded-2xl border border-primary/30 bg-card shadow-lg overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-primary/5 border-b border-primary/20">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          <p className="text-sm font-bold text-foreground">
            ویرایش سانس <span dir="ltr" className="font-mono text-primary">{slot.start} – {slot.end}</span>
          </p>
        </div>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted transition-colors">
          <XIcon className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Booking customer info */}
        {booking && (
          <div className="rounded-xl bg-orange-500/8 border border-orange-300/40 px-4 py-3 space-y-1.5">
            <p className="text-xs font-bold text-orange-700 dark:text-orange-400 flex items-center gap-1.5">
              <UserCheckIcon className="w-3.5 h-3.5" />
              رزرو شده توسط:
            </p>
            <p className="text-sm font-bold text-foreground">{bookingUserName}</p>
            <p className="text-xs text-muted-foreground" dir="ltr">{booking.userPhone}</p>
            {booking.trackingCode && (
              <p className="text-[10px] text-muted-foreground">کد رهگیری: <span className="font-mono font-semibold">{booking.trackingCode}</span></p>
            )}
            {booking.totalPrice > 0 && (
              <p className="text-[10px] text-muted-foreground">مبلغ: {fmt(booking.totalPrice)} تومان</p>
            )}
          </div>
        )}

        {/* Status */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">وضعیت سانس</p>
          <div className="flex gap-2">
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
              const Icon = cfg.icon;
              return (
                <button
                  key={key}
                  onClick={() => setStatus(key)}
                  className={cn(
                    "flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-semibold transition-all",
                    status === key ? cfg.bg + " scale-105 shadow-sm" : "bg-muted border-border text-muted-foreground hover:border-primary/40"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {cfg.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Price + Discount in a row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">
              قیمت/ساعت (تومان)
              <span className="font-normal mr-1 text-[10px]">خالی = پیش‌فرض</span>
            </label>
            <input
              type="number"
              value={price}
              onChange={e => setPrice(e.target.value)}
              placeholder={String(courtPrice)}
              className="w-full h-9 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">تخفیف (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              value={discount}
              onChange={e => setDiscount(e.target.value)}
              className="w-full h-9 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* Price preview */}
        <div className="rounded-xl bg-muted/50 px-4 py-2.5 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">قیمت نهایی سانس:</span>
          <div className="flex items-center gap-2">
            {discount > 0 && (
              <span className="text-xs line-through text-muted-foreground">{fmt(effectivePrice)} ت</span>
            )}
            <span className="text-sm font-black text-primary">{fmt(finalPrice)} تومان</span>
            {discount > 0 && (
              <span className="text-[10px] bg-primary/10 text-primary font-bold px-1.5 py-0.5 rounded-full">
                {discount}٪ تخفیف
              </span>
            )}
          </div>
        </div>

        <Button className="w-full" disabled={saving} onClick={handleSave}>
          {saving ? "در حال ذخیره..." : "ذخیره تغییرات"}
        </Button>
      </div>
    </motion.div>
  );
}

// Confirmation modal for bulk close
function BulkCloseConfirmModal({ open, count, onConfirm, onCancel, loading }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-card rounded-2xl border border-border shadow-xl p-6 w-full max-w-sm z-10"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
            <LockIcon className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <p className="font-bold text-foreground text-sm">بستن سانس‌های انتخاب‌شده</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {count} سانس انتخاب شده
            </p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          آیا از بستن {count} سانس انتخاب‌شده مطمئن هستید؟ وضعیت همه آن‌ها به «بسته» تغییر می‌کند.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 h-10 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            انصراف
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 h-10 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <LockIcon className="w-4 h-4" />
            )}
            {loading ? "در حال بستن..." : "بله، ببند"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function CourtSlotsModal({ open, onClose, court }) {
  const [selectedDay, setSelectedDay] = useState(today);
  const [overridesMap, setOverridesMap] = useState({}); // "date|startTime" -> override obj
  const [bookingsMap, setBookingsMap] = useState({}); // "date|startTime" -> booking+user obj
  const [loading, setLoading] = useState(false);
  const [activeSlot, setActiveSlot] = useState(null); // slot being edited

  // Multi-select state
  const [isMultiSelect, setIsMultiSelect] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState(new Set()); // "date|startTime"
  const [showConfirm, setShowConfirm] = useState(false);
  const [bulkClosing, setBulkClosing] = useState(false);

  const openTime    = court?.openTime    ?? court?.open_time    ?? "07:00";
  const closeTime   = court?.closeTime   ?? court?.close_time   ?? "23:00";
  const slotDuration = parseInt(court?.slotDuration ?? court?.slot_duration ?? 60, 10);
  const courtPrice  = court?.pricePerHour ?? court?.price_per_hour ?? 0;

  const slots = court ? generateSlots(openTime, closeTime, slotDuration) : [];

  const fetchOverrides = useCallback(async () => {
    if (!court) return;
    setLoading(true);
    const from = today;
    const to = addDays(today, 6);
    const { ok, data } = await apiClient.get(
      `/club-panel/courts/${court.id}/slot-overrides?from=${from}&to=${to}`
    );
    if (ok) {
      const map = {};
      (data.slotOverrides ?? []).forEach((o) => {
        map[`${o.date}|${o.startTime}`] = o;
      });
      setOverridesMap(map);
      setBookingsMap(data.bookingsBySlot ?? {});
    }
    setLoading(false);
  }, [court]);

  useEffect(() => {
    if (open) {
      setSelectedDay(today);
      setActiveSlot(null);
      setIsMultiSelect(false);
      setSelectedKeys(new Set());
      fetchOverrides();
    }
  }, [open, fetchOverrides]);

  const handleSave = async (slot, values) => {
    const { ok, data } = await apiClient.post(
      `/club-panel/courts/${court.id}/slot-overrides`,
      { date: selectedDay, startTime: slot.start, endTime: slot.end, ...values }
    );
    if (!ok) return toast.error("خطا در ذخیره");

    const key = `${selectedDay}|${slot.start}`;
    setOverridesMap(prev => {
      const next = { ...prev };
      if (data.deleted) delete next[key];
      else next[key] = data.slotOverride;
      return next;
    });
    setActiveSlot(null);
    toast.success("ذخیره شد");
  };

  const exitMultiSelect = () => {
    setIsMultiSelect(false);
    setSelectedKeys(new Set());
    setActiveSlot(null);
  };

  const toggleSlotSelection = (slotKey) => {
    setSelectedKeys(prev => {
      const next = new Set(prev);
      if (next.has(slotKey)) next.delete(slotKey);
      else next.add(slotKey);
      return next;
    });
  };

  const handleBulkClose = async () => {
    setBulkClosing(true);
    const slotsToClose = slots
      .filter(slot => selectedKeys.has(`${selectedDay}|${slot.start}`))
      .map(slot => ({ date: selectedDay, startTime: slot.start, endTime: slot.end }));

    const { ok, data } = await apiClient.post(
      `/club-panel/courts/${court.id}/slot-overrides/bulk-close`,
      { slots: slotsToClose }
    );

    setBulkClosing(false);
    setShowConfirm(false);

    if (!ok) return toast.error("خطا در بستن سانس‌ها");

    setOverridesMap(prev => {
      const next = { ...prev };
      (data.slotOverrides ?? []).forEach(o => {
        next[`${o.date}|${o.startTime}`] = o;
      });
      return next;
    });
    exitMultiSelect();
    toast.success(`${data.slotOverrides?.length ?? 0} سانس با موفقیت بسته شد`);
  };

  return (
    <>
      <Modal open={open} onClose={() => { setActiveSlot(null); exitMultiSelect(); onClose(); }} title={`مدیریت سانس‌ها — ${court?.name ?? ""}`} size="xl">
        {/* Day tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-5">
          {DAYS.map((day) => (
            <button
              key={day}
              onClick={() => { setSelectedDay(day); setActiveSlot(null); setSelectedKeys(new Set()); }}
              className={cn(
                "shrink-0 px-4 py-2 rounded-xl text-xs font-semibold border transition-all",
                day === selectedDay
                  ? "bg-primary text-white border-primary"
                  : "bg-muted text-muted-foreground border-border hover:border-primary"
              )}
            >
              {formatDateFa(day)}
              {day === today && <span className="block text-[10px] opacity-70">امروز</span>}
            </button>
          ))}
        </div>

        {/* Legend + Multi-select toggle */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4 flex-wrap">
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <span key={key} className="flex items-center gap-1.5">
              <span className={cn("h-3 w-3 rounded border inline-block", cfg.bg)} />
              {cfg.label}
            </span>
          ))}
          <div className="mr-auto flex items-center gap-2">
            {!isMultiSelect ? (
              <>
                <span className="text-[10px]">کلیک برای ویرایش</span>
                <button
                  onClick={() => { setIsMultiSelect(true); setActiveSlot(null); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted border border-border hover:border-primary/50 text-xs font-medium text-foreground transition-all"
                >
                  <CheckSquareIcon className="w-3.5 h-3.5" />
                  انتخاب گروهی
                </button>
              </>
            ) : (
              <button
                onClick={exitMultiSelect}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/30 text-xs font-medium text-primary transition-all hover:bg-primary/20"
              >
                <XIcon className="w-3.5 h-3.5" />
                خروج از انتخاب گروهی
              </button>
            )}
          </div>
        </div>

        {/* Slots */}
        {loading ? (
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : slots.length === 0 ? (
          <p className="text-center text-muted-foreground py-8 text-sm">
            اسلاتی برای این زمین تعریف نشده
            <br />
            <span className="text-xs">openTime: {openTime} | closeTime: {closeTime} | duration: {slotDuration}min</span>
          </p>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-2">
              {slots.map((slot) => {
                const key = `${selectedDay}|${slot.start}`;
                const override = overridesMap[key];
                const booking = bookingsMap[key];
                const status = override?.status ?? "available";
                const cfg = STATUS_CONFIG[status];
                const Icon = cfg.icon;
                const slotDurationHours = getSlotDurationHours(slot);
                const displayHourlyPrice = override?.price ?? courtPrice;
                const displayPrice = Math.round(displayHourlyPrice * slotDurationHours);
                const discount = override?.discountPercent ?? 0;
                const finalPrice = discount > 0 ? Math.round(displayPrice * (1 - discount / 100)) : displayPrice;
                const isActive = activeSlot?.start === slot.start;
                const isBookedSlot = status === "booked" && booking;
                const bookingUserName = getUserFullName({
                  firstName: booking?.userFirstName,
                  lastName: booking?.userLastName,
                });
                const isSelected = selectedKeys.has(key);
                const canSelect = status !== "booked"; // booked slots can't be bulk-closed

                if (isMultiSelect) {
                  return (
                    <motion.button
                      key={slot.start}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => canSelect && toggleSlotSelection(key)}
                      className={cn(
                        "w-full flex flex-col items-center justify-center rounded-xl border text-xs font-medium transition-all overflow-hidden relative",
                        isBookedSlot ? "h-auto py-2 px-1 min-h-[4rem]" : "h-16",
                        isSelected
                          ? "bg-red-500/15 border-red-500 text-red-700 ring-2 ring-red-500/50"
                          : cfg.bg,
                        !canSelect && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      {/* Selection indicator */}
                      <div className={cn(
                        "absolute top-1 right-1 w-4 h-4 rounded flex items-center justify-center",
                        isSelected ? "text-red-600" : "text-muted-foreground/40"
                      )}>
                        {isSelected
                          ? <CheckSquareIcon className="w-3.5 h-3.5" />
                          : <SquareIcon className="w-3.5 h-3.5" />
                        }
                      </div>
                      <Icon className="w-3 h-3 mb-0.5 shrink-0" />
                      <span className="font-bold">{slot.start}</span>
                      {isBookedSlot ? (
                        <span className="text-[9px] font-semibold truncate max-w-full px-1 mt-0.5 leading-tight text-center opacity-80">
                          {bookingUserName}
                        </span>
                      ) : (
                        <span className="text-[9px] opacity-70">{fmt(finalPrice)}ت</span>
                      )}
                    </motion.button>
                  );
                }

                return (
                  <motion.button
                    key={slot.start}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setActiveSlot(isActive ? null : slot)}
                    className={cn(
                      "w-full flex flex-col items-center justify-center rounded-xl border text-xs font-medium transition-all overflow-hidden",
                      isBookedSlot ? "h-auto py-2 px-1 min-h-[4rem]" : "h-16",
                      cfg.bg,
                      isActive && "ring-2 ring-primary ring-offset-1 scale-105"
                    )}
                  >
                    <Icon className="w-3 h-3 mb-0.5 shrink-0" />
                    <span className="font-bold">{slot.start}</span>
                    {isBookedSlot ? (
                      <span className="text-[9px] font-semibold truncate max-w-full px-1 mt-0.5 leading-tight text-center opacity-80">
                        {bookingUserName}
                      </span>
                    ) : discount > 0 ? (
                      <>
                        <span className="text-[9px] line-through opacity-50">{fmt(displayPrice)}</span>
                        <span className="text-[9px] text-primary font-bold">{fmt(finalPrice)}ت</span>
                      </>
                    ) : (
                      <span className="text-[9px] opacity-70">{fmt(finalPrice)}ت</span>
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* Bulk action bar */}
            <AnimatePresence>
              {isMultiSelect && selectedKeys.size > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-red-500/30 bg-red-500/5 px-4 py-3"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-red-500/15 flex items-center justify-center">
                      <CheckSquareIcon className="w-4 h-4 text-red-600" />
                    </div>
                    <span className="text-sm font-bold text-foreground">
                      {selectedKeys.size} سانس انتخاب شده
                    </span>
                  </div>
                  <button
                    onClick={() => setShowConfirm(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition-colors"
                  >
                    <LockIcon className="w-3.5 h-3.5" />
                    بستن سانس‌های انتخاب‌شده
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {activeSlot && !isMultiSelect && (
                <SlotEditPanel
                  slot={activeSlot}
                  override={overridesMap[`${selectedDay}|${activeSlot.start}`]}
                  booking={bookingsMap[`${selectedDay}|${activeSlot.start}`]}
                  courtPrice={courtPrice}
                  slotDurationHours={getSlotDurationHours(activeSlot)}
                  onSave={(vals) => handleSave(activeSlot, vals)}
                  onClose={() => setActiveSlot(null)}
                />
              )}
            </AnimatePresence>
          </>
        )}
      </Modal>

      <AnimatePresence>
        {showConfirm && (
          <BulkCloseConfirmModal
            open={showConfirm}
            count={selectedKeys.size}
            onConfirm={handleBulkClose}
            onCancel={() => setShowConfirm(false)}
            loading={bulkClosing}
          />
        )}
      </AnimatePresence>
    </>
  );
}
