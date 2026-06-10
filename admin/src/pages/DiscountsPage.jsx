import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PlusIcon, Trash2Icon, FlameIcon, ClockIcon, TagIcon, CheckCircleIcon,
  TicketIcon, CopyIcon, UsersIcon, ToggleLeftIcon, ToggleRightIcon,
  EyeIcon, XIcon, RefreshCwIcon,
} from "lucide-react";
import toast from "react-hot-toast";
import apiClient from "@/lib/apiClient";
import PageHeader from "@/components/PageHeader";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import PersianTimePicker from "@/components/PersianTimePicker";
import { fmt, cn, getUserFullName } from "@/lib/utils";

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

function addDaysToDateKey(dateStr, days) {
  const date = parseDateKey(dateStr);
  if (!date) return dateStr;
  date.setUTCDate(date.getUTCDate() + days);
  return formatDateKeyInTehran(date);
}

// ─── Countdown hook ───────────────────────────────────────────────────────────
function useCountdown(target) {
  const calc = () => {
    const diff = new Date(target).getTime() - Date.now();
    if (diff <= 0) return { h: 0, m: 0, s: 0, expired: true };
    const t = Math.floor(diff / 1000);
    return { h: Math.floor(t / 3600), m: Math.floor((t % 3600) / 60), s: t % 60, expired: false };
  };
  const [v, setV] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setV(calc()), 1000);
    return () => clearInterval(id);
  }, [target]);
  return v;
}

function pad(n) { return String(n).padStart(2, "0"); }

const dateTimeFormatFa = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  weekday: "short",
  year: "numeric",
  month: "long",
  day: "numeric",
});

function getDatePart(value) {
  return value?.split("T")[0] ?? "";
}

function getTimePart(value) {
  return value?.split("T")[1] ?? "12:00";
}

function buildDateOptions(daysAhead = 730) {
  const today = formatDateKeyInTehran(new Date());
  return Array.from({ length: daysAhead }, (_, index) => {
    const dateKey = addDaysToDateKey(today, index);
    const date = parseDateKey(dateKey);
    return {
      value: dateKey,
      label: dateTimeFormatFa.format(date),
    };
  });
}

const persianDateOptions = buildDateOptions();

