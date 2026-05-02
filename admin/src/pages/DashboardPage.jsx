import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  CalendarCheckIcon, ClockIcon, MapPinIcon, UsersIcon,
  TrendingUpIcon, BanknoteIcon,
} from "lucide-react";
import toast from "react-hot-toast";
import apiClient from "@/lib/apiClient";
import StatCard from "@/components/StatCard";
import PageHeader from "@/components/PageHeader";
import { fmt } from "@/lib/utils";

const PIE_COLORS = ["#10B981", "#F59E0B", "#EF4444"];

function ChartCard({ title, children, className = "" }) {
  return (
    <div className={`rounded-2xl border border-border bg-card p-5 ${className}`}>
      <h3 className="font-bold text-foreground text-sm mb-4">{title}</h3>
      {children}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2 shadow-lg text-xs">
      <p className="font-bold text-foreground mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {typeof p.value === "number" && p.name?.includes("درآمد") ? `${fmt(p.value)} ت` : p.value}</p>
      ))}
    </div>
  );
};

export default function DashboardPage() {
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { ok, data } = await apiClient.get("/admin/stats");
      if (ok) setStats(data);
      else toast.error("خطا در بارگذاری آمار");
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="p-6 space-y-6 animate-pulse">
        <div className="grid grid-cols-4 gap-4">
          {Array.from({length:4}).map((_,i) => <div key={i} className="h-24 rounded-2xl bg-muted"/>)}
        </div>
        <div className="grid grid-cols-3 gap-4">
          {Array.from({length:3}).map((_,i) => <div key={i} className="h-64 rounded-2xl bg-muted"/>)}
        </div>
      </div>
    );
  }

  const ov = stats?.overview ?? {};

  const statCards = [
    { label: "کل رزروها",      value: fmt(ov.totalBookings),  icon: CalendarCheckIcon, color:"text-blue-500",    bg:"bg-blue-500/10"    },
    { label: "در انتظار تأیید", value: fmt(ov.pendingCount),  icon: ClockIcon,         color:"text-amber-500",   bg:"bg-amber-500/10",  trend: null },
    { label: "زمین‌های فعال",  value: fmt(ov.activeCourts),  icon: MapPinIcon,         color:"text-emerald-500", bg:"bg-emerald-500/10" },
    { label: "کل کاربران",      value: fmt(ov.totalUsers),    icon: UsersIcon,          color:"text-violet-500",  bg:"bg-violet-500/10"  },
    { label: "درآمد تأیید‌شده", value: `${fmt(ov.totalRevenue)} ت`, icon: BanknoteIcon, color:"text-primary",   bg:"bg-primary/10"     },
    { label: "بازی‌های برگزار", value: fmt(ov.totalMatches),  icon: TrendingUpIcon,     color:"text-rose-500",   bg:"bg-rose-500/10"    },
  ];

  // Last 14 days for area chart
  const daily = (stats?.dailyStats ?? []).slice(-14).map(d => ({
    date: d.date.slice(5),
    رزرو: d.bookings,
    "درآمد (هزار)": Math.round(d.revenue / 1000),
  }));

  const utilization = (stats?.courtUtilization ?? []).slice(0, 6).map(c => ({
    name: c.name.length > 8 ? c.name.slice(0,8)+"…" : c.name,
    رزرو: c.bookings,
  }));

  const peaks = (stats?.peakHours ?? []).filter(h => h.count > 0).slice(0, 12).map(h => ({
    ساعت: h.hour.slice(0,2),
    تعداد: h.count,
  }));

  return (
    <div dir="rtl">
      <PageHeader
        title="داشبورد"
        description={`خلاصه وضعیت باشگاه — امروز ${new Date().toLocaleDateString("fa-IR")}`}
      />

      <div className="p-6 space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {statCards.map((c, i) => <StatCard key={c.label} {...c} index={i} />)}
        </div>

        {/* Charts row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <ChartCard title="رزروها و درآمد — ۱۴ روز اخیر" className="lg:col-span-2">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={daily} margin={{top:0,right:0,left:-20,bottom:0}}>
                <defs>
                  <linearGradient id="gradB" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2B0FD9" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#2B0FD9" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="gradR" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="date" tick={{fontSize:10}} stroke="var(--color-muted-foreground)" />
                <YAxis tick={{fontSize:10}} stroke="var(--color-muted-foreground)" />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{fontSize:11}} />
                <Area type="monotone" dataKey="رزرو" stroke="#2B0FD9" fill="url(#gradB)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="درآمد (هزار)" stroke="#10B981" fill="url(#gradR)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="وضعیت رزروها">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={stats?.statusBreakdown ?? []}
                  dataKey="count"
                  nameKey="label"
                  cx="50%" cy="50%"
                  innerRadius={50} outerRadius={80}
                  paddingAngle={3}
                >
                  {(stats?.statusBreakdown ?? []).map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{fontSize:11}} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Charts row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title="عملکرد زمین‌ها (رزرو تأیید شده)">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={utilization} margin={{top:0,right:0,left:-20,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="name" tick={{fontSize:10}} stroke="var(--color-muted-foreground)" />
                <YAxis tick={{fontSize:10}} stroke="var(--color-muted-foreground)" />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="رزرو" fill="#2B0FD9" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="ساعت‌های اوج مراجعه">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={peaks} margin={{top:0,right:0,left:-20,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="ساعت" tick={{fontSize:10}} stroke="var(--color-muted-foreground)" />
                <YAxis tick={{fontSize:10}} stroke="var(--color-muted-foreground)" />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="تعداد" fill="#10B981" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>
    </div>
  );
}
