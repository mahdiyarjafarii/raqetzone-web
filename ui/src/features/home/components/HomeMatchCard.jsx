import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { MapPinIcon, ClockIcon, ZapIcon, FlameIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { addDaysToDateKey, formatDateKeyInTehran, getTodayDateKeyInTehran } from "@/lib/timezone";
import UserAvatar from "@/components/ui/UserAvatar";

const SPORT_ICONS = {
  padel: "🥎",
  tennis: "🎾",
  squash: "🟡",
  badminton: "🏸",
  "ping-pong": "🏓",
};

const SPORT_CONFIG = {
  padel:      { from: "#10b981", to: "#0d9488", glow: "rgba(16,185,129,0.55)", name: "پدل" },
  tennis:     { from: "#f59e0b", to: "#ea580c", glow: "rgba(245,158,11,0.55)", name: "تنیس" },
  squash:     { from: "#ef4444", to: "#be123c", glow: "rgba(239,68,68,0.55)",  name: "اسکواش" },
  badminton:  { from: "#3b82f6", to: "#0891b2", glow: "rgba(59,130,246,0.55)", name: "بدمینتون" },
  "ping-pong":{ from: "#8b5cf6", to: "#7c3aed", glow: "rgba(139,92,246,0.55)", name: "پینگ‌پنگ" },
};

function useCountdown(targetDate) {
  const [parts, setParts] = useState({ label: "", urgent: false });
  useEffect(() => {
    function calc() {
      const diff = new Date(targetDate) - Date.now();
      if (diff <= 0) { setParts({ label: "شروع شد", urgent: false }); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      if (h >= 24) setParts({ label: `${Math.floor(h / 24)} روز مانده`, urgent: false });
      else if (h > 0) setParts({ label: `${h}:${String(m).padStart(2, "0")}`, urgent: h < 3 });
      else setParts({ label: `${m} دقیقه`, urgent: true });
    }
    calc();
    const t = setInterval(calc, 30000);
    return () => clearInterval(t);
  }, [targetDate]);
  return parts;
}

function formatMatchTime(dateStr) {
  const d = new Date(dateStr);
  const todayKey = getTodayDateKeyInTehran();
  const tomorrowKey = addDaysToDateKey(todayKey, 1);
  const dateKey = formatDateKeyInTehran(d);
  const time = d.toLocaleTimeString("fa-IR", { timeZone: "Asia/Tehran", hour: "2-digit", minute: "2-digit" });
  if (dateKey === todayKey) return `امروز  ${time}`;
  if (dateKey === tomorrowKey) return `فردا  ${time}`;
  return d.toLocaleDateString("fa-IR", { timeZone: "Asia/Tehran", weekday: "short", day: "numeric", month: "short" }) + `  ${time}`;
}

/* Stacked player avatars — show joined players + empty slots */
function PlayerAvatarRow({ teamA, teamB, teamSize }) {
  const allPlayers = [...teamA, ...teamB];
  const total = teamSize * 2;
  const emptySlots = total - allPlayers.length;

  return (
    <div className="flex items-center -space-x-2 flex-row-reverse justify-end">
      {/* Empty slot placeholders */}
      {Array.from({ length: emptySlots }).map((_, i) => (
        <div
          key={`empty-${i}`}
          className="w-6 h-6 rounded-full border-2 border-white/20 bg-white/10 flex items-center justify-center text-white/40 text-[8px] font-bold shrink-0"
          style={{ backdropFilter: "blur(4px)" }}
        >
          +
        </div>
      ))}
      {/* Joined players — reversed so first joined appears rightmost */}
      {[...allPlayers].reverse().map((player, i) => (
        <UserAvatar
          key={player.userId ?? i}
          image={player.image}
          name={player.name}
          className="w-6 h-6 rounded-full border-2 border-white/40 object-cover shrink-0"
          fallbackClassName="w-6 h-6 rounded-full border-2 border-white/40 bg-white/25 text-white text-[8px] font-bold flex items-center justify-center shrink-0"
        />
      ))}
    </div>
  );
}

export default function HomeMatchCard({ match, index = 0 }) {
  const total = match.teamSize * 2;
  const filled = match.teamA.length + match.teamB.length;
  const spotsLeft = total - filled;
  const pct = Math.round((filled / total) * 100);
  const isFull = spotsLeft === 0;
  const isUrgent = spotsLeft <= 2 && spotsLeft > 0;

  const cfg = SPORT_CONFIG[match.sportType] ?? { from: "#6366f1", to: "#4f46e5", glow: "rgba(99,102,241,0.5)", name: match.sportType };
  const { label: countdown, urgent: countdownUrgent } = useCountdown(match.scheduledAt);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.08, type: "spring", stiffness: 260, damping: 22 }}
      whileTap={{ scale: 0.96 }}
      className="shrink-0 w-[210px]"
    >
      <Link to="/tournament" className="block">
        {/* Card shell — full-bleed gradient */}
        <div
          className="relative rounded-[26px] overflow-hidden"
          style={{
            background: `linear-gradient(145deg, ${cfg.from}, ${cfg.to})`,
            boxShadow: `0 8px 28px -4px ${cfg.glow}, 0 2px 8px rgba(0,0,0,0.12)`,
          }}
        >
          {/* Decorative blobs */}
          <div
            className="absolute -top-7 -right-7 w-28 h-28 rounded-full opacity-25"
            style={{ background: "rgba(255,255,255,0.35)" }}
          />
          <div
            className="absolute -bottom-5 -left-5 w-20 h-20 rounded-full opacity-20"
            style={{ background: "rgba(0,0,0,0.25)" }}
          />
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-36 h-36 rounded-full opacity-[0.07]"
            style={{ background: "white" }}
          />

          {/* Top: sport icon + title — horizontal layout to reduce height */}
          <div className="relative pt-4 pb-2 px-4 flex items-center gap-3">
            {/* Glowing icon ring */}
            <div
              className="flex items-center justify-center w-12 h-12 rounded-full shrink-0"
              style={{
                background: "rgba(255,255,255,0.18)",
                backdropFilter: "blur(4px)",
                boxShadow: `0 0 0 5px rgba(255,255,255,0.10), 0 0 20px ${cfg.glow}`,
              }}
            >
              <span className="text-2xl">{SPORT_ICONS[match.sportType] ?? "🏅"}</span>
            </div>

            <div className="min-w-0 flex-1">
              {/* Title */}
              <p className="text-white font-black text-[13px] leading-tight truncate drop-shadow-sm">
                {match.title}
              </p>
              {/* Sport type + certified badge */}
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-white/70 text-[10px] font-semibold">{cfg.name}</span>
                {match.isCertified && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-white/20 text-white border border-white/30">
                    ✓
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Countdown pill — floats in the middle */}
          {countdown && (
            <div className="relative flex justify-center -mb-3 z-10">
              <div
                className={cn(
                  "inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold shadow-lg border",
                  countdownUrgent || isUrgent
                    ? "bg-red-500 text-white border-red-400/50 shadow-red-500/40"
                    : "bg-white/20 text-white border-white/25 backdrop-blur-sm"
                )}
              >
                {(countdownUrgent || isUrgent) && <ZapIcon className="w-2.5 h-2.5" />}
                <ClockIcon className="w-2.5 h-2.5 opacity-80" />
                {countdown}
              </div>
            </div>
          )}

          {/* Bottom glass panel */}
          <div
            className="relative mx-2 mb-2 rounded-[18px] p-3 space-y-2.5"
            style={{
              background: "rgba(0,0,0,0.28)",
              backdropFilter: "blur(10px)",
              borderTop: "1px solid rgba(255,255,255,0.15)",
            }}
          >
            {/* Time */}
            <div className="flex items-center gap-1.5">
              <ClockIcon className="w-3 h-3 text-white/60 shrink-0" />
              <span className="text-white/90 text-[10.5px] font-semibold leading-none truncate">
                {formatMatchTime(match.scheduledAt)}
              </span>
            </div>

            {/* Club + court */}
            <div className="flex items-center gap-1.5">
              <MapPinIcon className="w-3 h-3 text-white/60 shrink-0" />
              <div className="min-w-0">
                <span className="text-white/90 text-[10.5px] font-bold truncate block leading-tight">
                  {match.location}
                </span>
                {match.courtName && (
                  <span className="text-white/55 text-[9.5px] truncate block leading-tight">
                    {match.courtName}
                  </span>
                )}
              </div>
            </div>

            {/* Capacity row */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <PlayerAvatarRow teamA={match.teamA} teamB={match.teamB} teamSize={match.teamSize} />
                <span className="text-white/70 text-[10px] font-bold">{filled}/{total}</span>
              </div>

              {/* Progress bar */}
              <div className="h-1 rounded-full overflow-hidden bg-white/15">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8, delay: index * 0.08 + 0.25, ease: "easeOut" }}
                  className={cn(
                    "h-full rounded-full",
                    isFull      ? "bg-red-400" :
                    isUrgent    ? "bg-amber-300" :
                    pct >= 50   ? "bg-emerald-300" : "bg-white/70"
                  )}
                />
              </div>

              {/* Urgency label */}
              <div className="flex justify-end">
                {isFull ? (
                  <span className="text-[9.5px] font-bold text-red-300">پر شد</span>
                ) : spotsLeft === 1 ? (
                  <span className="inline-flex items-center gap-0.5 text-[9.5px] font-bold text-amber-300 animate-pulse">
                    <FlameIcon className="w-2.5 h-2.5" />آخرین جا!
                  </span>
                ) : spotsLeft === 2 ? (
                  <span className="text-[9.5px] font-bold text-amber-300/90">{spotsLeft} جای خالی</span>
                ) : (
                  <span className="text-[9.5px] text-white/50">{spotsLeft} جای خالی</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
