import React from "react";
import { motion } from "framer-motion";
import {
  CalendarIcon,
  UsersIcon,
  TrophyIcon,
  CoinsIcon,
  StarIcon,
  ChevronRightIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const SPORT_ICONS = {
  padel: "🏓",
  tennis: "🎾",
  squash: "🟡",
  badminton: "🏸",
  "ping-pong": "🏓",
};

const PHASE_CONFIG = {
  registration: { label: "ثبت‌نام باز",  className: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30", dot: "bg-emerald-500" },
  ongoing:      { label: "در حال اجرا", className: "bg-blue-500/15   text-blue-500   border-blue-500/30",   dot: "bg-blue-500 animate-pulse" },
  completed:    { label: "پایان یافته", className: "bg-muted          text-muted-foreground border-border",  dot: "bg-zinc-400" },
};

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("fa-IR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function DeadlineCountdown({ deadline }) {
  const now = new Date();
  const end = new Date(deadline);
  const diff = end - now;

  if (diff <= 0) return <span className="text-red-500 text-[10px] font-medium">منقضی شده</span>;

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days > 0) return <span className="text-[10px] text-muted-foreground">{days} روز مانده</span>;
  return <span className="text-amber-500 text-[10px] font-medium">{hours} ساعت مانده</span>;
}

export default function TournamentCard({ tournament, onClick, index = 0 }) {
  const sportIcon = SPORT_ICONS[tournament.sportType] ?? "🏅";
  const phase = tournament.phase ?? "registration";
  const phaseCfg = PHASE_CONFIG[phase] ?? PHASE_CONFIG.registration;
  const fillRatio = tournament.registeredCount / tournament.maxParticipants;
  const isFree = tournament.entryFee === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      whileHover={{ scale: 1.015 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="cursor-pointer"
    >
      <div className="relative rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        {/* Top accent stripe */}
        <div className="h-1 w-full bg-gradient-to-r from-violet-600 via-indigo-500 to-blue-500" />

        <div className="p-4">
          {/* Header row */}
          <div className="flex items-start gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600/20 to-indigo-500/20 border border-violet-500/20 flex items-center justify-center text-xl shrink-0">
              {sportIcon}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold text-card-foreground text-sm leading-tight line-clamp-1">
                  {tournament.title}
                </h3>
                <ChevronRightIcon className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5 rotate-180" />
              </div>
              {tournament.club && (
                <p className="text-[11px] text-muted-foreground mt-0.5">🏢 {tournament.club.name}</p>
              )}
            </div>
          </div>

          {/* Badges row */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border",
                phaseCfg.className
              )}
            >
              <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", phaseCfg.dot)} />
              {phaseCfg.label}
            </span>

            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-muted border-border text-muted-foreground">
              <CoinsIcon className="w-3 h-3" />
              {isFree ? "رایگان" : `${tournament.entryFee.toLocaleString("fa-IR")} تومان`}
            </span>

            {tournament.minLevel > 1 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-amber-500/10 border-amber-500/30 text-amber-600">
                <StarIcon className="w-3 h-3" />
                سطح {tournament.minLevel}+
              </span>
            )}
          </div>

          {/* Info row */}
          <div className="grid grid-cols-2 gap-2 mb-3 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5 shrink-0" />
              <span>{formatDate(tournament.startDate)}</span>
            </div>
            <div className="flex items-center gap-1.5 justify-end">
              <TrophyIcon className="w-3.5 h-3.5 shrink-0" />
              <DeadlineCountdown deadline={tournament.registrationDeadline} />
            </div>
          </div>

          {/* Capacity bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <UsersIcon className="w-3 h-3" />
                <span>{tournament.registeredCount} / {tournament.maxParticipants} نفر</span>
              </div>
              <span className="text-[10px] text-muted-foreground">
                {Math.round(fillRatio * 100)}%
              </span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${fillRatio * 100}%` }}
                transition={{ duration: 0.7, delay: index * 0.06 + 0.2 }}
                className={cn(
                  "h-full rounded-full",
                  fillRatio >= 1
                    ? "bg-amber-500"
                    : fillRatio > 0.7
                    ? "bg-violet-500"
                    : "bg-emerald-500"
                )}
              />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
