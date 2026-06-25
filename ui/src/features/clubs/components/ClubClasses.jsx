import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  UsersIcon,
  CalendarDaysIcon,
  BadgeCheckIcon,
  ChevronLeftIcon,
  GraduationCapIcon,
} from "lucide-react";
import { coachService } from "@/services/coachService";
import ClassDetailSheet from "@/features/coaches/components/ClassDetailSheet";

const SPORT_GRADIENTS = {
  tennis:      "from-[#1a6b3c] to-[#16a34a]",
  padel:       "from-[#1e3a8a] to-[#3b82f6]",
  squash:      "from-[#7c2d12] to-[#f59e0b]",
  badminton:   "from-[#4c1d95] to-[#a78bfa]",
  "ping-pong": "from-[#134e4a] to-[#2dd4bf]",
};

const SPORT_EMOJI = {
  tennis: "🎾", padel: "🥎", squash: "🟡", badminton: "🏸", "ping-pong": "🏓",
};

const LEVEL_LABELS = {
  all: "همه سطوح", beginner: "مبتدی", intermediate: "متوسط", advanced: "پیشرفته",
};

function formatToman(v) {
  return Number(v || 0).toLocaleString("fa-IR");
}

function getProfileImage(image) {
  if (!image) return null;
  if (image.startsWith("http")) return image;
  return `${import.meta.env.VITE_WEBSITE_URL}/uploads/user/${image}`;
}

function getUserFullName(user) {
  const first = user?.firstName?.trim() ?? "";
  const last  = user?.lastName?.trim()  ?? "";
  return `${first} ${last}`.trim() || user?.name || "مربی";
}

/* ─── Court lines SVG per sport ─── */
function CourtLines({ sport }) {
  const s = { className: "absolute inset-0 w-full h-full", viewBox: "0 0 280 120", fill: "none", preserveAspectRatio: "xMidYMid slice", style: { opacity: 0.15 } };
  if (sport === "tennis" || sport === "padel") return (
    <svg {...s}><rect x="20" y="10" width="240" height="100" stroke="white" strokeWidth="1.5"/><line x1="20" y1="60" x2="260" y2="60" stroke="white" strokeWidth="2"/><line x1="140" y1="10" x2="140" y2="60" stroke="white" strokeWidth="1"/><line x1="140" y1="60" x2="140" y2="110" stroke="white" strokeWidth="1"/><line x1="50" y1="10" x2="50" y2="110" stroke="white" strokeWidth="0.8"/><line x1="230" y1="10" x2="230" y2="110" stroke="white" strokeWidth="0.8"/></svg>
  );
  if (sport === "squash") return (
    <svg {...s}><rect x="16" y="8" width="248" height="104" stroke="white" strokeWidth="2"/><line x1="16" y1="48" x2="264" y2="48" stroke="white" strokeWidth="1.5"/><line x1="140" y1="48" x2="140" y2="112" stroke="white" strokeWidth="1"/><line x1="16" y1="18" x2="264" y2="18" strokeDasharray="5 3" stroke="white" strokeWidth="1"/></svg>
  );
  if (sport === "badminton") return (
    <svg {...s}><rect x="18" y="8" width="244" height="104" stroke="white" strokeWidth="1.5"/><line x1="18" y1="60" x2="262" y2="60" stroke="white" strokeWidth="2"/><line x1="18" y1="28" x2="262" y2="28" stroke="white" strokeWidth="0.8"/><line x1="18" y1="92" x2="262" y2="92" stroke="white" strokeWidth="0.8"/><line x1="130" y1="8" x2="130" y2="28" stroke="white" strokeWidth="0.8"/><line x1="130" y1="92" x2="130" y2="112" stroke="white" strokeWidth="0.8"/></svg>
  );
  return (
    <svg {...s}><rect x="18" y="10" width="244" height="100" stroke="white" strokeWidth="1.5"/><line x1="18" y1="60" x2="262" y2="60" stroke="white" strokeWidth="1.5"/><line x1="140" y1="10" x2="140" y2="110" stroke="white" strokeWidth="1"/></svg>
  );
}

