import React from "react";
import { motion } from "framer-motion";
import { MapPinIcon, ClockIcon, UsersIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { addDaysToDateKey, formatDateKeyInTehran, getTodayDateKeyInTehran } from "@/lib/timezone";

const SPORT_ICONS = { padel: "🥎", tennis: "🎾", squash: "🟡", badminton: "🏸" };
const SPORT_COLOR = {
  padel: "from-emerald-500 to-teal-600",
  tennis: "from-yellow-500 to-orange-600",
  squash: "from-red-500 to-rose-600",
  badminton: "from-blue-500 to-cyan-600",
};

function formatMatchTime(dateStr) {
  const d = new Date(dateStr);
  const todayKey = getTodayDateKeyInTehran();
  const tomorrowKey = addDaysToDateKey(todayKey, 1);
  const dateKey = formatDateKeyInTehran(d);
  const time = d.toLocaleTimeString("fa-IR", { timeZone: "Asia/Tehran", hour: "2-digit", minute: "2-digit" });
  if (dateKey === todayKey) return `امروز ${time}`;
  if (dateKey === tomorrowKey) return `فردا ${time}`;
  return d.toLocaleDateString("fa-IR", { timeZone: "Asia/Tehran", weekday: "short", hour: "2-digit", minute: "2-digit" });
}

export default function HomeMatchCard({ match, index = 0 }) {
  const total = match.teamSize * 2;
  const filled = match.teamA.length + match.teamB.length;
  const spotsLeft = total - filled;
  const sportGrad = SPORT_COLOR[match.sportType] ?? "from-primary to-primary/70";

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08 }}
      className="shrink-0 w-60"
    >
      <Link to="/tournament">
        <div className="rounded-[26px] border border-white/70 dark:border-border bg-white/90 dark:bg-card overflow-hidden shadow-xl shadow-slate-200/50 dark:shadow-black/10 active:scale-[0.98] transition-transform">
          {/* Gradient header */}
          <div className={cn("relative h-20 bg-gradient-to-r flex items-center px-4 gap-3 overflow-hidden", sportGrad)}>
            <div className="absolute -left-6 -top-8 h-24 w-24 rounded-full bg-white/10" />
            <span className="relative text-3xl">{SPORT_ICONS[match.sportType] ?? "🏅"}</span>
            <div className="min-w-0">
              <p className="text-white font-black text-base truncate leading-tight drop-shadow-sm">{match.title}</p>
              <p className="text-white/75 text-[11px] capitalize font-semibold mt-0.5">{match.sportType}</p>
            </div>
          </div>

          <div className="p-3.5 space-y-2.5">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-medium">
              <ClockIcon className="w-3.5 h-3.5 shrink-0 text-primary" />
              <span>{formatMatchTime(match.scheduledAt)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-medium">
              <MapPinIcon className="w-3.5 h-3.5 shrink-0 text-primary" />
              <span className="truncate">{match.courtName || match.location}</span>
            </div>

            {/* Slots */}
            <div className="flex items-center justify-between pt-2 border-t border-border/70">
              <div className="flex items-center gap-1 text-xs text-muted-foreground font-semibold">
                <UsersIcon className="w-3 h-3" />
                <span>{filled}/{total} نفر</span>
              </div>
              <span
                className={cn(
                  "text-[10px] font-bold px-2 py-0.5 rounded-full",
                  spotsLeft === 0
                    ? "bg-destructive/10 text-destructive"
                    : spotsLeft <= 1
                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                )}
              >
                {spotsLeft === 0 ? "پر شد" : `${spotsLeft} جای خالی`}
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
