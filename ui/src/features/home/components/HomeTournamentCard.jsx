import React from "react";
import { motion } from "framer-motion";
import { UsersIcon, CalendarDaysIcon, CoinsIcon, TrophyIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSetAtom, useAtom } from "jotai";
import { selectedTournamentAtom, tournamentDetailOpenAtom } from "@/features/tournaments/store/tournamentStore";

const SPORT_ICONS = {
  padel: "🥎",
  tennis: "🎾",
  squash: "🟡",
  badminton: "🏸",
  "ping-pong": "🏓",
};

const PHASE_CONFIG = {
  registration: { label: "ثبت‌نام باز",  dot: "bg-emerald-400", badge: "bg-emerald-400/20 text-emerald-200 border-emerald-300/30" },
  ongoing:      { label: "در حال اجرا", dot: "bg-blue-400",    badge: "bg-blue-400/20   text-blue-200   border-blue-300/30"   },
  completed:    { label: "پایان یافته", dot: "bg-zinc-400",    badge: "bg-zinc-400/20   text-zinc-200   border-zinc-300/30"   },
};

const PHASE_GRADIENT = {
  registration: { from: "#1e1b4b", to: "#312e81", accent: "#a78bfa", glow: "rgba(139,92,246,0.35)" },
  ongoing:      { from: "#0c1a2e", to: "#1e3a5f", accent: "#38bdf8", glow: "rgba(56,189,248,0.35)" },
  completed:    { from: "#18181b", to: "#27272a", accent: "#a1a1aa", glow: "rgba(161,161,170,0.25)" },
};

export default function HomeTournamentCard({ tournament, index = 0 }) {
  const setSelected = useSetAtom(selectedTournamentAtom);
  const [, setOpen] = useAtom(tournamentDetailOpenAtom);

  const phase = tournament.phase ?? "registration";
  const phaseCfg = PHASE_CONFIG[phase] ?? PHASE_CONFIG.registration;
  const grad = PHASE_GRADIENT[phase] ?? PHASE_GRADIENT.registration;
  const isFree = tournament.entryFee === 0;
  const fillRatio = tournament.maxParticipants > 0
    ? Math.min((tournament.registeredCount ?? 0) / tournament.maxParticipants, 1)
    : 0;
  const spotsLeft = tournament.maxParticipants - (tournament.registeredCount ?? 0);

  const startLabel = tournament.startDate
    ? new Date(tournament.startDate).toLocaleDateString("fa-IR", {
        timeZone: "Asia/Tehran",
        month: "short",
        day: "numeric",
      })
    : null;

  function open() {
    setSelected(tournament);
    setOpen(true);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.07, type: "spring", stiffness: 260, damping: 22 }}
      whileTap={{ scale: 0.96 }}
      className="shrink-0 w-[200px] cursor-pointer"
      onClick={open}
    >
      <div
        className="relative rounded-[24px] overflow-hidden"
        style={{
          background: `linear-gradient(145deg, ${grad.from}, ${grad.to})`,
          boxShadow: `0 8px 28px -4px ${grad.glow}, 0 2px 8px rgba(0,0,0,0.12)`,
        }}
      >
        {/* Accent top line */}
        <div className="absolute top-0 inset-x-0 h-[2px] rounded-t-[24px]" style={{ background: `linear-gradient(90deg, transparent, ${grad.accent}, transparent)` }} />

        {/* Decorative blobs */}
        <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10" style={{ background: grad.accent }} />
        <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full opacity-10" style={{ background: grad.accent }} />

        {/* Header */}
        <div className="relative pt-4 pb-2 px-4 flex items-start gap-2.5">
          <div
            className="flex items-center justify-center w-11 h-11 rounded-full shrink-0"
            style={{
              background: `${grad.accent}22`,
              backdropFilter: "blur(4px)",
              boxShadow: `0 0 0 3px ${grad.accent}33, 0 0 18px ${grad.glow}`,
              border: `1px solid ${grad.accent}44`,
            }}
          >
            <span className="text-2xl">{SPORT_ICONS[tournament.sportType] ?? "🏅"}</span>
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-white font-black text-[13px] leading-tight line-clamp-2 drop-shadow-sm">
              {tournament.title}
            </p>
            <div className={cn("inline-flex items-center gap-1 mt-1.5 px-1.5 py-0.5 rounded-full border text-[9px] font-bold", phaseCfg.badge)}>
              <span className={cn("w-1 h-1 rounded-full shrink-0", phaseCfg.dot)} />
              {phaseCfg.label}
            </div>
          </div>
        </div>

        {/* Glass panel */}
        <div
          className="relative mx-2 mb-2 rounded-[18px] p-3 space-y-2"
          style={{
            background: "rgba(0,0,0,0.28)",
            backdropFilter: "blur(10px)",
            borderTop: "1px solid rgba(255,255,255,0.15)",
          }}
        >
          {/* Date + fee row */}
          <div className="flex items-center justify-between">
            {startLabel && (
              <div className="flex items-center gap-1">
                <CalendarDaysIcon className="w-3 h-3 text-white/60 shrink-0" />
                <span className="text-white/90 text-[10px] font-semibold">{startLabel}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <CoinsIcon className="w-3 h-3 text-white/60 shrink-0" />
              <span className="text-white/90 text-[10px] font-bold">
                {isFree ? "رایگان" : `${tournament.entryFee?.toLocaleString("fa-IR")} ت`}
              </span>
            </div>
          </div>

          {/* Capacity */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <UsersIcon className="w-3 h-3 text-white/60 shrink-0" />
                <span className="text-white/70 text-[10px]">
                  {tournament.registeredCount ?? 0}/{tournament.maxParticipants}
                </span>
              </div>
              {fillRatio < 1 ? (
                <span className="text-[9.5px] text-white/55">{spotsLeft} جای خالی</span>
              ) : (
                <span className="text-[9.5px] font-bold text-red-300">پر شد</span>
              )}
            </div>

            {/* Progress bar */}
            <div className="h-1 rounded-full overflow-hidden bg-white/15">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${fillRatio * 100}%` }}
                transition={{ duration: 0.8, delay: index * 0.07 + 0.2, ease: "easeOut" }}
                className={cn(
                  "h-full rounded-full",
                  fillRatio >= 1     ? "bg-red-400" :
                  fillRatio >= 0.75  ? "bg-amber-300" : "bg-emerald-300"
                )}
              />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
