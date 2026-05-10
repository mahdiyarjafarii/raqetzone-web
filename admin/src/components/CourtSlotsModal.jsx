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

// Mini form that appears when a slot is clicked
function SlotEditForm({ slot, override, courtPrice, onSave, onClose }) {
  const current = override ?? { status: "available", price: null, discountPercent: 0 };
  const [status, setStatus] = useState(current.status);
  const [price, setPrice] = useState(current.price ?? "");
  const [discount, setDiscount] = useState(current.discountPercent ?? 0);
  const [saving, setSaving] = useState(false);

  const effectivePrice = price !== "" ? Number(price) : courtPrice;
  const finalPrice = discount > 0 ? Math.round(effectivePrice * (1 - discount / 100)) : effectivePrice;

  const handleSave = async () => {
    setSaving(true);
    await onSave({ status, price: price !== "" ? Number(price) : null, discountPercent: Number(discount) });
    setSaving(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      className="absolute z-10 top-full mt-1 left-0 right-0 bg-card border border-border rounded-xl shadow-xl p-3 min-w-[220px]"
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold text-foreground">{slot.start} – {slot.end}</p>
        <button onClick={onClose} className="p-0.5 rounded hover:bg-muted">
          <XIcon className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>

      {/* Status */}
      <div className="flex gap-1.5 mb-3">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => setStatus(key)}
            className={cn(
              "flex-1 text-[10px] font-semibold py-1.5 rounded-lg border transition-all",
              status === key ? cfg.bg : "bg-muted border-border text-muted-foreground"
            )}
          >
            {cfg.label}
          </button>
        ))}
      </div>

      {/* Price override */}
      <div className="mb-2">
        <label className="text-[10px] text-muted-foreground mb-1 block">قیمت (تومان) — خالی = پیش‌فرض زمین</label>
        <input
          type="number"
          value={price}
          onChange={e => setPrice(e.target.value)}
          placeholder={String(courtPrice)}
          className="w-full h-8 rounded-lg border border-input bg-background px-2 text-xs focus:outline-none"
        />
      </div>

      {/* Discount */}
      <div className="mb-3">
        <label className="text-[10px] text-muted-foreground mb-1 block">تخفیف (%)</label>
        <input
          type="number"
          min="0"
          max="100"
          value={discount}
          onChange={e => setDiscount(e.target.value)}
          className="w-full h-8 rounded-lg border border-input bg-background px-2 text-xs focus:outline-none"
        />
      </div>

      {/* Preview */}
      {discount > 0 && (
        <div className="text-[10px] text-muted-foreground mb-2 bg-muted rounded-lg px-2 py-1.5">
          قیمت نهایی: <span className="text-primary font-bold">{fmt(finalPrice)} ت</span>
          {" "}(از {fmt(effectivePrice)} ت)
        </div>
      )}

      <Button size="sm" className="w-full text-xs" disabled={saving} onClick={handleSave}>
        {saving ? "ذخیره..." : "ذخیره"}
      </Button>
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
              <div key={slot.start} className="relative">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveSlot(isActive ? null : slot)}
                  className={cn(
                    "w-full flex flex-col items-center justify-center h-16 rounded-xl border text-xs font-medium transition-all",
                    cfg.bg,
                    isActive && "ring-2 ring-primary ring-offset-1"
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

                <AnimatePresence>
                  {isActive && (
                    <SlotEditForm
                      slot={slot}
                      override={override}
                      courtPrice={courtPrice}
                      onSave={(vals) => handleSave(slot, vals)}
                      onClose={() => setActiveSlot(null)}
                    />
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
