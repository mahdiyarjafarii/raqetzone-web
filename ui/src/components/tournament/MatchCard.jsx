import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  MapPinIcon,
  CalendarIcon,
  UsersIcon,
  ChevronRightIcon,
  ClockIcon,
  UserIcon,
  ShieldCheckIcon,
} from "lucide-react";
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

const SPORT_CONFIG = {
  padel:      { icon: "🥎", label: "پدل",      gradient: "from-emerald-500 to-teal-600",  glow: "shadow-emerald-500/15" },
  tennis:     { icon: "🎾", label: "تنیس",     gradient: "from-yellow-500 to-amber-500",  glow: "shadow-yellow-500/15" },
  squash:     { icon: "🟡", label: "اسکواش",   gradient: "from-red-500 to-rose-600",      glow: "shadow-red-500/15"    },
  badminton:  { icon: "🏸", label: "بدمینتون", gradient: "from-blue-500 to-indigo-600",   glow: "shadow-blue-500/15"   },
  "ping-pong":{ icon: "🏓", label: "پینگ‌پنگ", gradient: "from-purple-500 to-violet-600", glow: "shadow-purple-500/15" },
};
const DEFAULT_SPORT = { icon: "🏅", label: "ورزش", gradient: "from-primary to-primary/80", glow: "shadow-primary/10" };

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

function StatusBadge({ isInProgress, awaitingResult, isFull }) {
  if (isInProgress) {
    return (
      <div className="flex items-center gap-1.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-semibold px-2 py-1 rounded-full border border-blue-500/20">
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500" />
        </span>
        در حال برگزاری
      </div>
    );
  }
  if (awaitingResult) {
    return (
      <div className="flex items-center gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-semibold px-2 py-1 rounded-full border border-amber-500/20">
        <ClockIcon className="w-2.5 h-2.5" />
        انتظار نتیجه
      </div>
    );
  }
  if (isFull) {
    return (
      <div className="bg-destructive/10 text-destructive text-[10px] font-semibold px-2 py-1 rounded-full border border-destructive/20">
        پر شد
      </div>
    );
  }
  return null;
}

function SlotAvatar({ player, fallbackClass }) {
  if (player) {
    return (
      <UserAvatar
        image={player.image}
        name={player.name}
        className="h-8 w-8 rounded-full border-2 border-card text-[10px] text-white"
        fallbackClassName={cn("h-8 w-8 rounded-full border-2 border-card text-white text-[10px]", fallbackClass)}
        isCoach={player.isCoach}
      />
    );
  }
  return (
    <div className="h-8 w-8 rounded-full border-2 border-card border-dashed bg-muted/60 text-muted-foreground flex items-center justify-center text-[11px] font-bold">
      +
    </div>
  );
}

