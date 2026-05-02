import React from "react";
import { motion } from "framer-motion";
import { SwordsIcon, TrophyIcon, TrendingUpIcon, ClockIcon, CalendarCheckIcon } from "lucide-react";
import { useAnimatedCounter } from "../hooks/useAnimatedCounter";
import { cn } from "@/lib/utils";

function StatCard({ icon: Icon, label, value, unit, color, delay = 0 }) {
  const animated = useAnimatedCounter(value, 900, delay);
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay / 1000 + 0.1 }}
      className="rounded-2xl border border-border bg-card p-3 flex flex-col gap-2"
    >
      <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center", color)}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-black text-foreground">{animated}</span>
          {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{label}</p>
      </div>
    </motion.div>
  );
}

export default function StatsGrid({ stats }) {
  if (!stats) return null;

  const cards = [
    { icon: SwordsIcon,        label: "کل بازی‌ها",   value: stats.totalMatches,    color: "bg-blue-500/10 text-blue-500",    delay: 0 },
    { icon: TrophyIcon,        label: "برد",           value: stats.wins,            color: "bg-emerald-500/10 text-emerald-500", delay: 80 },
    { icon: TrendingUpIcon,    label: "نرخ برد",       value: stats.winRate,         unit: "%", color: "bg-primary/10 text-primary", delay: 160 },
    { icon: ClockIcon,         label: "ساعت بازی",     value: stats.hoursPlayed,     unit: "h", color: "bg-violet-500/10 text-violet-500", delay: 240 },
    { icon: CalendarCheckIcon, label: "رزروهای تأیید", value: stats.approvedBookings, color: "bg-amber-500/10 text-amber-500",  delay: 320 },
  ];

  return (
    <div className="px-4">
      <div className="grid grid-cols-3 gap-2.5">
        {cards.slice(0, 3).map((c) => <StatCard key={c.label} {...c} />)}
      </div>
      <div className="grid grid-cols-2 gap-2.5 mt-2.5">
        {cards.slice(3).map((c) => <StatCard key={c.label} {...c} />)}
      </div>
    </div>
  );
}
