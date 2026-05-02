import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PlusIcon, Trash2Icon, FlameIcon, ClockIcon, TagIcon, CheckCircleIcon } from "lucide-react";
import toast from "react-hot-toast";
import apiClient from "@/lib/apiClient";
import PageHeader from "@/components/PageHeader";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { fmt } from "@/lib/utils";
import { cn } from "@/lib/utils";

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

function CountdownPill({ validUntil, compact = false }) {
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

// ─── Sport icons ──────────────────────────────────────────────────────────────
const SPORT_ICONS = { padel:"🏓", tennis:"🎾", squash:"🟡", badminton:"🏸", "ping-pong":"🏓" };

// ─── Discount card ────────────────────────────────────────────────────────────
function DiscountCard({ deal, onDelete, index }) {
  const { expired } = useCountdown(deal.validUntil);
  const discountedPrice = Math.round(deal.court.pricePerHour * (1 - deal.discountPercent / 100));

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
      {/* Header strip */}
      <div className={cn(
        "px-4 py-2.5 flex items-center justify-between",
        expired || !deal.isActive
          ? "bg-muted"
          : "bg-gradient-to-r from-red-500 to-orange-500"
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
        {/* Court info */}
        <div className="flex items-start gap-3 mb-3">
          <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center text-xl shrink-0">
            {SPORT_ICONS[deal.court.sportType] ?? "🏅"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-foreground text-sm truncate">{deal.court.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{deal.court.location}</p>
          </div>
        </div>

        {/* Slot */}
        <div className="bg-muted/60 rounded-xl px-3 py-2 mb-3 flex items-center gap-2 text-xs text-muted-foreground">
          <ClockIcon className="w-3.5 h-3.5 shrink-0" />
          <span>{deal.slotDate} — {deal.slotStart} تا {deal.slotEnd}</span>
        </div>

        {/* Price */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs text-muted-foreground line-through">{fmt(deal.court.pricePerHour)} تومان</p>
            <p className="text-lg font-black text-primary">{fmt(discountedPrice)} <span className="text-xs font-medium text-muted-foreground">تومان</span></p>
          </div>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDelete(deal.id)}
            className="text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
          >
            <Trash2Icon className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Create form ──────────────────────────────────────────────────────────────
function CreateDealForm({ courts, onCreated, onClose }) {
  const [form, setForm] = useState({
    courtId: "", slotDate: "", slotStart: "09:00", slotEnd: "10:00",
    discountPercent: "20", validUntil: "",
  });
  const [saving, setSaving] = useState(false);
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const { ok, data } = await apiClient.post("/admin/deals", {
      ...form,
      discountPercent: parseInt(form.discountPercent),
    });
    setSaving(false);
    if (!ok) return toast.error(data?.message ?? "خطا در ایجاد آفر");
    toast.success("آفر با موفقیت ایجاد شد 🔥");
    onCreated(data.deal);
    onClose();
  };

  const selectedCourt = courts.find(c => c.id === form.courtId);
  const preview = selectedCourt
    ? Math.round(selectedCourt.pricePerHour * (1 - parseInt(form.discountPercent || 0) / 100))
    : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Court selector */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-muted-foreground">زمین</label>
        <select
          value={form.courtId}
          onChange={e => f("courtId", e.target.value)}
          required
          className="h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
        >
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
          <input type="date" value={form.slotDate} onChange={e => f("slotDate", e.target.value)} required
            className="h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30" />
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

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-muted-foreground">ساعت شروع اسلات</label>
          <input type="time" value={form.slotStart} onChange={e => f("slotStart", e.target.value)} required
            className="h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-muted-foreground">ساعت پایان اسلات</label>
          <input type="time" value={form.slotEnd} onChange={e => f("slotEnd", e.target.value)} required
            className="h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30" />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-muted-foreground">تاریخ و ساعت انقضای آفر</label>
        <input type="datetime-local" value={form.validUntil} onChange={e => f("validUntil", e.target.value)} required
          className="h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30" />
      </div>

      {/* Preview */}
      {selectedCourt && form.discountPercent && (
        <div className="rounded-xl bg-primary/5 border border-primary/15 p-3 flex items-center justify-between">
          <div className="text-xs text-muted-foreground">قیمت پس از تخفیف:</div>
          <div className="flex items-center gap-2">
            <span className="text-xs line-through text-muted-foreground">{fmt(selectedCourt.pricePerHour)}</span>
            <span className="font-black text-primary">{fmt(preview)} تومان</span>
          </div>
        </div>
      )}

      <Button type="submit" disabled={saving} className="w-full gap-2">
        <FlameIcon className="w-4 h-4" />
        {saving ? "در حال ایجاد..." : "ایجاد آفر و اطلاع‌رسانی به کاربران"}
      </Button>
    </form>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function DiscountsPage() {
  const [deals, setDeals]     = useState([]);
  const [courts, setCourts]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [tab, setTab]         = useState("active"); // active | expired | all

  const fetchDeals = useCallback(async () => {
    setLoading(true);
    const param = tab === "active" ? "true" : tab === "expired" ? "false" : undefined;
    const { ok, data } = await apiClient.get("/admin/deals", param != null ? { active: param } : {});
    if (ok) setDeals(data.deals);
    else toast.error("خطا در بارگذاری تخفیف‌ها");
    setLoading(false);
  }, [tab]);

  useEffect(() => { fetchDeals(); }, [tab]);

  useEffect(() => {
    apiClient.get("/admin/courts").then(({ ok, data }) => {
      if (ok) setCourts(data.courts.filter(c => c.isActive));
    });
  }, []);

  const handleDelete = async (id) => {
    const { ok } = await apiClient.delete(`/admin/deals/${id}`);
    if (!ok) return toast.error("خطا در حذف آفر");
    toast.success("آفر غیرفعال شد");
    setDeals(prev => prev.filter(d => d.id !== id));
  };

  const handleCreated = (deal) => {
    setDeals(prev => [deal, ...prev]);
  };

  const active  = deals.filter(d => d.isActive && new Date(d.validUntil) > new Date());
  const expired = deals.filter(d => !d.isActive || new Date(d.validUntil) <= new Date());
  const display = tab === "active" ? active : tab === "expired" ? expired : deals;

  return (
    <div dir="rtl">
      <PageHeader
        title="مدیریت تخفیف‌ها"
        description="آفرهای محدود — ابزار بازاریابی و افزایش رزرو"
        badge={active.length > 0 ? `${active.length} فعال` : undefined}
        actions={
          <Button onClick={() => setCreateOpen(true)} className="gap-2 shadow-sm">
            <PlusIcon className="w-4 h-4" />
            آفر جدید
          </Button>
        }
      />

      <div className="p-6 space-y-5">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "آفرهای فعال",  value: active.length,  color:"text-red-500",     bg:"bg-red-50 dark:bg-red-500/10",     icon: FlameIcon },
            { label: "کل آفرها",     value: deals.length,   color:"text-primary",     bg:"bg-primary/10",                    icon: TagIcon },
            { label: "آفرهای پایان‌یافته", value: expired.length, color:"text-muted-foreground", bg:"bg-muted",             icon: CheckCircleIcon },
          ].map((s, i) => (
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

        {/* Tabs */}
        <div className="flex gap-1.5 bg-muted/50 p-1 rounded-xl w-fit">
          {[
            { v:"active",  l:"فعال",         count: active.length },
            { v:"expired", l:"پایان‌یافته",  count: expired.length },
            { v:"all",     l:"همه",           count: deals.length },
          ].map(t => (
            <button
              key={t.v}
              onClick={() => setTab(t.v)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
                tab === t.v
                  ? "bg-card text-foreground shadow-sm border border-border"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t.l}
              <span className={cn(
                "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                tab === t.v ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
              )}>{t.count}</span>
            </button>
          ))}
        </div>

        {/* Cards grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({length:6}).map((_,i) => <div key={i} className="h-52 rounded-2xl bg-muted animate-pulse" />)}
          </div>
        ) : display.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <TagIcon className="w-8 h-8 text-muted-foreground/40" />
            </div>
            <p className="font-semibold text-foreground">آفری وجود ندارد</p>
            <p className="text-sm text-muted-foreground mt-1">اولین آفر خود را بسازید و به کاربران اطلاع دهید</p>
            <Button className="mt-4 gap-2" onClick={() => setCreateOpen(true)}>
              <PlusIcon className="w-4 h-4" />آفر جدید
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {display.map((deal, i) => (
                <DiscountCard key={deal.id} deal={deal} onDelete={handleDelete} index={i} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="ایجاد آفر جدید" size="md">
        <CreateDealForm courts={courts} onCreated={handleCreated} onClose={() => setCreateOpen(false)} />
      </Modal>
    </div>
  );
}
