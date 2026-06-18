import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { MapPinIcon, CalendarIcon, UsersIcon, ChevronRightIcon, ClockIcon, UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import UserAvatar from "@/components/ui/UserAvatar";
import UserProfileSheet from "@/components/ui/UserProfileSheet";
import { addDaysToDateKey, formatDateKeyInTehran, getTodayDateKeyInTehran } from "@/lib/timezone";

function useCountdown(targetDate) {
  const [label, setLabel] = useState("");

  useEffect(() => {
    function calc() {
      const diff = new Date(targetDate) - Date.now();
      if (diff <= 0) { setLabel("شروع شد"); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      if (h >= 24) {
        const d = Math.floor(h / 24);
        setLabel(`${d} روز دیگر`);
      } else if (h > 0) {
        setLabel(`${h}h ${m}m مانده`);
      } else {
        setLabel(`${m} دقیقه مانده`);
      }
    }
    calc();
    const t = setInterval(calc, 30000);
    return () => clearInterval(t);
  }, [targetDate]);

  return label;
}

const SPORT_ICONS = {
  padel: "🥎",
  tennis: "🎾",
  squash: "🟡",
  badminton: "🏸",
  "ping-pong": "🏓",
};

// Subtle accent colors that work on both light and dark backgrounds
const SPORT_ACCENT = {
  padel: "border-l-emerald-500",
  tennis: "border-l-yellow-500",
  squash: "border-l-red-500",
  badminton: "border-l-blue-500",
  "ping-pong": "border-l-purple-500",
};

function formatDate(dateStr) {
  const date = new Date(dateStr);
  const nowTehranKey = getTodayDateKeyInTehran();
  const tomorrowKey = addDaysToDateKey(nowTehranKey, 1);
  const matchDateKey = formatDateKeyInTehran(date);
  const isToday = matchDateKey === nowTehranKey;
  const isTomorrow = matchDateKey === tomorrowKey;
  const timeStr = date.toLocaleTimeString("fa-IR", { timeZone: "Asia/Tehran", hour: "2-digit", minute: "2-digit" });

  if (isToday) return `امروز ساعت ${timeStr}`;
  if (isTomorrow) return `فردا ساعت ${timeStr}`;
  return date.toLocaleDateString("fa-IR", {
    timeZone: "Asia/Tehran",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MatchCard({ match, onClick, index = 0 }) {
  const totalSlots = match.teamSize * 2;
  const filledSlots = match.teamA.length + match.teamB.length;
  const isFull = match.status === "full";
  const isInProgress = Boolean(match.isInProgress);
  const awaitingResult = Boolean(match.awaitingResult);
  const hasStatusBadge = isInProgress || awaitingResult || isFull;
  const badgeCount = Number(Boolean(match.isCertified)) + Number(hasStatusBadge);
  const sportIcon = SPORT_ICONS[match.sportType] ?? "🏅";
  const accentBorder = SPORT_ACCENT[match.sportType] ?? "border-l-primary";
  const countdown = useCountdown(match.scheduledAt);
  const creator = match.creator ?? match.createdByUser ?? match.owner ?? null;
  const [viewingCreator, setViewingCreator] = useState(null);

  return (
  <>
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="cursor-pointer"
    >
      <div
        className={cn(
          "relative rounded-2xl border border-border/80 bg-gradient-to-br from-card via-card to-muted/20 overflow-hidden shadow-sm",
          "border-l-4",
          accentBorder
        )}
      >
        <div className="absolute top-3 left-3 z-10 flex flex-col items-start gap-1.5">
          {match.isCertified && (
            <div className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold px-2 py-1 rounded-full border border-emerald-500/30 flex items-center gap-1">
              <span>✓</span> گارانتی رکت‌زون
            </div>
          )}

          {isInProgress ? (
            <div className="bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-bold px-2 py-1 rounded-full border border-blue-500/25 uppercase tracking-wider">
              در حال برگزاری
            </div>
          ) : awaitingResult ? (
            <div className="bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold px-2 py-1 rounded-full border border-amber-500/25 uppercase tracking-wider">
              انتظار نتیجه
            </div>
          ) : isFull ? (
            <div className="bg-destructive/10 text-destructive text-[10px] font-bold px-2 py-1 rounded-full border border-destructive/20 uppercase tracking-wider">
              پر شد
            </div>
          ) : null}
        </div>

        <div className={cn("p-4", badgeCount === 2 ? "pt-16" : badgeCount === 1 ? "pt-12" : "pt-4")}>
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{sportIcon}</span>
              <div>
                <h3 className="text-card-foreground font-bold text-base leading-tight">{match.title}</h3>
                <span className="inline-flex items-center mt-1 rounded-full border border-border bg-background/65 px-2 py-0.5 text-muted-foreground text-[11px] capitalize">
                  {match.sportType}
                </span>
              </div>
            </div>
            <ChevronRightIcon className="w-4 h-4 text-muted-foreground mt-1 shrink-0 rotate-180" />
          </div>

          {/* Info */}
          <div className="space-y-1.5 mb-4">
            {creator?.name && (
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-muted-foreground shrink-0">سازنده:</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (creator.id) setViewingCreator(creator);
                  }}
                  className={cn(
                    "inline-flex max-w-full items-center gap-1.5 rounded-full border border-border bg-background/70 px-2 py-1 text-foreground",
                    "active:scale-95 transition-transform"
                  )}
                >
                  {creator.image ? (
                    <UserAvatar
                      image={creator.image}
                      name={creator.name}
                      className="h-5 w-5 rounded-full text-[9px] text-white shrink-0"
                      fallbackClassName="h-5 w-5 rounded-full bg-primary text-primary-foreground text-[9px] shrink-0"
                      isCoach={creator.isCoach}
                    />
                  ) : (
                    <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <UserIcon className="w-3 h-3 text-muted-foreground" />
                    </div>
                  )}
                  <span className="font-bold truncate max-w-[120px]">{creator.name}</span>
                </button>
              </div>
            )}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <CalendarIcon className="w-3.5 h-3.5 shrink-0" />
                <span>{formatDate(match.scheduledAt)}</span>
              </div>
              {countdown && (
                <div className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <ClockIcon className="w-3 h-3" />
                  {countdown}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <MapPinIcon className="w-3.5 h-3.5 shrink-0" />
              <span>{match.courtName || match.location}</span>
            </div>
          </div>

          {/* Teams preview */}
          <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-background/60 px-2.5 py-2">
            {/* Team A */}
            <div className="flex -space-x-1.5">
              {Array.from({ length: match.teamSize }).map((_, i) => {
                const player = match.teamA[i];
                return player ? (
                  <UserAvatar
                    key={i}
                    image={player.image}
                    name={player.name}
                    className="h-7 w-7 rounded-full border-2 border-background text-[10px] text-white"
                    fallbackClassName="h-7 w-7 rounded-full border-2 border-background bg-blue-500 text-white text-[10px]"
                    isCoach={player.isCoach}
                  />
                ) : (
                  <div key={i} className="h-7 w-7 rounded-full border-2 border-background border-dashed bg-muted text-muted-foreground flex items-center justify-center text-[10px] font-bold">
                    +
                  </div>
                );
              })}
            </div>

            <span className="text-muted-foreground text-xs font-bold">vs</span>

            {/* Team B */}
            <div className="flex -space-x-1.5">
              {Array.from({ length: match.teamSize }).map((_, i) => {
                const player = match.teamB[i];
                return player ? (
                  <UserAvatar
                    key={i}
                    image={player.image}
                    name={player.name}
                    className="h-7 w-7 rounded-full border-2 border-background text-[10px] text-white"
                    fallbackClassName="h-7 w-7 rounded-full border-2 border-background bg-violet-500 text-white text-[10px]"
                    isCoach={player.isCoach}
                  />
                ) : (
                  <div key={i} className="h-7 w-7 rounded-full border-2 border-background border-dashed bg-muted text-muted-foreground flex items-center justify-center text-[10px] font-bold">
                    +
                  </div>
                );
              })}
            </div>

            {/* Capacity */}
            <div className="flex-1">
              <div className="flex justify-end mb-0.5">
                <span className="text-muted-foreground text-[10px] flex items-center gap-1">
                  <UsersIcon className="w-3 h-3" />
                  {filledSlots}/{totalSlots}
                </span>
              </div>
              <div className="h-1 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(filledSlots / totalSlots) * 100}%` }}
                  transition={{ duration: 0.6, delay: index * 0.06 + 0.3 }}
                  className="h-full bg-primary rounded-full"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
    {viewingCreator && (
      <UserProfileSheet
        userId={viewingCreator.id}
        name={viewingCreator.name}
        image={viewingCreator.image}
        onClose={() => setViewingCreator(null)}
      />
    )}
  </>
  );
}