export default function MatchCard({ match, onClick, index = 0 }) {
  const totalSlots = match.teamSize * 2;
  const filledSlots = match.teamA.length + match.teamB.length;
  const fillPct = totalSlots > 0 ? (filledSlots / totalSlots) * 100 : 0;
  const isFull = match.status === "full";
  const isInProgress = Boolean(match.isInProgress);
  const awaitingResult = Boolean(match.awaitingResult);
  const sport = SPORT_CONFIG[match.sportType] ?? DEFAULT_SPORT;
  const countdown = useCountdown(match.scheduledAt);
  const creator = match.creator ?? match.createdByUser ?? match.owner ?? null;
  const [viewingCreator, setViewingCreator] = useState(null);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05, duration: 0.3, ease: "easeOut" }}
        whileHover={{ scale: 1.015, transition: { duration: 0.18 } }}
        whileTap={{ scale: 0.975, transition: { duration: 0.1 } }}
        onClick={onClick}
        className="cursor-pointer"
      >
        <div
          className="relative rounded-2xl overflow-hidden bg-card shadow-sm"
          style={{ border: "1px solid", borderColor: "color-mix(in srgb, #f59e0b 35%, transparent)" }}
        >
          <div className="p-4 pt-4">
            {/* ── Header row ── */}
            <div className="flex items-start gap-3 mb-3.5">
              {/* Sport badge */}
              <div className="w-10 h-10 flex items-center justify-center shrink-0 text-3xl">
                {sport.icon}
              </div>

              {/* Title + meta */}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-[15px] text-card-foreground leading-snug truncate">
                  {match.title}
                </h3>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-xs text-muted-foreground">
                    {sport.label}
                  </span>
                  {match.isCertified && (
                    <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      <ShieldCheckIcon className="w-3.5 h-3.5" />
                      گارانتی رکت‌زون
                    </span>
                  )}
                </div>
              </div>

              {/* Status + arrow */}
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <StatusBadge isInProgress={isInProgress} awaitingResult={awaitingResult} isFull={isFull} />
                <ChevronRightIcon className="w-4 h-4 text-muted-foreground/60 rotate-180" />
              </div>
            </div>

            {/* ── Info rows ── */}
            <div className="space-y-1.5 mb-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-muted-foreground text-[13px] min-w-0">
                  <CalendarIcon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{formatDate(match.scheduledAt)}</span>
                </div>
                {countdown && (
                  <div className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
                    <ClockIcon className="w-3.5 h-3.5" />
                    {countdown}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1.5 text-muted-foreground text-[13px] min-w-0">
                <MapPinIcon className="w-4 h-4 shrink-0" />
                <span className="truncate">
                  {[match.clubName, match.courtName].filter(Boolean).join(" · ") || match.location}
                </span>
              </div>

              {creator?.name && (
                <div className="flex items-center gap-1.5 text-[13px]">
                  <span className="text-muted-foreground shrink-0">سازنده:</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (creator.id) setViewingCreator(creator);
                    }}
                    className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border/70 bg-muted/40 px-2 py-0.5 text-foreground active:scale-95 transition-transform"
                  >
                    {creator.image ? (
                      <UserAvatar
                        image={creator.image}
                        name={creator.name}
                        className="h-4 w-4 rounded-full text-[8px] text-white shrink-0"
                        fallbackClassName="h-4 w-4 rounded-full bg-primary text-primary-foreground text-[8px] shrink-0"
                        isCoach={creator.isCoach}
                      />
                    ) : (
                      <div className="h-4 w-4 rounded-full bg-muted border border-border flex items-center justify-center shrink-0">
                        <UserIcon className="w-2.5 h-2.5 text-muted-foreground" />
                      </div>
                    )}
                    <span className="font-semibold text-xs truncate max-w-[120px]">{creator.name}</span>
                  </button>
                </div>
              )}
            </div>

            {/* ── Teams vs. section ── */}
            <div className="rounded-xl bg-muted/30 border border-border/50 px-3 py-2.5">
              <div className="flex items-center gap-2">
                {/* Team A */}
                <div className="flex-1 flex items-center gap-0 -space-x-2">
                  {Array.from({ length: match.teamSize }).map((_, i) => (
                    <SlotAvatar key={i} player={match.teamA[i]} fallbackClass="bg-blue-500" />
                  ))}
                </div>

                {/* VS pill */}
                <div className="shrink-0 flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-card border-2 border-border/60 flex items-center justify-center shadow-sm">
                    <span className="text-[10px] font-black text-muted-foreground leading-none">VS</span>
                  </div>
                </div>

                {/* Team B */}
                <div className="flex-1 flex items-center justify-end gap-0 -space-x-2">
                  {Array.from({ length: match.teamSize }).map((_, i) => (
                    <SlotAvatar key={i} player={match.teamB[i]} fallbackClass="bg-violet-500" />
                  ))}
                </div>
              </div>

              {/* Capacity bar */}
              <div className="mt-2.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-muted-foreground">ظرفیت بازی</span>
                  <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                    <UsersIcon className="w-3 h-3" />
                    {filledSlots}/{totalSlots}
                  </span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${fillPct}%` }}
                    transition={{ duration: 0.7, delay: index * 0.05 + 0.25, ease: "easeOut" }}
                    className={cn("h-full rounded-full bg-gradient-to-r", sport.gradient)}
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
