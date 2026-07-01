import React, { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  CreditCardIcon, TrendingUpIcon, CalendarIcon,
  CheckCircle2Icon, XCircleIcon, ClockIcon, BanknoteIcon,
  SendIcon, XIcon, ArrowUpIcon, ArrowDownIcon,
} from "lucide-react";
import toast from "react-hot-toast";
import apiClient from "@/lib/apiClient";
import PageHeader from "@/components/PageHeader";
import { cn } from "@/lib/utils";

const TEHRAN_TZ = "Asia/Tehran";

function toPersianDate(iso) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("fa-IR", { timeZone: TEHRAN_TZ, year: "numeric", month: "long", day: "numeric" }).format(new Date(iso));
  } catch { return iso; }
}


function formatPrice(v, short = false) {
  if (!v && v !== 0) return "—";
  if (short && v >= 1_000_000) return `${(v / 1_000_000).toLocaleString("fa-IR", { maximumFractionDigits: 1 })} م`;
  if (short && v >= 1_000) return `${(v / 1_000).toLocaleString("fa-IR", { maximumFractionDigits: 0 })} ه`;
  return `${Number(v).toLocaleString("fa-IR")} تومان`;
}

// ─── Settlement Modal ────────────────────────────────────────────────────────

function SettlementModal({ onClose, totalAmount }) {
  const [iban, setIban] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const cleanIban = iban.replace(/\D/g, "");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (cleanIban.length !== 24) { toast.error("شماره شبا باید ۲۴ رقم باشد"); return; }
    setLoading(true);
    setTimeout(() => { setLoading(false); setSubmitted(true); }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
        className="relative bg-card border border-border rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md overflow-hidden"
      >
        {/* gradient bar */}
        <div className="h-1 w-full bg-gradient-to-l from-emerald-400 via-teal-400 to-cyan-400" />

        <div className="p-6">
          <button onClick={onClose}
            className="absolute top-5 left-5 p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors">
            <XIcon className="w-4 h-4" />
          </button>

          <AnimatePresence mode="wait">
            {!submitted ? (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                    <BanknoteIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="font-bold text-foreground">درخواست تسویه حساب</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">مبلغ قابل تسویه: <span className="text-emerald-600 font-semibold">{formatPrice(totalAmount)}</span></p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-2">شماره شبا حساب مقصد</label>
                    <div className="relative">
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-black text-emerald-600 select-none">IR</span>
                      <input
                        type="text" inputMode="numeric" maxLength={24}
                        value={iban} onChange={(e) => setIban(e.target.value.replace(/\D/g, ""))}
                        placeholder="000000000000000000000000"
                        dir="ltr"
                        className="w-full pr-10 pl-3 py-3 rounded-xl border border-border bg-muted/40 text-sm font-mono tracking-widest placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40 transition-all"
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      <p className="text-[10px] text-muted-foreground">{cleanIban.length}/۲۴ رقم</p>
                      <div className="flex gap-0.5">
                        {Array.from({ length: 24 }).map((_, i) => (
                          <div key={i} className={cn("h-0.5 w-1.5 rounded-full transition-colors", i < cleanIban.length ? "bg-emerald-500" : "bg-border")} />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl bg-amber-500/8 border border-amber-500/20 px-3.5 py-3 flex items-start gap-2.5">
                    <ClockIcon className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                      مبلغ تسویه پس از بررسی ظرف <span className="font-bold">۲۴ ساعت</span> کاری به حساب شما واریز خواهد شد.
                    </p>
                  </div>

                  <button type="submit" disabled={loading || cleanIban.length !== 24}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-l from-emerald-600 to-teal-600 text-white text-sm font-bold hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none">
                    {loading
                      ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      : <SendIcon className="w-4 h-4" />}
                    ثبت درخواست تسویه
                  </button>
                </form>
              </motion.div>
            ) : (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center text-center gap-4 py-6">
                <div className="relative">
                  <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-xl shadow-emerald-500/30">
                    <CheckCircle2Icon className="w-10 h-10 text-white" />
                  </div>
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring" }}
                    className="absolute -top-1.5 -right-1.5 h-6 w-6 bg-emerald-500 rounded-full flex items-center justify-center">
                    <CheckCircle2Icon className="w-3.5 h-3.5 text-white" />
                  </motion.div>
                </div>
                <div>
                  <h3 className="font-black text-foreground text-lg">درخواست ثبت شد ✅</h3>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-xs">
                    مبلغ <span className="font-bold text-emerald-600">{formatPrice(totalAmount)}</span> تا <span className="font-bold text-foreground">۲۴ ساعت آینده</span> به شماره شبا
                    <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded mx-1">IR{cleanIban}</span>
                    واریز می‌شود.
                  </p>
                </div>
                <button onClick={onClose}
                  className="mt-1 px-8 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity">
                  متوجه شدم
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Custom Pie Tooltip ──────────────────────────────────────────────────────

function PieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-foreground">{payload[0].name}</p>
      <p className="text-muted-foreground">{formatPrice(payload[0].value)}</p>
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

export default function PaymentsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    apiClient.get("/club-panel/online-payments").then(({ ok, data: d }) => {
      if (ok) setData(d);
      else toast.error("خطا در دریافت اطلاعات پرداخت‌ها");
      setLoading(false);
    });
  }, []);

  const payments = data?.payments ?? [];
  const summary = data?.summary ?? {};

  const filtered = useMemo(() => payments.filter((p) => {
    if (filter === "all") return true;
    const d = new Date(p.createdAt);
    const now = new Date();
    if (filter === "this_month") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    if (filter === "last_month") {
      const lm = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
      const ly = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      return d.getMonth() === lm && d.getFullYear() === ly;
    }
    return true;
  }), [payments, filter]);

  // Pie: top courts by revenue
  const courtPieData = useMemo(() => {
    const map = {};
    payments.forEach((p) => {
      const k = p.courtName || "سایر";
      map[k] = (map[k] || 0) + (p.totalPrice ?? 0);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [payments]);

  const growth = summary.lastMonth > 0
    ? Math.round(((summary.thisMonth - summary.lastMonth) / summary.lastMonth) * 100)
    : null;

  const PIE_COLORS = ["#10b981", "#6366f1", "#f59e0b", "#3b82f6", "#ec4899"];

  return (
    <div dir="rtl" className="min-h-screen bg-background">
      <PageHeader
        title="پرداخت‌های آنلاین"
        description="درآمد آنلاین رزروهای تأیید‌شده باشگاه"
        actions={
          <button onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-l from-emerald-600 to-teal-600 text-white text-sm font-bold hover:from-emerald-700 hover:to-teal-700 transition-all shadow-md shadow-emerald-500/20">
            <BanknoteIcon className="w-4 h-4" />
            درخواست تسویه حساب
          </button>
        }
      />

      <div className="p-4 md:p-6 space-y-5 max-w-6xl mx-auto">

        {/* KPI Cards */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card h-24 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {
                label: "درآمد این ماه", value: formatPrice(summary.thisMonth),
                sub: `${(summary.thisMonthCount ?? 0).toLocaleString("fa-IR")} تراکنش`,
                icon: CalendarIcon, color: "text-violet-600", bg: "from-violet-500/20 to-violet-500/5", border: "border-violet-500/20",
                badge: growth !== null ? { up: growth >= 0, text: `${Math.abs(growth)}٪` } : null,
              },
              {
                label: "ماه گذشته", value: formatPrice(summary.lastMonth),
                icon: TrendingUpIcon, color: "text-blue-600", bg: "from-blue-500/20 to-blue-500/5", border: "border-blue-500/20",
              },
              {
                label: "کل درآمد تأیید‌شده", value: formatPrice(summary.allTime),
                sub: `${(summary.count ?? 0).toLocaleString("fa-IR")} تراکنش`,
                icon: BanknoteIcon, color: "text-emerald-600", bg: "from-emerald-500/20 to-emerald-500/5", border: "border-emerald-500/20",
              },
              {
                label: "میانگین هر تراکنش",
                value: summary.count ? formatPrice(Math.round(summary.allTime / summary.count)) : "—",
                icon: CreditCardIcon, color: "text-amber-600", bg: "from-amber-500/20 to-amber-500/5", border: "border-amber-500/20",
              },
            ].map((card, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                className={cn("rounded-2xl border bg-gradient-to-br p-4 flex flex-col gap-2 relative overflow-hidden", card.border, card.bg)}>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">{card.label}</p>
                  <card.icon className={cn("w-4 h-4", card.color)} />
                </div>
                <p className="text-xl font-black text-foreground leading-tight">{card.value}</p>
                <div className="flex items-center gap-2">
                  {card.sub && <p className="text-[10px] text-muted-foreground">{card.sub}</p>}
                  {card.badge && (
                    <span className={cn("inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                      card.badge.up ? "bg-emerald-500/15 text-emerald-600" : "bg-red-500/15 text-red-500")}>
                      {card.badge.up ? <ArrowUpIcon className="w-2.5 h-2.5" /> : <ArrowDownIcon className="w-2.5 h-2.5" />}
                      {card.badge.text}
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Charts Row */}
        {!loading && payments.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* Pie Chart — by court */}
            <div className="lg:col-span-1 rounded-2xl border border-border bg-card p-5">
              <div className="mb-4">
                <h3 className="font-bold text-foreground text-sm">درآمد به تفکیک زمین</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">سهم هر زمین از کل درآمد</p>
              </div>
              {courtPieData.length === 0 ? (
                <div className="h-40 flex items-center justify-center text-xs text-muted-foreground">داده‌ای موجود نیست</div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={150}>
                    <PieChart>
                      <Pie data={courtPieData} cx="50%" cy="50%" innerRadius={42} outerRadius={68}
                        dataKey="value" paddingAngle={3} strokeWidth={0}>
                        {courtPieData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<PieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-3 space-y-1.5">
                    {courtPieData.map((d, i) => {
                      const pct = summary.allTime > 0 ? Math.round((d.value / summary.allTime) * 100) : 0;
                      return (
                        <div key={i} className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                          <p className="text-[10px] text-muted-foreground truncate flex-1">{d.name}</p>
                          <span className="text-[10px] font-bold text-foreground">{pct}٪</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}

        {/* Filter + Table */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="rounded-2xl border border-border bg-card overflow-hidden">

          <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
            <span className="text-sm font-bold text-foreground flex-1">لیست تراکنش‌ها</span>
            {[
              { key: "all", label: "همه" },
              { key: "this_month", label: "این ماه" },
              { key: "last_month", label: "ماه گذشته" },
            ].map((f) => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                className={cn("px-3 py-1 rounded-lg text-xs font-medium transition-colors",
                  filter === f.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground")}>
                {f.label}
              </button>
            ))}
            <span className="text-xs text-muted-foreground">({filtered.length.toLocaleString("fa-IR")})</span>
          </div>

          {loading ? (
            <div className="p-10 flex items-center justify-center">
              <span className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-16 flex flex-col items-center gap-3 text-center">
              <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center">
                <CreditCardIcon className="w-7 h-7 text-muted-foreground/40" />
              </div>
              <p className="text-sm text-muted-foreground">هیچ تراکنش تأیید‌شده‌ای یافت نشد</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/30">
                    <th className="text-right px-4 py-3 text-[11px] font-semibold text-muted-foreground">#</th>
                    <th className="text-right px-4 py-3 text-[11px] font-semibold text-muted-foreground">کد پیگیری</th>
                    <th className="text-right px-4 py-3 text-[11px] font-semibold text-muted-foreground">مشتری</th>
                    <th className="text-right px-4 py-3 text-[11px] font-semibold text-muted-foreground">زمین</th>
                    <th className="text-right px-4 py-3 text-[11px] font-semibold text-muted-foreground">تاریخ رزرو</th>
                    <th className="text-right px-4 py-3 text-[11px] font-semibold text-muted-foreground">مبلغ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((p, i) => (
                    <motion.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i * 0.015, 0.3) }}
                      className="hover:bg-muted/20 transition-colors group">
                      <td className="px-4 py-3 text-xs text-muted-foreground/60">{(i + 1).toLocaleString("fa-IR")}</td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-[11px] bg-muted px-2 py-0.5 rounded-md text-muted-foreground">{p.trackingCode}</span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground text-xs">{p.userName || "—"}</p>
                        <p className="text-[10px] text-muted-foreground" dir="ltr">{p.userPhone}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs text-foreground font-medium">{p.courtName}</p>
                        <p className="text-[10px] text-muted-foreground">{p.clubName}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        <p>{toPersianDate(p.date)}</p>
                        <p className="text-[10px]">{p.startTime} – {p.endTime}</p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded-lg">
                          {formatPrice(p.totalPrice)}
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </div>

      <AnimatePresence>
        {showModal && <SettlementModal onClose={() => setShowModal(false)} totalAmount={summary.allTime} />}
      </AnimatePresence>
    </div>
  );
}