function ClassCard({ cls, index, onClick }) {
  const grad     = SPORT_GRADIENTS[cls.sportType] ?? "from-primary to-primary/80";
  const price    = Number(cls.price ?? 0);
  const isFull   = Number(cls.enrolledCount) >= Number(cls.capacity);
  const sessions = cls.sessionsCount ?? (Array.isArray(cls.sessions) ? cls.sessions.length : 0);
  const coach    = cls.coach ?? {};
  const coachName = getUserFullName(coach);
  const coachImg  = getProfileImage(coach.image);
  const enrolled  = Number(cls.enrolledCount ?? 0);
  const capacity  = Number(cls.capacity ?? 1);
  const pct       = capacity > 0 ? Math.min(100, Math.round((enrolled / capacity) * 100)) : 0;

  return (
    <motion.button
      type="button"
      onClick={() => onClick(cls, coach)}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, type: "spring", stiffness: 280, damping: 22 }}
      whileTap={{ scale: 0.97 }}
      className="w-full text-right rounded-[22px] overflow-hidden border border-border/60 bg-card shadow-sm active:shadow-md transition-all duration-200"
    >
      {/* ── Banner ── */}
      <div className={`relative h-28 bg-gradient-to-br ${grad} overflow-hidden`}>
        <CourtLines sport={cls.sportType} />

        {/* Speed streaks */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 280 112" fill="none" style={{ opacity: 0.07 }}>
          <line x1="310" y1="-10" x2="160" y2="130" stroke="white" strokeWidth="22"/>
          <line x1="270" y1="-10" x2="120" y2="130" stroke="white" strokeWidth="11"/>
        </svg>

        {/* Decorative rings */}
        <svg className="absolute -bottom-5 -right-5 w-20 h-20" viewBox="0 0 80 80" fill="none" style={{ opacity: 0.12 }}>
          <circle cx="40" cy="40" r="36" stroke="white" strokeWidth="2"/>
          <circle cx="40" cy="40" r="24" stroke="white" strokeWidth="1.5"/>
          <circle cx="40" cy="40" r="12" stroke="white" strokeWidth="1"/>
        </svg>

        {/* Bottom fade */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"/>

        {/* Level badge — top right */}
        <div className="absolute top-2.5 right-2.5">
          <span className="inline-flex items-center rounded-full bg-black/30 backdrop-blur-md border border-white/15 px-2.5 py-1 text-[10px] font-bold text-white">
            {LEVEL_LABELS[cls.level] ?? "همه سطوح"}
          </span>
        </div>

        {/* Price badge — top left */}
        <div className="absolute top-2.5 left-2.5">
          <span className={`inline-flex items-center rounded-full backdrop-blur-md border px-2.5 py-1 text-[11px] font-black ${price > 0 ? "bg-black/30 border-white/15 text-white" : "bg-emerald-500/80 border-emerald-400/40 text-white"}`}>
            {price > 0 ? `${formatToman(price)} ت` : "رایگان"}
          </span>
        </div>

        {/* Title + sport — bottom */}
        <div className="absolute bottom-0 inset-x-0 px-3.5 pb-3">
          <h3 className="text-[14px] font-black text-white leading-snug line-clamp-1">{cls.title}</h3>
          <p className="text-[11px] text-white/70 mt-0.5">
            {SPORT_EMOJI[cls.sportType] ?? "🏅"} {cls.sportType === "tennis" ? "تنیس" : cls.sportType === "padel" ? "پدل" : cls.sportType === "squash" ? "اسکواش" : cls.sportType === "badminton" ? "بدمینتون" : cls.sportType === "ping-pong" ? "پینگ‌پنگ" : cls.sportType}
          </p>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="px-3.5 pt-3 pb-3.5">
        {/* Coach row */}
        <div className="flex items-center gap-2 mb-2.5">
          {coachImg ? (
            <img src={coachImg} alt={coachName} className="w-7 h-7 rounded-full object-cover ring-2 ring-border shrink-0"/>
          ) : (
            <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center text-[11px] text-primary font-black ring-2 ring-border shrink-0">
              {coachName.charAt(0)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <span className="text-[12px] font-bold text-foreground truncate">{coachName}</span>
              {coach.coachVerificationStatus === "verified" && (
                <BadgeCheckIcon className="w-3.5 h-3.5 text-primary shrink-0"/>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground">مربی</p>
          </div>
          <ChevronLeftIcon className="w-4 h-4 text-muted-foreground/40 shrink-0"/>
        </div>

        {/* Divider */}
        <div className="h-px bg-border/50 mb-2.5"/>

        {/* Stats row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {sessions > 0 && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <CalendarDaysIcon className="w-3.5 h-3.5"/>
                <span className="text-[11px] font-medium">{sessions} جلسه</span>
              </div>
            )}
            <div className="flex items-center gap-1 text-muted-foreground">
              <UsersIcon className="w-3.5 h-3.5"/>
              <span className="text-[11px] font-medium">{enrolled}/{capacity}</span>
            </div>
          </div>

          {/* Capacity bar */}
          <div className="flex-1 max-w-[80px]">
            <div className="h-1.5 rounded-full bg-border overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${isFull ? "bg-red-500" : pct > 70 ? "bg-amber-500" : "bg-emerald-500"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            {isFull && (
              <p className="text-[9px] text-red-500 font-bold mt-0.5 text-left">تکمیل</p>
            )}
          </div>
        </div>
      </div>
    </motion.button>
  );
}

export default function ClubClasses({ clubId }) {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (!clubId) return;
    setLoading(true);
    coachService
      .getClassesByClub(clubId)
      .then((list) => setClasses(Array.isArray(list) ? list : []))
      .catch(() => setClasses([]))
      .finally(() => setLoading(false));
  }, [clubId]);

  if (loading) {
    return (
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div className="h-5 w-28 bg-muted rounded-lg animate-pulse"/>
          <div className="h-6 w-14 bg-muted rounded-full animate-pulse"/>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[0, 1].map((i) => (
            <div key={i} className="rounded-[22px] overflow-hidden border border-border/50">
              <div className="h-28 bg-muted animate-pulse"/>
              <div className="p-3.5 space-y-2">
                <div className="h-3 bg-muted rounded animate-pulse w-3/4"/>
                <div className="h-3 bg-muted rounded animate-pulse w-1/2"/>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!classes.length) return null;

  return (
    <>
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-violet-500/15 flex items-center justify-center ring-1 ring-violet-500/20">
            <GraduationCapIcon className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400"/>
          </div>
          <h2 className="font-bold text-foreground text-base">کلاس‌های موجود</h2>
        </div>
        <span className="rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 px-3 py-1 text-xs font-bold ring-1 ring-violet-500/20">
          {classes.length} کلاس
        </span>
      </div>

      {/* 2-col grid */}
      <div className="grid grid-cols-2 gap-3">
        {classes.map((cls, i) => (
          <ClassCard
            key={cls.id}
            cls={cls}
            index={i}
            onClick={(c, coach) => setSelected({ cls: c, coach })}
          />
        ))}
      </div>

      {selected && (
        <ClassDetailSheet
          cls={selected.cls}
          coachName={getUserFullName(selected.coach)}
          coachImage={getProfileImage(selected.coach?.image)}
          coachId={selected.coach?.id}
          coachVerificationStatus={selected.coach?.coachVerificationStatus}
          open={!!selected}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
