import React from "react";
import { motion } from "framer-motion";
import { MapPinIcon, ClockIcon, UsersIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const SPORT_ICONS = { padel: "🏓", tennis: "🎾", squash: "🟡", badminton: "🏸" };
const SPORT_COLOR = {
  padel: "from-emerald-500 to-teal-600",
  tennis: "from-yellow-500 to-orange-600",
  squash: "from-red-500 to-rose-600",
  badminton: "from-blue-500 to-cyan-600",
};

function formatMatchTime(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const tomorrow = new Date(); tomorrow.setDate(now.getDate() + 1);
  const time = d.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" });
  if (d.toDateString() === now.toDateString()) return `امروز ${time}`;
  if (d.toDateString() === tomorrow.toDateString()) return `فردا ${time}`;
  return d.toLocaleDateString("fa-IR", { weekday: "short", hour: "2-digit", minute: "2-digit" });
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
      className="shrink-0 w-52"
    >
      <Link to="/tournament">
        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm active:scale-[0.98] transition-transform">
          {/* Gradient header */}
          <div className={cn("h-14 bg-gradient-to-r flex items-center px-3 gap-2", sportGrad)}>
            <span className="text-2xl">{SPORT_ICONS[match.sportType] ?? "🏅"}</span>
            <div className="min-w-0">
              <p className="text-white font-bold text-sm truncate leading-tight">{match.title}</p>
              <p className="text-white/70 text-[10px] capitalize">{match.sportType}</p>
            </div>
          </div>

          <div className="p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
              <ClockIcon className="w-3 h-3 shrink-0" />
              <span>{formatMatchTime(match.scheduledAt)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
              <MapPinIcon className="w-3 h-3 shrink-0" />
              <span className="truncate">{match.courtName || match.location}</span>
            </div>

            {/* Slots */}
            <div className="flex items-center justify-between pt-1 border-t border-border">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
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
