import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  CalendarCheckIcon, ClockIcon, MapPinIcon, UsersIcon,
  BanknoteIcon, Building2Icon, TrendingUpIcon, CheckCircle2Icon,
  XCircleIcon, AlertCircleIcon, RefreshCwIcon, ActivityIcon, CreditCardIcon,
} from "lucide-react";
import toast from "react-hot-toast";
import apiClient from "@/lib/apiClient";
import PageHeader from "@/components/PageHeader";
import ErrorState from "@/components/ui/ErrorState";
import { fmt, cn } from "@/lib/utils";

const TEHRAN_TIME_ZONE = "Asia/Tehran";

const PIE_COLORS = ["#10B981", "#F59E0B", "#EF4444"];
const STATUS_MAP = {
  approved:  { label: "تأیید شده",  color: "text-emerald-600", bg: "bg-emerald-500/10", icon: CheckCircle2Icon },
  pending:   { label: "در انتظار",  color: "text-amber-600",   bg: "bg-amber-500/10",   icon: AlertCircleIcon  },
  rejected:  { label: "رد شده",     color: "text-red-500",     bg: "bg-red-500/10",     icon: XCircleIcon      },
  cancelled: { label: "لغو شده",    color: "text-red-500",     bg: "bg-red-500/10",     icon: XCircleIcon      },
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function shortDate(dateStr) {
  if (!dateStr) return "";
  // YYYY-MM-DD → MM/DD
  return dateStr.slice(5).replace("-", "/");
}

// ─── sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon: Icon, color, bg, index = 0, onClick }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onClick}
      className={cn(
        "rounded-2xl border border-border bg-card p-4 flex items-start gap-3",
        onClick && "cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all"
      )}
    >
      <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", bg)}>
        <Icon className={cn("w-5 h-5", color)} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <p className="text-xl font-black text-foreground leading-tight">{value}</p>
        {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </motion.div>
  );
}

