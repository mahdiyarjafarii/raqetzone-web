import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { XIcon, LockIcon, UserCheckIcon, CheckCircleIcon } from "lucide-react";
import toast from "react-hot-toast";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import apiClient from "@/lib/apiClient";
import { cn, fmt } from "@/lib/utils";

function addDays(dateStr, n) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

function formatDateFa(dateStr) {
  return new Date(dateStr).toLocaleDateString("fa-IR", { weekday: "short", month: "short", day: "numeric" });
}

function generateSlots(openTime, closeTime, slotDuration) {
  const [oh, om] = (openTime ?? "07:00").split(":").map(Number);
  const [ch, cm] = (closeTime ?? "23:00").split(":").map(Number);
  const open = oh * 60 + om;
  const close = ch * 60 + cm;
  const dur = parseInt(slotDuration ?? 60, 10);
  const slots = [];
  for (let t = open; t + dur <= close; t += dur) {
    const sh = String(Math.floor(t / 60)).padStart(2, "0");
    const sm = String(t % 60).padStart(2, "0");
    const eh = String(Math.floor((t + dur) / 60)).padStart(2, "0");
    const em = String((t + dur) % 60).padStart(2, "0");
    slots.push({ start: `${sh}:${sm}`, end: `${eh}:${em}` });
  }
  return slots;
}

const today = new Date().toISOString().split("T")[0];
const DAYS = Array.from({ length: 7 }, (_, i) => addDays(today, i));

const STATUS_CONFIG = {
  available: { label: "باز",         bg: "bg-emerald-500/10 border-emerald-500/40 text-emerald-700",  icon: CheckCircleIcon },
  blocked:   { label: "بسته",        bg: "bg-red-500/10 border-red-500/40 text-red-600",               icon: LockIcon },
  booked:    { label: "رزرو شده",    bg: "bg-orange-500/10 border-orange-500/40 text-orange-600",      icon: UserCheckIcon },
};

// Edit panel shown below the grid
function SlotEditPanel({ slot, override, courtPrice, onSave, onClose }) {
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

  const effectivePrice = price !== "" ? Number(price) : courtPrice;
  const finalPrice = discount > 0 ? Math.round(effectivePrice * (1 - discount / 100)) : effectivePrice;

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
              قیمت (تومان)
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

export default function CourtSlotsModal({ open, onClose, court }) {
  const [selectedDay, setSelectedDay] = useState(today);
  const [overridesMap, setOverridesMap] = useState({}); // "date|startTime" -> override obj
  const [loading, setLoading] = useState(false);
  const [activeSlot, setActiveSlot] = useState(null); // slot being edited

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
    }
    setLoading(false);
  }, [court]);

  useEffect(() => {
    if (open) { setSelectedDay(today); setActiveSlot(null); fetchOverrides(); }
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

  return (
    <Modal open={open} onClose={() => { setActiveSlot(null); onClose(); }} title={`مدیریت سانس‌ها — ${court?.name ?? ""}`} size="xl">
      {/* Day tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5">
        {DAYS.map((day) => (
          <button
            key={day}
            onClick={() => { setSelectedDay(day); setActiveSlot(null); }}
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

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4 flex-wrap">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <span key={key} className="flex items-center gap-1.5">
            <span className={cn("h-3 w-3 rounded border inline-block", cfg.bg)} />
            {cfg.label}
          </span>
        ))}
        <span className="text-[10px] mr-auto">کلیک برای ویرایش</span>
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
              const status = override?.status ?? "available";
              const cfg = STATUS_CONFIG[status];
              const Icon = cfg.icon;
              const displayPrice = override?.price ?? courtPrice;
              const discount = override?.discountPercent ?? 0;
              const finalPrice = discount > 0 ? Math.round(displayPrice * (1 - discount / 100)) : displayPrice;
              const isActive = activeSlot?.start === slot.start;

              return (
                <motion.button
                  key={slot.start}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveSlot(isActive ? null : slot)}
                  className={cn(
                    "w-full flex flex-col items-center justify-center h-16 rounded-xl border text-xs font-medium transition-all",
                    cfg.bg,
                    isActive && "ring-2 ring-primary ring-offset-1 scale-105"
                  )}
                >
                  <Icon className="w-3 h-3 mb-0.5" />
                  <span className="font-bold">{slot.start}</span>
                  {discount > 0 ? (
                    <span className="text-[9px] line-through opacity-50">{fmt(displayPrice)}</span>
                  ) : (
                    <span className="text-[9px] opacity-70">{fmt(finalPrice)}ت</span>
                  )}
                  {discount > 0 && (
                    <span className="text-[9px] text-primary font-bold">{fmt(finalPrice)}ت</span>
                  )}
                </motion.button>
              );
            })}
          </div>

          <AnimatePresence>
            {activeSlot && (
              <SlotEditPanel
                slot={activeSlot}
                override={overridesMap[`${selectedDay}|${activeSlot.start}`]}
                courtPrice={courtPrice}
                onSave={(vals) => handleSave(activeSlot, vals)}
                onClose={() => setActiveSlot(null)}
              />
            )}
          </AnimatePresence>
        </>
      )}
    </Modal>
  );
}
