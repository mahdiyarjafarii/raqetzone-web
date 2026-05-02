import React, { useState } from "react";
import { motion } from "framer-motion";
import DonutChart from "./DonutChart";
import WeeklyBarsChart from "./WeeklyBarsChart";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "winloss", label: "برد/باخت" },
  { id: "weekly",  label: "فعالیت هفتگی" },
];

export default function PerformanceCharts({ stats, weeklyActivity }) {
  const [tab, setTab] = useState("winloss");

  return (
    <div className="mx-4 rounded-2xl border border-border bg-card overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex-1 py-3 text-xs font-semibold transition-colors relative",
              tab === t.id ? "text-primary" : "text-muted-foreground"
            )}
          >
            {t.label}
            {tab === t.id && (
              <motion.div
                layoutId="chart-tab-indicator"
                className="absolute bottom-0 left-4 right-4 h-0.5 bg-primary rounded-full"
              />
            )}
          </button>
        ))}
      </div>

      {/* Chart body */}
      <div className="p-4 min-h-[140px] flex items-center justify-center">
        {tab === "winloss" ? (
          <DonutChart
            wins={stats?.wins ?? 0}
            losses={stats?.losses ?? 0}
            total={stats?.totalMatches ?? 0}
          />
        ) : (
          <WeeklyBarsChart weeklyActivity={weeklyActivity ?? []} />
        )}
      </div>
    </div>
  );
}
