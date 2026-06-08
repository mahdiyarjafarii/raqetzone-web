import React from "react";
import { motion } from "framer-motion";
import {
  CalendarIcon,
  UsersIcon,
  TrophyIcon,
  CoinsIcon,
  StarIcon,
  ChevronRightIcon,
  Building2Icon,
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
  registration: { label: "ثبت‌نام باز",  className: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-300 border-emerald-500/20", dot: "bg-emerald-500" },
  ongoing:      { label: "در حال اجرا", className: "bg-blue-500/12 text-blue-600 dark:text-blue-300 border-blue-500/20",   dot: "bg-blue-500 animate-pulse" },
  completed:    { label: "پایان یافته", className: "bg-muted text-muted-foreground border-border",  dot: "bg-zinc-400" },
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
  const clubName =
    tournament.club?.name ??
    tournament.club?.clubName ??
    tournament.clubName ??
    tournament.club?.title ??
    tournament.organizerClub?.name ??
    tournament.organizerClubName ??
    tournament.organizer?.name ??
    tournament.venue?.name ??
    null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="cursor-pointer"
    >
      <div className="relative overflow-hidden rounded-[26px] border border-black/[0.06] dark:border-white/10 bg-white dark:bg-card shadow-lg shadow-slate-200/45 dark:shadow-black/10">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-[#ef1871] to-blue-500" />

        <div className="relative p-4">
          {/* Header row */}
          <div className="flex items-start gap-3 mb-3.5">
            <div className="w-12 h-12 rounded-2xl bg-primary/8 border border-primary/10 flex items-center justify-center text-2xl shrink-0">
              {sportIcon}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-black text-card-foreground text-[15px] leading-tight line-clamp-1 tracking-tight">
                    {tournament.title}
                  </h3>
                </div>
                <ChevronRightIcon className="w-4 h-4 text-muted-foreground rotate-180 shrink-0 mt-1" />
              </div>
            </div>
          </div>

          {clubName && (
            <div className="flex items-center gap-2 mb-3.5 rounded-2xl bg-primary/7 border border-primary/10 px-3 py-2 text-[11px] text-muted-foreground font-semibold">
              <Building2Icon className="w-3.5 h-3.5 shrink-0 text-primary" />
              <span className="text-muted-foreground shrink-0">باشگاه برگزارکننده:</span>
              <span className="text-foreground font-black truncate">{clubName}</span>
            </div>
          )}

          {/* Badges row */}
          <div className="flex flex-wrap gap-1.5 mb-3.5">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border",
                phaseCfg.className
              )}
            >
              <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", phaseCfg.dot)} />
              {phaseCfg.label}
            </span>

            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border bg-muted/70 border-border text-muted-foreground">
              <CoinsIcon className="w-3 h-3" />
              {isFree ? "رایگان" : `${tournament.entryFee.toLocaleString("fa-IR")} تومان`}
            </span>

            {tournament.minLevel > 1 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border bg-amber-500/10 border-amber-500/25 text-amber-600 dark:text-amber-300">
                <StarIcon className="w-3 h-3" />
                سطح {tournament.minLevel}+
              </span>
            )}
          </div>

          {/* Info row */}
          <div className="grid grid-cols-2 gap-2 mb-3.5">
            <div className="flex items-center gap-1.5 rounded-2xl bg-muted/55 px-3 py-2 text-[11px] text-muted-foreground font-semibold">
              <CalendarIcon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{formatDate(tournament.startDate)}</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-2xl bg-muted/55 px-3 py-2 text-[11px] text-muted-foreground font-semibold">
              <TrophyIcon className="w-3.5 h-3.5 shrink-0" />
              <DeadlineCountdown deadline={tournament.registrationDeadline} />
            </div>
          </div>

          {/* Capacity bar */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-semibold">
                <UsersIcon className="w-3 h-3" />
                <span>{tournament.registeredCount} / {tournament.maxParticipants} نفر</span>
              </div>
              <span className="text-[11px] font-bold text-muted-foreground">
                {Math.round(fillRatio * 100)}٪
              </span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(fillRatio * 100, 100)}%` }}
                transition={{ duration: 0.7, delay: index * 0.06 + 0.2 }}
                className={cn(
                  "h-full rounded-full shadow-sm",
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