function formatDateFa(dateStr) {
  if (!dateStr) return "—";
  const date = parseDateKey(dateStr);
  if (!date) return dateStr;
  return date.toLocaleDateString("fa-IR-u-ca-persian", {
    timeZone: TEHRAN_TIME_ZONE,
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function timeToMinutes(time) {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

function getSlotDurationHours(startTime, endTime) {
  return (timeToMinutes(endTime) - timeToMinutes(startTime)) / 60;
}

function formatTimeFa(time) {
  if (!time) return "—";
  const [hour, minute] = time.split(":").map(Number);
  return `${fmt(hour)}:${String(minute).padStart(2, "0").replace(/\d/g, d => "۰۱۲۳۴۵۶۷۸۹"[d])}`;
}

function PersianDateInput({ value, onChange, required }) {
  const datePart = value || "";

  return (
    <select
      dir="rtl"
      value={datePart}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      className="h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
    >
      <option value="">انتخاب تاریخ...</option>
      {persianDateOptions.map((option) => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
  );
}

function PersianDateTimeInput({ value, onChange, required }) {
  const datePart = getDatePart(value);
  const timePart = getTimePart(value);

  function emit(nextDate, nextTime) {
    if (!nextDate) return;
    onChange(`${nextDate}T${nextTime}`);
  }

  return (
    <div className="grid grid-cols-[1fr_auto] gap-2">
      <select
        dir="rtl"
        value={datePart}
        onChange={(e) => emit(e.target.value, timePart)}
        required={required}
        className="h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
      >
        <option value="">انتخاب تاریخ...</option>
        {persianDateOptions.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      <PersianTimePicker
        value={timePart}
        onChange={(nextTime) => emit(datePart, nextTime)}
        required={required}
      />
    </div>
  );
}

function CountdownPill({ validUntil }) {
  const { h, m, s, expired } = useCountdown(validUntil);
  if (expired) return <span className="text-xs text-muted-foreground font-medium">منقضی شد</span>;
  const urgent = h === 0 && m < 30;
  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-xs font-mono font-bold px-2.5 py-1 rounded-full",
      urgent
        ? "bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400"
        : "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"
    )}>
      <ClockIcon className="w-3 h-3 shrink-0" />
      {h > 0 && `${pad(h)}:`}{pad(m)}:{pad(s)}
    </span>
  );
}

const SPORT_ICONS = { padel:"🏓", tennis:"🎾", squash:"🟡", badminton:"🏸", "ping-pong":"🏓" };

// ─────────────────────────────────────────────────────────────────────────────
// TAB 1: Deals (slot discounts)
// ─────────────────────────────────────────────────────────────────────────────

function DealCard({ deal, onDelete, index }) {
  const { expired } = useCountdown(deal.validUntil);
  const slotPrice = Math.round(deal.court.pricePerHour * getSlotDurationHours(deal.slotStart, deal.slotEnd));
  const discountedPrice = Math.round(slotPrice * (1 - deal.discountPercent / 100));

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        "rounded-2xl border bg-card overflow-hidden shadow-sm hover:shadow-md transition-all",
        expired || !deal.isActive ? "border-border opacity-60" : "border-border"
      )}
    >
      <div className={cn(
        "px-4 py-2.5 flex items-center justify-between",
        expired || !deal.isActive ? "bg-muted" : "bg-gradient-to-r from-red-500 to-orange-500"
      )}>
        <div className="flex items-center gap-2">
          {!expired && deal.isActive && <FlameIcon className="w-3.5 h-3.5 text-white" />}
          <span className={cn(
            "text-xs font-bold uppercase tracking-wider",
            expired || !deal.isActive ? "text-muted-foreground" : "text-white"
          )}>
            {expired ? "منقضی" : !deal.isActive ? "غیرفعال" : "آفر فعال"}
          </span>
          {!expired && deal.isActive && (
            <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              {deal.discountPercent}٪ تخفیف
            </span>
          )}
        </div>
        {!expired && deal.isActive && <CountdownPill validUntil={deal.validUntil} />}
      </div>

      <div className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center text-xl shrink-0">
            {SPORT_ICONS[deal.court.sportType] ?? "🏅"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-foreground text-sm truncate">{deal.court.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{deal.court.location}</p>
          </div>
        </div>

        <div className="bg-muted/60 rounded-xl px-3 py-2 mb-3 flex items-center gap-2 text-xs text-muted-foreground">
          <ClockIcon className="w-3.5 h-3.5 shrink-0" />
          <span>{formatDateFa(deal.slotDate)} — {formatTimeFa(deal.slotStart)} تا {formatTimeFa(deal.slotEnd)}</span>
        </div>

        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs text-muted-foreground line-through">{fmt(slotPrice)} تومان</p>
            <p className="text-lg font-black text-primary">{fmt(discountedPrice)} <span className="text-xs font-medium text-muted-foreground">تومان</span></p>
          </div>
          <Button size="sm" variant="ghost" onClick={() => onDelete(deal.id)}
            className="text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10">
            <Trash2Icon className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

function CreateDealForm({ courts, onCreated, onClose }) {
  const [form, setForm] = useState({
    courtId: "", slotDate: "", slotStart: "", slotEnd: "",
    discountPercent: "20",
  });
  const [availableSlots, setAvailableSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    if (!form.courtId || !form.slotDate) {
      setAvailableSlots([]);
      setForm((prev) => ({ ...prev, slotStart: "", slotEnd: "" }));
      return;
    }

    let cancelled = false;
    setSlotsLoading(true);
    apiClient.get(`/courts/${form.courtId}/availability`, { date: form.slotDate })
      .then(({ ok, data }) => {
        if (cancelled) return;
        const nextSlots = ok
          ? (data?.slots ?? []).filter((slot) => !(slot.isBooked || slot.isPending || slot.isBlocked || slot.isManualBooked))
          : [];
        setAvailableSlots(nextSlots);
        setForm((prev) => {
          const stillValid = nextSlots.some((slot) => slot.start === prev.slotStart && slot.end === prev.slotEnd);
          return stillValid ? prev : { ...prev, slotStart: "", slotEnd: "" };
        });
      })
      .finally(() => {
        if (!cancelled) setSlotsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [form.courtId, form.slotDate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.slotStart || !form.slotEnd) {
      toast.error("لطفاً یک سانس قابل‌رزرو انتخاب کنید");
      return;
    }
    setSaving(true);
    const { ok, data } = await apiClient.post("/club-panel/deals", {
      ...form, discountPercent: parseInt(form.discountPercent),
    });
    setSaving(false);
    if (!ok) return toast.error(data?.message ?? "خطا در ایجاد آفر");
    toast.success("آفر با موفقیت ایجاد شد 🔥");
    onCreated(data.deal);
    onClose();
  };

  const selectedCourt = courts.find(c => c.id === form.courtId);
  const selectedSlot = availableSlots.find((slot) => slot.start === form.slotStart && slot.end === form.slotEnd);
  const slotBasePrice = selectedCourt && selectedSlot
    ? Math.round(selectedCourt.pricePerHour * getSlotDurationHours(selectedSlot.start, selectedSlot.end))
    : null;
  const preview = slotBasePrice !== null
    ? Math.round(slotBasePrice * (1 - parseInt(form.discountPercent || 0) / 100))
    : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-muted-foreground">زمین</label>
        <select value={form.courtId} onChange={e => f("courtId", e.target.value)} required
          className="h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30">
          <option value="">انتخاب زمین...</option>
          {courts.map(c => (
            <option key={c.id} value={c.id}>
              {SPORT_ICONS[c.sportType] ?? "🏅"} {c.name} — {fmt(c.pricePerHour)} تومان/ساعت
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-muted-foreground">تاریخ اسلات</label>
          <PersianDateInput value={form.slotDate} onChange={value => f("slotDate", value)} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-muted-foreground">درصد تخفیف</label>
          <div className="relative">
            <input type="number" min="5" max="90" value={form.discountPercent} onChange={e => f("discountPercent", e.target.value)} required
              className="h-10 w-full rounded-xl border border-input bg-background px-3 pl-8 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30" />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">٪</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-muted-foreground">سانس قابل آفر</label>
        <select
          value={form.slotStart && form.slotEnd ? `${form.slotStart}-${form.slotEnd}` : ""}
          onChange={(e) => {
            const [start, end] = e.target.value.split("-");
            f("slotStart", start || "");
            f("slotEnd", end || "");
          }}
          required
          disabled={!form.courtId || !form.slotDate || slotsLoading}
          className="h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 disabled:opacity-60"
        >
          <option value="">
            {!form.courtId || !form.slotDate
              ? "اول زمین و تاریخ را انتخاب کنید"
              : slotsLoading
              ? "در حال بارگذاری سانس‌ها..."
              : availableSlots.length === 0
              ? "سانس خالی برای آفر وجود ندارد"
              : "انتخاب سانس..."}
          </option>
          {availableSlots.map((slot) => (
            <option key={`${slot.start}-${slot.end}`} value={`${slot.start}-${slot.end}`}>
              {formatTimeFa(slot.start)} تا {formatTimeFa(slot.end)}
            </option>
          ))}
        </select>
        {selectedSlot && (
          <p className="text-[11px] text-muted-foreground">
            انقضای آفر به‌صورت خودکار تا شروع سانس ({formatTimeFa(selectedSlot.start)}) تنظیم می‌شود یا با رزرو شدن همان سانس بلافاصله غیرفعال می‌شود.
          </p>
        )}
      </div>

      {selectedCourt && selectedSlot && form.discountPercent && (
        <div className="rounded-xl bg-primary/5 border border-primary/15 p-3 flex items-center justify-between">
          <div className="text-xs text-muted-foreground">قیمت پس از تخفیف:</div>
          <div className="flex items-center gap-2">
            <span className="text-xs line-through text-muted-foreground">{fmt(slotBasePrice)}</span>
            <span className="font-black text-primary">{fmt(preview)} تومان</span>
          </div>
        </div>
      )}

      <Button type="submit" disabled={saving || !form.slotStart || !form.slotEnd} className="w-full gap-2">
        <FlameIcon className="w-4 h-4" />
        {saving ? "در حال ایجاد..." : "ایجاد آفر و اطلاع‌رسانی به کاربران"}
      </Button>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 2: Voucher / Discount Codes
// ─────────────────────────────────────────────────────────────────────────────

function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function VoucherStatusBadge({ code }) {
  const now = new Date();
  const expired = code.expiresAt && now > new Date(code.expiresAt);
  const maxedOut = code.maxUses !== null && code.usedCount >= code.maxUses;

  if (!code.isActive) return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground">غیرفعال</span>;
  if (expired) return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400">منقضی</span>;
  if (maxedOut) return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">تمام شد</span>;
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">فعال</span>;
}

function VoucherCard({ code, onToggle, onDelete, onViewUsages, index }) {
  const copy = () => {
    navigator.clipboard.writeText(code.code);
    toast.success("کد کپی شد");
  };

  const usagePercent = code.maxUses ? Math.round((code.usedCount / code.maxUses) * 100) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.04 }}
      className="rounded-2xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-all"
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <TicketIcon className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono font-black text-foreground text-sm tracking-widest">{code.code}</span>
              <button onClick={copy} className="text-muted-foreground hover:text-primary transition-colors">
                <CopyIcon className="w-3.5 h-3.5" />
              </button>
            </div>
            {code.description && <p className="text-[10px] text-muted-foreground truncate mt-0.5">{code.description}</p>}
          </div>
        </div>
        <VoucherStatusBadge code={code} />
      </div>

      {/* Discount info */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 rounded-xl bg-primary/5 border border-primary/10 px-3 py-2 text-center">
          <p className="text-[10px] text-muted-foreground mb-0.5">مقدار تخفیف</p>
          <p className="font-black text-primary text-sm">
            {code.discountType === "percent"
              ? `${code.discountValue}٪`
              : `${fmt(code.discountValue)} تومان`}
          </p>
        </div>
        <div className="flex-1 rounded-xl bg-muted/60 px-3 py-2 text-center">
          <p className="text-[10px] text-muted-foreground mb-0.5">استفاده شده</p>
          <p className="font-bold text-foreground text-sm">{code.usedCount}{code.maxUses ? `/${code.maxUses}` : ""}</p>
        </div>
        <div className="flex-1 rounded-xl bg-muted/60 px-3 py-2 text-center">
          <p className="text-[10px] text-muted-foreground mb-0.5">هر کاربر</p>
          <p className="font-bold text-foreground text-sm">{code.perUserLimit} بار</p>
        </div>
      </div>

      {/* Progress bar */}
      {usagePercent !== null && (
        <div className="mb-3">
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all", usagePercent >= 90 ? "bg-red-500" : "bg-primary")}
              style={{ width: `${usagePercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="text-[10px] text-muted-foreground">
          {code.expiresAt
            ? `انقضا: ${new Date(code.expiresAt).toLocaleDateString("fa-IR", { timeZone: TEHRAN_TIME_ZONE })}`
            : "بدون انقضا"}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onViewUsages(code)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
            title="مشاهده لاگ‌ها"
          >
            <EyeIcon className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onToggle(code)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
            title={code.isActive ? "غیرفعال کردن" : "فعال کردن"}
          >
            {code.isActive
              ? <ToggleRightIcon className="w-4 h-4 text-emerald-500" />
              : <ToggleLeftIcon className="w-4 h-4" />}
          </button>
          <button
            onClick={() => onDelete(code)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
          >
            <Trash2Icon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function CreateVoucherForm({ clubs, onCreated, onClose }) {
  const [form, setForm] = useState({
    clubId: "",
    code: generateCode(),
    discountType: "percent",
    discountValue: "",
    maxUses: "",
    perUserLimit: "1",
    minBookingPrice: "",
    expiresAt: "",
    description: "",
  });
  const [saving, setSaving] = useState(false);
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.clubId) return toast.error("باشگاه را انتخاب کنید");
    setSaving(true);
    const { ok, data } = await apiClient.post(`/club-panel/clubs/${form.clubId}/discount-codes`, {
      code: form.code || undefined,
      discountType: form.discountType,
      discountValue: parseInt(form.discountValue),
      maxUses: form.maxUses ? parseInt(form.maxUses) : undefined,
      perUserLimit: parseInt(form.perUserLimit),
      minBookingPrice: form.minBookingPrice ? parseInt(form.minBookingPrice) : 0,
      expiresAt: form.expiresAt || undefined,
      description: form.description || undefined,
    });
    setSaving(false);
    if (!ok) return toast.error(data?.message ?? "خطا در ایجاد کد تخفیف");
    toast.success("کد تخفیف ساخته شد ✅");
    onCreated(data);
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-muted-foreground">باشگاه *</label>
        <select value={form.clubId} onChange={e => f("clubId", e.target.value)} required
          className="h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30">
          <option value="">انتخاب باشگاه...</option>
          {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Code */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-muted-foreground">کد تخفیف</label>
        <div className="flex gap-2">
          <input
            value={form.code}
            onChange={e => f("code", e.target.value.toUpperCase())}
            placeholder="خودکار تولید می‌شود"
            className="flex-1 h-10 rounded-xl border border-input bg-background px-3 text-sm font-mono tracking-widest text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
          />
          <button
            type="button"
            onClick={() => f("code", generateCode())}
            className="h-10 px-3 rounded-xl border border-input bg-background text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
          >
            <RefreshCwIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Type + Value */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-muted-foreground">نوع تخفیف *</label>
          <select value={form.discountType} onChange={e => f("discountType", e.target.value)}
            className="h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30">
            <option value="percent">درصدی</option>
            <option value="fixed">مبلغ ثابت (تومان)</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-muted-foreground">
            {form.discountType === "percent" ? "درصد تخفیف *" : "مبلغ تخفیف (تومان) *"}
          </label>
          <input
            type="number"
            min="1"
            max={form.discountType === "percent" ? "100" : undefined}
            value={form.discountValue}
            onChange={e => f("discountValue", e.target.value)}
            required
            className="h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-muted-foreground">حداکثر استفاده کل</label>
          <input type="number" min="1" value={form.maxUses} onChange={e => f("maxUses", e.target.value)}
            placeholder="نامحدود"
            className="h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-muted-foreground">استفاده هر کاربر</label>
          <input type="number" min="1" value={form.perUserLimit} onChange={e => f("perUserLimit", e.target.value)} required
            className="h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-muted-foreground">حداقل مبلغ رزرو (تومان)</label>
          <input type="number" min="0" value={form.minBookingPrice} onChange={e => f("minBookingPrice", e.target.value)}
            placeholder="بدون حداقل"
            className="h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-muted-foreground">تاریخ انقضا</label>
          <PersianDateTimeInput value={form.expiresAt} onChange={value => f("expiresAt", value)} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-muted-foreground">توضیحات (اختیاری)</label>
        <input type="text" value={form.description} onChange={e => f("description", e.target.value)}
          placeholder="مثلاً: تخفیف ویژه مشتریان وفادار"
          className="h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30" />
      </div>

      <Button type="submit" disabled={saving} className="w-full gap-2">
        <TicketIcon className="w-4 h-4" />
        {saving ? "در حال ایجاد..." : "ساخت کد تخفیف"}
      </Button>
    </form>
  );
}

function UsagesModal({ code, clubId, onClose }) {
  const [usages, setUsages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!code || !clubId) return;
    setLoading(true);
    apiClient.get(`/club-panel/clubs/${clubId}/discount-codes/${code.id}/usages`).then(({ ok, data }) => {
      if (ok) setUsages(data);
      setLoading(false);
    });
  }, [code?.id, clubId]);

  if (!code) return null;

  return (
    <Modal open={!!code} onClose={onClose} title={`لاگ استفاده از کد ${code.code}`} size="md">
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : usages.length === 0 ? (
        <div className="text-center py-10">
          <UsersIcon className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">هنوز کسی از این کد استفاده نکرده</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {usages.map((u) => {
            const fullName = getUserFullName(u);
            return (
              <div key={u.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-muted/50">
                <div>
                  <p className="text-sm font-semibold text-foreground">{fullName}</p>
                  <p className="text-[10px] text-muted-foreground" dir="ltr">{u.userPhone}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-primary">{fmt(u.discountAmount)} تومان</p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(u.usedAt).toLocaleDateString("fa-IR", { timeZone: TEHRAN_TIME_ZONE })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}

function VouchersTab({ clubs }) {
  const [allCodes, setAllCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [viewingUsages, setViewingUsages] = useState(null);
  const [selectedClubId, setSelectedClubId] = useState(null);

  const fetchAll = useCallback(async () => {
    if (!clubs.length) return;
    setLoading(true);
    const results = [];
    for (const club of clubs) {
      const { ok, data } = await apiClient.get(`/club-panel/clubs/${club.id}/discount-codes`);
      if (ok) results.push(...data.map(c => ({ ...c, clubName: club.name, clubId: club.id })));
    }
    setAllCodes(results);
    setLoading(false);
  }, [clubs]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleToggle = async (code) => {
    const { ok, data } = await apiClient.patch(
      `/club-panel/clubs/${code.clubId}/discount-codes/${code.id}`,
      { isActive: !code.isActive }
    );
    if (!ok) return toast.error(data?.message ?? "خطا");
    setAllCodes(prev => prev.map(c => c.id === code.id ? { ...c, isActive: !c.isActive } : c));
    toast.success(code.isActive ? "کد غیرفعال شد" : "کد فعال شد");
  };

  const handleDelete = async (code) => {
    if (!confirm(`کد ${code.code} حذف شود؟`)) return;
    const { ok } = await apiClient.delete(`/club-panel/clubs/${code.clubId}/discount-codes/${code.id}`);
    if (!ok) return toast.error("خطا در حذف");
    setAllCodes(prev => prev.filter(c => c.id !== code.id));
    toast.success("کد تخفیف حذف شد");
  };

  const active = allCodes.filter(c => {
    if (!c.isActive) return false;
    if (c.expiresAt && new Date() > new Date(c.expiresAt)) return false;
    if (c.maxUses !== null && c.usedCount >= c.maxUses) return false;
    return true;
  });

  const viewUsagesCode = viewingUsages;

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "کدهای فعال", value: active.length, color:"text-emerald-600", bg:"bg-emerald-50 dark:bg-emerald-500/10", icon: TicketIcon },
          { label: "کل کدها", value: allCodes.length, color:"text-primary", bg:"bg-primary/10", icon: TagIcon },
          { label: "کل استفاده", value: allCodes.reduce((s,c) => s + c.usedCount, 0), color:"text-muted-foreground", bg:"bg-muted", icon: UsersIcon },
        ].map(s => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3">
            <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center shrink-0", s.bg)}>
              <s.icon className={cn("w-4 h-4", s.color)} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-xl font-black text-foreground">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-48 rounded-2xl bg-muted animate-pulse" />)}
        </div>
      ) : allCodes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <TicketIcon className="w-8 h-8 text-muted-foreground/40" />
          </div>
          <p className="font-semibold text-foreground">کد تخفیفی وجود ندارد</p>
          <p className="text-sm text-muted-foreground mt-1">اولین ووچر تخفیف خود را بسازید</p>
          <Button className="mt-4 gap-2" onClick={() => setCreateOpen(true)}>
            <PlusIcon className="w-4 h-4" />کد جدید
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {allCodes.map((code, i) => (
              <VoucherCard
                key={code.id}
                code={code}
                index={i}
                onToggle={handleToggle}
                onDelete={handleDelete}
                onViewUsages={(c) => { setViewingUsages(c); setSelectedClubId(c.clubId); }}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="ایجاد کد تخفیف جدید" size="md">
        <CreateVoucherForm
          clubs={clubs}
          onCreated={(newCode) => {
            const club = clubs.find(c => c.id === newCode.clubId);
            setAllCodes(prev => [{ ...newCode, clubName: club?.name, clubId: newCode.clubId }, ...prev]);
          }}
          onClose={() => setCreateOpen(false)}
        />
      </Modal>

      <UsagesModal
        code={viewingUsages}
        clubId={selectedClubId}
        onClose={() => { setViewingUsages(null); setSelectedClubId(null); }}
      />

      {/* FAB */}
      {allCodes.length > 0 && (
        <button
          onClick={() => setCreateOpen(true)}
          className="fixed bottom-6 left-6 h-14 w-14 rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center hover:scale-105 transition-transform z-10"
        >
          <PlusIcon className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function DiscountsPage() {
  const [mainTab, setMainTab] = useState("vouchers"); // vouchers | deals
  const [deals, setDeals] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [courts, setCourts] = useState([]);
  const [dealsLoading, setDealsLoading] = useState(true);
  const [createDealOpen, setCreateDealOpen] = useState(false);
  const [dealTab, setDealTab] = useState("active");

  useEffect(() => {
    apiClient.get("/club-panel/clubs").then(async ({ ok, data }) => {
      if (!ok) return;
      setClubs(data.clubs ?? []);
      const allCourts = [];
      for (const club of data.clubs ?? []) {
        const r = await apiClient.get(`/club-panel/clubs/${club.id}/courts`);
        if (r.ok) allCourts.push(...(r.data.courts ?? []).filter(c => c.isActive));
      }
      setCourts(allCourts);
    });
  }, []);

  const fetchDeals = useCallback(async () => {
    setDealsLoading(true);
    const param = dealTab === "active" ? "true" : dealTab === "expired" ? "false" : undefined;
    const { ok, data } = await apiClient.get("/club-panel/deals", param != null ? { active: param } : {});
    if (ok) setDeals(data.deals ?? []);
    setDealsLoading(false);
  }, [dealTab]);

  useEffect(() => { if (mainTab === "deals") fetchDeals(); }, [mainTab, dealTab]);

  const activeDeals = deals.filter(d => d.isActive && new Date(d.validUntil) > new Date());
  const expiredDeals = deals.filter(d => !d.isActive || new Date(d.validUntil) <= new Date());
  const displayDeals = dealTab === "active" ? activeDeals : dealTab === "expired" ? expiredDeals : deals;

  const handleDeleteDeal = async (id) => {
    const { ok } = await apiClient.delete(`/club-panel/deals/${id}`);
    if (!ok) return toast.error("خطا در حذف آفر");
    toast.success("آفر غیرفعال شد");
    setDeals(prev => prev.map(d => d.id === id ? { ...d, isActive: false } : d));
  };

  return (
    <div dir="rtl">
      <PageHeader
        title="تخفیف‌ها و ووچرها"
        description="مدیریت کدهای تخفیف و آفرهای محدود زمانی"
      />

      <div className="p-6 space-y-5">
        {/* Main tabs */}
        <div className="flex gap-1.5 bg-muted/50 p-1 rounded-xl w-fit">
          {[
            { v: "vouchers", l: "کدهای تخفیف", icon: TicketIcon },
            { v: "deals",    l: "آفرهای فوری",  icon: FlameIcon },
          ].map(t => (
            <button
              key={t.v}
              onClick={() => setMainTab(t.v)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                mainTab === t.v
                  ? "bg-card text-foreground shadow-sm border border-border"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <t.icon className="w-4 h-4" />
              {t.l}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {mainTab === "vouchers" && <VouchersTab clubs={clubs} />}

        {mainTab === "deals" && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex gap-1.5 bg-muted/50 p-1 rounded-xl">
                {[
                  { v: "active",  l: "فعال",           count: activeDeals.length },
                  { v: "expired", l: "پایان‌یافته",     count: expiredDeals.length },
                  { v: "all",     l: "همه",             count: deals.length },
                ].map(t => (
                  <button
                    key={t.v}
                    onClick={() => setDealTab(t.v)}
                    className={cn(
                      "flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
                      dealTab === t.v
                        ? "bg-card text-foreground shadow-sm border border-border"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {t.l}
                    <span className={cn(
                      "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                      dealTab === t.v ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    )}>{t.count}</span>
                  </button>
                ))}
              </div>
              <Button onClick={() => setCreateDealOpen(true)} className="gap-2 shadow-sm">
                <PlusIcon className="w-4 h-4" />آفر جدید
              </Button>
            </div>

            {dealsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-52 rounded-2xl bg-muted animate-pulse" />)}
              </div>
            ) : displayDeals.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                  <TagIcon className="w-8 h-8 text-muted-foreground/40" />
                </div>
                <p className="font-semibold text-foreground">آفری وجود ندارد</p>
                <p className="text-sm text-muted-foreground mt-1">اولین آفر خود را بسازید</p>
                <Button className="mt-4 gap-2" onClick={() => setCreateDealOpen(true)}>
                  <PlusIcon className="w-4 h-4" />آفر جدید
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence>
                  {displayDeals.map((deal, i) => (
                    <DealCard key={deal.id} deal={deal} onDelete={handleDeleteDeal} index={i} />
                  ))}
                </AnimatePresence>
              </div>
            )}

            <Modal open={createDealOpen} onClose={() => setCreateDealOpen(false)} title="ایجاد آفر جدید" size="md">
              <CreateDealForm
                courts={courts}
                onCreated={(deal) => setDeals(prev => [deal, ...prev])}
                onClose={() => setCreateDealOpen(false)}
              />
            </Modal>
          </div>
        )}
      </div>
    </div>
  );
}
