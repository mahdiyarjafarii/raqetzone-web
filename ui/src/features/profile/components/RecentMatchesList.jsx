import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { MapPinIcon, ChevronLeftIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const SPORT_ICONS = { padel: "🥎", tennis: "🎾", squash: "🟡", badminton: "🏸" };

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("fa-IR", {
    timeZone: "Asia/Tehran",
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function ResultBadge({ isWin }) {
  if (isWin === null || isWin === undefined) {
    return (
      <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
        نامشخص
      </span>
    );
  }
  return (
    <span
      className={cn(
        "text-[10px] px-2 py-0.5 rounded-full font-bold",
        isWin
          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
          : "bg-red-500/15 text-red-600 dark:text-red-400"
      )}
    >
      {isWin ? "برد 🏆" : "باخت"}
    </span>
  );
}

export default function RecentMatchesList({ matches = [], loading }) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 rounded-2xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="text-center py-10 rounded-[26px] bg-white/80 dark:bg-card border border-black/[0.06] dark:border-border shadow-sm">
        <span className="text-4xl block mb-3">⚔️</span>
        <p className="text-muted-foreground text-sm font-medium">هنوز بازی نداشتید</p>
        <Link to="/tournament" className="text-primary text-xs font-bold mt-1 block">
          پیوستن به اولین بازی ←
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {matches.map((match, i) => (
        <motion.div
          key={match.matchId}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <Link to="/tournament">
            <div className="flex items-center gap-3 bg-white/90 dark:bg-card border border-black/[0.06] dark:border-border rounded-[24px] p-3.5 shadow-sm shadow-slate-200/50 dark:shadow-black/10 active:scale-[0.99] transition-transform">
              <div className="h-12 w-12 rounded-2xl bg-black/[0.04] dark:bg-white/10 flex items-center justify-center text-2xl shrink-0">
                {SPORT_ICONS[match.sportType] ?? "🏅"}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-black text-foreground text-sm truncate">{match.title}</p>
                  <ResultBadge isWin={match.isWin} />
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MapPinIcon className="w-3 h-3 shrink-0" />
                    <span className="truncate max-w-[90px]">{match.location}</span>
                  </span>
                  <span>{formatDate(match.scheduledAt)}</span>
                  <span className="bg-black/[0.04] dark:bg-white/10 px-2 py-0.5 rounded-full text-[10px] font-bold">تیم {match.team}</span>
                </div>
              </div>

              <ChevronLeftIcon className="w-4 h-4 text-muted-foreground/70 shrink-0" />
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
