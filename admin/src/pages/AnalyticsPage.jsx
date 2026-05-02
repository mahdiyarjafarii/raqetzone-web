import React, { useEffect, useState } from "react";
import {
  ComposedChart, Line, Bar, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PieChart, Pie, Cell,
} from "recharts";
import { TrendingUpIcon, BanknoteIcon, CalendarCheckIcon, MapPinIcon } from "lucide-react";
import toast from "react-hot-toast";
import apiClient from "@/lib/apiClient";
import PageHeader from "@/components/PageHeader";
import { fmt } from "@/lib/utils";
import { cn } from "@/lib/utils";

const COLORS = ["#2B0FD9","#10B981","#F59E0B","#EF4444","#8B5CF6","#EC4899"];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2.5 shadow-xl text-xs space-y-1">
      <p className="font-bold text-foreground mb-1">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{background:p.color}} />
          <span style={{color:p.color}}>{p.name}: <strong>{typeof p.value === "number" && String(p.name).includes("درآمد") ? `${fmt(p.value)}ت` : p.value}</strong></span>
        </div>
      ))}
    </div>
  );
};

function ChartCard({ title, subtitle, children, className="" }) {
  return (
    <div className={cn("rounded-2xl border border-border bg-card p-5", className)}>
      <div className="mb-4">
        <h3 className="font-bold text-foreground text-sm">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState(null);
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
      <div className="p-6 grid grid-cols-2 gap-4 animate-pulse">
        {Array.from({length:6}).map((_,i) => <div key={i} className="h-64 rounded-2xl bg-muted" />)}
      </div>
    );
  }

  const ov = stats?.overview ?? {};

  // Full 30-day data
  const daily30 = (stats?.dailyStats ?? []).map(d => ({
    تاریخ: d.date.slice(5),
    "رزرو": d.bookings,
    "درآمد (هزار)": Math.round(d.revenue / 1000),
  }));

  // Weekly aggregates (group by 7 days)
  const weekly = [];
  const days = stats?.dailyStats ?? [];
  for (let i = 0; i < days.length; i += 7) {
    const chunk = days.slice(i, i+7);
    const label = `هفته ${Math.floor(i/7)+1}`;
    weekly.push({
      هفته: label,
      رزرو: chunk.reduce((s,d) => s + d.bookings, 0),
      "درآمد (هزار)": Math.round(chunk.reduce((s,d) => s + d.revenue, 0) / 1000),
    });
  }

  // Court radar
  const radarData = (stats?.courtUtilization ?? []).slice(0, 7).map(c => ({
    زمین: c.name.length > 6 ? c.name.slice(0,6)+"…" : c.name,
    رزرو: c.bookings,
  }));

  // Peak hours (all 24)
  const peakData = (stats?.peakHours ?? []).map(h => ({
    ساعت: h.hour.slice(0,2),
    تعداد: h.count,
  }));

  const kpis = [
    { label: "کل درآمد تأیید‌شده", value: `${fmt(ov.totalRevenue)} ت`, icon: BanknoteIcon, color:"text-emerald-500", bg:"bg-emerald-500/10" },
    { label: "نرخ تأیید",          value: ov.totalBookings > 0 ? `${Math.round((ov.approvedCount/ov.totalBookings)*100)}%` : "—", icon: TrendingUpIcon, color:"text-primary", bg:"bg-primary/10" },
    { label: "میانگین رزرو/روز",   value: (stats?.dailyStats ?? []).length > 0 ? fmt(Math.round(ov.totalBookings / (stats.dailyStats.length || 1))) : "—", icon: CalendarCheckIcon, color:"text-amber-500", bg:"bg-amber-500/10" },
    { label: "پرکاربردترین زمین",  value: (stats?.courtUtilization ?? [])[0]?.name ?? "—", icon: MapPinIcon, color:"text-violet-500", bg:"bg-violet-500/10" },
  ];

  return (
    <div dir="rtl">
      <PageHeader title="آنالیتیکس" description="تحلیل کامل عملکرد باشگاه" />

      <div className="p-6 space-y-5">
        {/* KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((k, i) => (
            <div key={k.label} className="rounded-2xl border border-border bg-card p-4 flex items-start gap-3">
              <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", k.bg)}>
                <k.icon className={cn("w-5 h-5", k.color)} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{k.label}</p>
                <p className="font-black text-foreground text-lg leading-tight mt-0.5">{k.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* 30-day composed chart */}
        <ChartCard title="روند ۳۰ روزه — رزرو و درآمد" subtitle="ترکیب نمودار خطی و ستونی">
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={daily30} margin={{top:0,right:0,left:-10,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="تاریخ" tick={{fontSize:9}} stroke="var(--color-muted-foreground)" interval={4} />
              <YAxis yAxisId="left" tick={{fontSize:9}} stroke="var(--color-muted-foreground)" />
              <YAxis yAxisId="right" orientation="left" tick={{fontSize:9}} stroke="var(--color-muted-foreground)" />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{fontSize:11}} />
              <Bar yAxisId="left" dataKey="رزرو" fill="#2B0FD9" opacity={0.7} radius={[3,3,0,0]} />
              <Line yAxisId="right" type="monotone" dataKey="درآمد (هزار)" stroke="#10B981" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Weekly bars */}
          <ChartCard title="آمار هفتگی" className="lg:col-span-2">
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart data={weekly} margin={{top:0,right:0,left:-15,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="هفته" tick={{fontSize:10}} stroke="var(--color-muted-foreground)" />
                <YAxis tick={{fontSize:10}} stroke="var(--color-muted-foreground)" />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{fontSize:11}} />
                <Bar dataKey="رزرو" fill="#2B0FD9" radius={[4,4,0,0]} />
                <Line type="monotone" dataKey="درآمد (هزار)" stroke="#F59E0B" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Status pie */}
          <ChartCard title="توزیع وضعیت رزروها">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={stats?.statusBreakdown ?? []} dataKey="count" nameKey="label" cx="50%" cy="50%" outerRadius={70} paddingAngle={4}>
                  {(stats?.statusBreakdown ?? []).map((_,i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{fontSize:10}} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Row 3 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Peak hours */}
          <ChartCard title="ساعت‌های اوج (تمام روز)" subtitle="توزیع رزروها بر اساس ساعت شروع">
            <ResponsiveContainer width="100%" height={180}>
              <Bar data={peakData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              </Bar>
            </ResponsiveContainer>
            {/* Use BarChart directly */}
            <ResponsiveContainer width="100%" height={180}>
              <ComposedChart data={peakData} margin={{top:0,right:0,left:-20,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="ساعت" tick={{fontSize:9}} stroke="var(--color-muted-foreground)" />
                <YAxis tick={{fontSize:9}} stroke="var(--color-muted-foreground)" />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="تعداد" fill="#8B5CF620" stroke="#8B5CF6" strokeWidth={2} />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Court radar */}
          <ChartCard title="مقایسه عملکرد زمین‌ها" subtitle="رزروهای تأیید شده">
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                <PolarGrid stroke="var(--color-border)" />
                <PolarAngleAxis dataKey="زمین" tick={{fontSize:10}} />
                <Radar name="رزرو" dataKey="رزرو" stroke="#2B0FD9" fill="#2B0FD9" fillOpacity={0.25} />
                <Legend wrapperStyle={{fontSize:11}} />
                <Tooltip content={<CustomTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>
    </div>
  );
}