function ChartCard({ title, subtitle, children, className = "" }) {
  return (
    <div className={cn("rounded-2xl border border-border bg-card p-5", className)}>
      <div className="mb-4">
        <h3 className="font-bold text-foreground text-sm">{title}</h3>
        {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function InsightCard({ label, value, sub, tone = "violet" }) {
  const tones = {
    violet: "from-violet-600/15 to-indigo-500/10 border-violet-500/20 text-violet-600",
    emerald: "from-emerald-500/15 to-teal-500/10 border-emerald-500/20 text-emerald-600",
    amber: "from-amber-500/15 to-orange-500/10 border-amber-500/20 text-amber-600",
    blue: "from-blue-500/15 to-cyan-500/10 border-blue-500/20 text-blue-600",
  };
  return (
    <div className={cn("rounded-2xl border bg-gradient-to-br p-4", tones[tone])}>
      <p className="text-xs font-semibold opacity-80">{label}</p>
      <p className="mt-2 text-2xl font-black text-foreground">{value}</p>
      {sub && <p className="mt-1 text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2 shadow-lg text-xs">
      <p className="font-bold text-foreground mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: {p.name?.includes("درآمد") ? `${fmt(p.value * 1000)} ت` : p.value}
        </p>
      ))}
    </div>
  );
};

function EmptyChart({ message = "داده‌ای وجود ندارد" }) {
  return (
    <div className="flex flex-col items-center justify-center h-40 text-muted-foreground/40">
      <TrendingUpIcon className="w-8 h-8 mb-2" />
      <p className="text-xs">{message}</p>
    </div>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const navigate = useNavigate();
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]   = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  async function loadDashboard({ silent = false } = {}) {
    if (silent) setRefreshing(true);
    else { setLoading(true); setError(false); }
    const res = await apiClient.get("/club-panel/stats");
    if (res.ok) {
      setData(res.data);
      setLastUpdated(new Date());
      if (silent) toast.success("دیتای داشبورد بروزرسانی شد");
    } else {
      if (silent) toast.error("خطا در بارگذاری آمار");
      else setError(true);
    }
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => { loadDashboard(); }, []);

  if (loading) {
    return (
      <div className="p-3 sm:p-6 space-y-6 animate-pulse">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-20 rounded-2xl bg-muted" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-64 rounded-2xl bg-muted" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        message="آمار داشبورد بارگذاری نشد"
        onRetry={() => loadDashboard()}
      />
    );
  }

  const s = data?.stats ?? {};
  const approvalRate = s.totalBookings ? Math.round((s.approvedBookings / s.totalBookings) * 100) : 0;
  const pendingRate = s.totalBookings ? Math.round((s.pendingBookings / s.totalBookings) * 100) : 0;
  const avgRevenue = s.approvedBookings ? Math.round(s.totalRevenue / s.approvedBookings) : 0;
  const topCourt = (data?.courtUtilization ?? [])[0];
  const busiestHour = (data?.peakHours ?? []).reduce((best, item) => item.count > (best?.count ?? -1) ? item : best, null);

  // ── stat cards ──────────────────────────────────────────────────────────
  const statCards = [
    {
      label: "درآمد این ماه",
      value: `${fmt(s.thisMonthRevenue ?? 0)} ت`,
      sub: `میانگین هر رزرو: ${fmt(avgRevenue)} تومان`,
      icon: BanknoteIcon,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "رزروهای این ماه",
      value: fmt(s.thisMonthBookings ?? 0),
      sub: `کل رزروها: ${fmt(s.totalBookings ?? 0)}`,
      icon: CalendarCheckIcon,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      label: "در انتظار تأیید",
      value: fmt(s.pendingBookings ?? 0),
      sub: `${fmt(s.approvedBookings ?? 0)} تأیید شده`,
      icon: ClockIcon,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
    {
      label: "کاربران یکتا",
      value: fmt(s.uniqueUsers ?? 0),
      sub: "مشتریان باشگاه — کلیک برای مشاهده",
      icon: UsersIcon,
      color: "text-violet-500",
      bg: "bg-violet-500/10",
      onClick: () => navigate("/customers"),
    },
    {
      label: "باشگاه‌ها",
      value: fmt(s.totalClubs ?? 0),
      sub: "باشگاه‌های این اکانت",
      icon: Building2Icon,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      label: "زمین‌های فعال",
      value: fmt(s.activeCourts ?? 0),
      sub: `از ${fmt(s.totalCourts ?? 0)} زمین`,
      icon: MapPinIcon,
      color: "text-cyan-500",
      bg: "bg-cyan-500/10",
    },
    {
      label: "رزروهای تأیید شده",
      value: fmt(s.approvedBookings ?? 0),
      sub: `${s.totalBookings ? Math.round((s.approvedBookings / s.totalBookings) * 100) : 0}٪ از کل`,
      icon: CheckCircle2Icon,
      color: "text-emerald-600",
      bg: "bg-emerald-500/10",
    },
    {
      label: "لغو / رد شده",
      value: fmt(s.cancelledBookings ?? 0),
      sub: `${s.totalBookings ? Math.round((s.cancelledBookings / s.totalBookings) * 100) : 0}٪ از کل`,
      icon: XCircleIcon,
      color: "text-red-500",
      bg: "bg-red-500/10",
    },
  ];

  // ── chart data ──────────────────────────────────────────────────────────
  const dailyData = (data?.dailyStats ?? []).slice(-14).map(d => ({
    date: shortDate(d.date),
    رزرو: d.bookings,
    "درآمد (هزار)": Math.round(d.revenue / 1000),
  }));

  const hasDaily = dailyData.some(d => d["رزرو"] > 0);

  const utilizationData = (data?.courtUtilization ?? []).slice(0, 8).map(c => ({
    name: c.name.length > 10 ? c.name.slice(0, 10) + "…" : c.name,
    رزرو: c.bookings,
  }));

  const hasUtilization = utilizationData.some(d => d["رزرو"] > 0);

  const peakData = (data?.peakHours ?? []).map(h => ({
    ساعت: h.hour.slice(0, 2),
    تعداد: h.count,
  }));

  const hasPeak = peakData.some(d => d["تعداد"] > 0);

  const pieData = [
    { label: "تأیید شده",  count: s.approvedBookings  ?? 0 },
    { label: "در انتظار",  count: s.pendingBookings   ?? 0 },
    { label: "لغو/رد شده", count: s.cancelledBookings ?? 0 },
  ].filter(d => d.count > 0);
  const recentBookings = data?.recentBookings ?? [];

  return (
    <div dir="rtl">
      <PageHeader
        title="داشبورد"
        description={lastUpdated
          ? `آخرین بروزرسانی: ${lastUpdated.toLocaleTimeString("fa-IR", { timeZone: TEHRAN_TIME_ZONE, hour: "2-digit", minute: "2-digit" })}`
          : `امروز ${new Date().toLocaleDateString("fa-IR", { timeZone: TEHRAN_TIME_ZONE, weekday: "long", year: "numeric", month: "long", day: "numeric" })}`}
        actions={
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Link
              to="/payments"
              className="inline-flex flex-1 sm:flex-none justify-center items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition-all hover:bg-emerald-700 hover:shadow-md"
            >
              <CreditCardIcon className="h-4 w-4" />
              تسویه حساب
            </Link>
            <button
              type="button"
              onClick={() => loadDashboard({ silent: true })}
              disabled={refreshing}
              className="inline-flex flex-1 sm:flex-none justify-center items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-sm transition-all hover:shadow-md disabled:opacity-60"
            >
              <RefreshCwIcon className={cn("h-4 w-4", refreshing && "animate-spin")} />
              {refreshing ? "در حال بروزرسانی..." : "بروزرسانی"}
            </button>
          </div>
        }
      />

      <div className="p-3 sm:p-6 space-y-6">

        <div className="rounded-3xl border border-primary/15 bg-gradient-to-br from-primary/10 via-violet-500/5 to-transparent p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                <ActivityIcon className="h-3.5 w-3.5" />
                نمای زنده عملکرد پلتفرم
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-foreground">وضعیت امروز رکت‌زون</h2>
              <p className="mt-1 text-sm text-muted-foreground">رزروها، درآمد، کاربران و ظرفیت عملیاتی را یکجا ببین.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:w-[520px]">
              <InsightCard label="نرخ تایید رزرو" value={`${approvalRate}٪`} sub={`${fmt(s.approvedBookings)} از ${fmt(s.totalBookings)} رزرو`} tone="emerald" />
              <InsightCard label="در انتظار اقدام" value={`${fmt(s.pendingBookings)}`} sub={`${pendingRate}٪ از کل رزروها`} tone="amber" />
              <InsightCard label="شلوغ‌ترین ساعت" value={busiestHour?.count ? busiestHour.hour : "—"} sub={busiestHour?.count ? `${fmt(busiestHour.count)} رزرو` : "داده کافی نیست"} tone="blue" />
              <InsightCard label="زمین محبوب" value={topCourt?.name ?? "—"} sub={topCourt ? `${fmt(topCourt.bookings)} رزرو تایید شده` : "داده کافی نیست"} tone="violet" />
            </div>
          </div>
        </div>

        {/* ── stat cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {statCards.map((c, i) => <StatCard key={c.label} {...c} index={i} onClick={c.onClick} />)}
        </div>

        {/* ── daily area chart + pie ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <ChartCard
            title="روند رزرو و درآمد"
            subtitle="۱۴ روز اخیر"
            className="lg:col-span-2"
          >
            {hasDaily ? (
              <ResponsiveContainer width="100%" height={210}>
                <AreaChart data={dailyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradB" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2B0FD9" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#2B0FD9" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradR" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="var(--color-muted-foreground)" />
                  <YAxis tick={{ fontSize: 10 }} stroke="var(--color-muted-foreground)" />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="رزرو" stroke="#2B0FD9" fill="url(#gradB)" strokeWidth={2} dot={false} />
                  <Area type="monotone" dataKey="درآمد (هزار)" stroke="#10B981" fill="url(#gradR)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart message="هنوز رزروی ثبت نشده" />
            )}
          </ChartCard>

          <ChartCard title="توزیع وضعیت رزروها" subtitle="کل دوره">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={210}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="count"
                    nameKey="label"
                    cx="50%" cy="45%"
                    innerRadius={55} outerRadius={85}
                    paddingAngle={3}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart message="هنوز رزروی ثبت نشده" />
            )}
          </ChartCard>
        </div>

        {/* ── utilization + peak hours ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title="عملکرد زمین‌ها" subtitle="رزرو تأیید‌شده به تفکیک زمین">
            {hasUtilization ? (
              <ResponsiveContainer width="100%" height={190}>
                <BarChart data={utilizationData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="var(--color-muted-foreground)" />
                  <YAxis tick={{ fontSize: 10 }} stroke="var(--color-muted-foreground)" />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="رزرو" fill="#2B0FD9" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart message="هنوز رزرو تأیید‌شده‌ای وجود ندارد" />
            )}
          </ChartCard>

          <ChartCard title="ساعت‌های اوج مراجعه" subtitle="بر اساس رزروهای تأیید شده">
            {hasPeak ? (
              <ResponsiveContainer width="100%" height={190}>
                <BarChart data={peakData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="ساعت" tick={{ fontSize: 10 }} stroke="var(--color-muted-foreground)" />
                  <YAxis tick={{ fontSize: 10 }} stroke="var(--color-muted-foreground)" />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="تعداد" radius={[4, 4, 0, 0]}
                    fill="#F59E0B"
                    label={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart message="هنوز رزرو تأیید‌شده‌ای وجود ندارد" />
            )}
          </ChartCard>
        </div>

        {recentBookings.length > 0 && (
          <ChartCard title="آخرین رزروها" subtitle="۵ رزرو اخیر همین اکانت">
            <div className="space-y-2">
              {recentBookings.map((b, i) => {
                const cfg = STATUS_MAP[b.status] ?? STATUS_MAP.pending;
                const Icon = cfg.icon;
                return (
                  <motion.div
                    key={b.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-muted/40 hover:bg-muted/70 transition-colors"
                  >
                    <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0", cfg.bg)}>
                      <Icon className={cn("w-4 h-4", cfg.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{b.courtName}</p>
                      <p className="text-xs text-muted-foreground" dir="ltr">{b.date} — {b.startTime}</p>
                    </div>
                    <div className="text-left shrink-0">
                      <p className="text-sm font-bold text-foreground">{fmt(b.totalPrice)} ت</p>
                      <p className={cn("text-[10px] font-semibold", cfg.color)}>{cfg.label}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </ChartCard>
        )}

      </div>
    </div>
  );
}
