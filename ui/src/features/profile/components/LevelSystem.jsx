import React from "react";
import { motion } from "framer-motion";
import { ShieldIcon } from "lucide-react";
import { useAnimatedCounter } from "../hooks/useAnimatedCounter";

const RANK_EMOJI = { Bronze: "🥉", Silver: "🥈", Gold: "🥇", Elite: "👑" };

export default function LevelSystem({ levelData }) {
  const { current, xp, progressXp, neededXp, progressPct, rank } = levelData;
  const animXp = useAnimatedCounter(xp, 1200, 200);
  const animLevel = useAnimatedCounter(current, 800, 100);

  return (
    <div className="mx-4">
      <div className="rounded-2xl border border-border bg-card p-4 overflow-hidden relative">
        {/* Background gradient */}
        <div
          className="absolute inset-0 opacity-5 pointer-events-none"
          style={{
            background: `linear-gradient(135deg, ${rank.gradient[0]}, ${rank.gradient[1]})`,
          }}
        />

        <div className="relative flex items-center gap-4 mb-4">
          {/* Rank badge */}
          <div
            className="h-14 w-14 rounded-2xl flex flex-col items-center justify-center border-2 shadow-md shrink-0"
            style={{
              background: `linear-gradient(135deg, ${rank.gradient[0]}20, ${rank.gradient[1]}20)`,
              borderColor: `${rank.color}50`,
            }}
          >
            <span className="text-xl">{RANK_EMOJI[rank.label] ?? "🏅"}</span>
            <span className="text-[9px] font-bold mt-0.5" style={{ color: rank.color }}>
              {rank.label}
            </span>
          </div>

          {/* Level info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-foreground">{animLevel}</span>
              <span className="text-muted-foreground text-sm">سطح</span>
              <span className="mr-auto text-xs text-muted-foreground font-mono">
                {animXp.toLocaleString("fa-IR")} XP
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {(neededXp - progressXp).toLocaleString("fa-IR")} XP تا سطح بعدی
            </p>
          </div>
        </div>

        {/* XP progress bar */}
        <div>
          <div className="flex justify-between text-[10px] text-muted-foreground mb-1.5">
            <span>سطح {current}</span>
            <span>{progressPct}%</span>
            <span>سطح {current + 1}</span>
          </div>
          <div className="h-2.5 bg-muted rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 1.2, delay: 0.3, ease: "easeOut" }}
              className="h-full rounded-full"
              style={{
                background: `linear-gradient(90deg, ${rank.gradient[0]}, ${rank.gradient[1]})`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
