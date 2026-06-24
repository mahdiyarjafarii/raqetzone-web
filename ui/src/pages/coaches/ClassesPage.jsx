import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  SearchIcon,
  FilterIcon,
  UsersIcon,
  CalendarDaysIcon,
  MapPinIcon,
  SparklesIcon,
  XIcon,
  SlidersHorizontalIcon,
} from "lucide-react";

import { coachService } from "@/services/coachService";
import ClassDetailSheet from "@/features/coaches/components/ClassDetailSheet";

const LEVEL_LABELS = {
  all: "✨ همه سطوح",
  beginner: "🌱 مبتدی",
  intermediate: "⚡ متوسط",
  advanced: "🔥 پیشرفته",
};

const SPORT_LABELS = {
  padel: "🥎 پدل",
  tennis: "🎾 تنیس",
  squash: "🟡 اسکواش",
  badminton: "🏸 بدمینتون",
  "ping-pong": "🏓 پینگ‌پنگ",
};

const SPORT_GRADIENTS = {
  tennis: "from-[#1a6b3c] to-[#16a34a]",
  padel: "from-[#1e3a8a] to-[#3b82f6]",
  squash: "from-[#7c2d12] to-[#f59e0b]",
  badminton: "from-[#4c1d95] to-[#a78bfa]",
  "ping-pong": "from-[#134e4a] to-[#2dd4bf]",
};

const LEVEL_COLORS = {
  all: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  beginner: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  intermediate: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  advanced: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
};

function formatToman(value) {
  return Number(value || 0).toLocaleString("fa-IR");
}

function formatClassDate(dateKey) {
  if (!dateKey) return "—";
  try {
    return new Date(`${dateKey}T00:00:00`).toLocaleDateString("fa-IR", { month: "long", day: "numeric" });
  } catch {
    return dateKey;
  }
}

function getProfileImage(image) {
  if (!image) return null;
  if (image.startsWith("http")) return image;
  return `${import.meta.env.VITE_WEBSITE_URL}/uploads/user/${image}`;
}

function getUserFullName(user) {
  const firstName = typeof user?.firstName === "string" ? user.firstName.trim() : "";
  const lastName = typeof user?.lastName === "string" ? user.lastName.trim() : "";
  return `${firstName} ${lastName}`.trim() || user?.name || "";
}

function ClassCard({ cls, coach, index, onClick }) {
  const isFull = Number(cls.enrolledCount) >= Number(cls.capacity);
  const sessionsCount = cls.sessionsCount ?? (Array.isArray(cls.sessions) ? cls.sessions.length : 0);
  const sportGrad = SPORT_GRADIENTS[cls.sportType] ?? "from-primary to-primary/70";
  const price = Number(cls.price ?? 0);
  const coachName = getUserFullName(coach) || "مربی رکت‌زون";
  const coachImg = getProfileImage(coach?.image);

  return (
    <motion.button
      type="button"
      onClick={() => onClick(cls, coach)}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: Math.min(index * 0.04, 0.3) }}
      className="w-full text-right rounded-[24px] overflow-hidden border border-border bg-card shadow-sm active:scale-[0.98] transition-transform hover:shadow-lg hover:border-primary/30"
    >
      {/* Mini banner */}
      <div className={`relative h-28 bg-gradient-to-br ${sportGrad} overflow-hidden`}>
        {[
          { top: "8%", left: "10%", size: 50, rotate: -18, opacity: 0.12 },
          { top: "45%", left: "60%", size: 80, rotate: 10, opacity: 0.08 },
          { top: "15%", left: "78%", size: 36, rotate: -8, opacity: 0.10 },
        ].map((p, i) => (
          <span
            key={i}
            className="absolute select-none pointer-events-none leading-none"
            style={{ top: p.top, left: p.left, fontSize: p.size, opacity: p.opacity, transform: `rotate(${p.rotate}deg)` }}
          >
            {SPORT_LABELS[cls.sportType]?.split(" ")[0] ?? "🎾"}
          </span>
        ))}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/5 to-transparent" />

        {/* Level */}
        <div className={`absolute top-2.5 right-2.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/30 backdrop-blur-sm text-white text-[10px] font-black`}>
          {LEVEL_LABELS[cls.level] ?? "✨ همه سطوح"}
        </div>

        {/* Price */}
        <div className="absolute top-2.5 left-2.5 inline-flex items-center rounded-full bg-black/30 backdrop-blur-sm px-2.5 py-1 text-[11px] font-black text-white">
          {price > 0 ? `${formatToman(price)} ت` : "رایگان"}
        </div>

        {/* Title at bottom */}
        <div className="absolute bottom-0 inset-x-0 px-3 pb-2.5">
          <h3 className="text-sm font-black text-white leading-tight line-clamp-1">{cls.title}</h3>
          <p className="text-[10px] text-white/70 mt-0.5">{SPORT_LABELS[cls.sportType] ?? "ورزش"} • {cls.city || "نامشخص"}</p>
        </div>
      </div>

      {/* Card body */}
      <div className="px-3 py-3 space-y-2.5">
        {/* Coach */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg overflow-hidden bg-muted shrink-0">
            {coachImg ? (
              <img src={coachImg} alt={coachName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[10px] font-black text-muted-foreground">
                {coachName?.[0] ?? "م"}
              </div>
            )}
          </div>
          <span className="text-[11px] text-muted-foreground font-medium truncate">{coachName}</span>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <UsersIcon className="w-3 h-3" />
            {cls.enrolledCount ?? 0}/{cls.capacity}
          </span>
          <span>•</span>
          <span className="inline-flex items-center gap-1">
            <CalendarDaysIcon className="w-3 h-3" />
            {sessionsCount} جلسه
          </span>
          {(cls.startDate) && (
            <>
              <span>•</span>
              <span>{formatClassDate(cls.startDate)}</span>
            </>
          )}
        </div>

        {/* Status */}
        {isFull ? (
          <div className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 text-rose-500 px-2.5 py-1 text-[10px] font-bold">
            ظرفیت تکمیل شده
          </div>
        ) : (
          <div className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 text-[10px] font-bold">
            <SparklesIcon className="w-2.5 h-2.5" />
            ظرفیت خالی
          </div>
        )}
      </div>
    </motion.button>
  );
}

export default function ClassesPage() {
  const [coaches, setCoaches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterLevel, setFilterLevel] = useState("all");
  const [filterSport, setFilterSport] = useState("all");
  const [filterCoach, setFilterCoach] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedCoach, setSelectedCoach] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { ok, data } = await coachService.getCoaches();
      if (ok) setCoaches(Array.isArray(data?.coaches) ? data.coaches : []);
      setLoading(false);
    };
    load();
  }, []);

  const allClasses = useMemo(() => {
    const result = [];
    coaches.forEach((coach) => {
      if (Array.isArray(coach.classes)) {
        coach.classes.forEach((cls) => result.push({ cls, coach }));
      }
    });
    return result;
  }, [coaches]);

  const coachOptions = useMemo(() => {
    return coaches.filter((c) => Array.isArray(c.classes) && c.classes.length > 0);
  }, [coaches]);

  const filtered = useMemo(() => {
    return allClasses.filter(({ cls, coach }) => {
      if (filterLevel !== "all" && cls.level !== filterLevel) return false;
      if (filterSport !== "all" && cls.sportType !== filterSport) return false;
      if (filterCoach !== "all" && coach.id !== filterCoach) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const name = getUserFullName(coach).toLowerCase();
        const title = (cls.title ?? "").toLowerCase();
        if (!title.includes(q) && !name.includes(q) && !(cls.city ?? "").includes(q)) return false;
      }
      return true;
    });
  }, [allClasses, search, filterLevel, filterSport, filterCoach]);

  const activeFilters = [filterLevel !== "all", filterSport !== "all", filterCoach !== "all"].filter(Boolean).length;

  const openSheet = (cls, coach) => {
    setSelectedClass(cls);
    setSelectedCoach(coach);
    setSheetOpen(true);
  };

  const clearFilters = () => {
    setFilterLevel("all");
    setFilterSport("all");
    setFilterCoach("all");
  };

  return (
    <div className="px-3 py-4 sm:px-4 space-y-4" dir="rtl">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-xl font-black text-foreground">کلاس‌های ورزشی</h1>
        <p className="text-xs text-muted-foreground">از میان بهترین کلاس‌ها انتخاب کن و ثبت‌نام کن</p>
      </div>

      {/* Search + Filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجوی کلاس، مربی یا شهر..."
            className="h-10 w-full rounded-xl border border-border bg-card pr-9 pl-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
          />
        </div>
        <button
          type="button"
          onClick={() => setShowFilters((v) => !v)}
          className={`h-10 w-10 rounded-xl border flex items-center justify-center relative transition-colors ${showFilters ? "bg-primary text-primary-foreground border-primary" : "border-border bg-card text-muted-foreground"}`}
        >
          <SlidersHorizontalIcon className="w-4 h-4" />
          {activeFilters > 0 && (
            <span className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-black flex items-center justify-center">
              {activeFilters}
            </span>
          )}
        </button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="rounded-2xl border border-border bg-card p-3 space-y-3"
        >
          {/* Level filter */}
          <div>
            <p className="text-[11px] text-muted-foreground font-medium mb-2">سطح</p>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(LEVEL_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilterLevel(key)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors ${filterLevel === key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Sport filter */}
          <div>
            <p className="text-[11px] text-muted-foreground font-medium mb-2">ورزش</p>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setFilterSport("all")}
                className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors ${filterSport === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
              >
                همه
              </button>
              {Object.entries(SPORT_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilterSport(key)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors ${filterSport === key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Coach filter */}
          {coachOptions.length > 0 && (
            <div>
              <p className="text-[11px] text-muted-foreground font-medium mb-2">مربی</p>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setFilterCoach("all")}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors ${filterCoach === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                >
                  همه مربیان
                </button>
                {coachOptions.map((coach) => (
                  <button
                    key={coach.id}
                    type="button"
                    onClick={() => setFilterCoach(coach.id)}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors ${filterCoach === coach.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                  >
                    {getUserFullName(coach) || "مربی"}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeFilters > 0 && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1 text-[11px] text-rose-500 font-bold"
            >
              <XIcon className="w-3 h-3" />
              پاک کردن فیلترها
            </button>
          )}
        </motion.div>
      )}

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-52 rounded-[24px] bg-muted animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <SparklesIcon className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground font-medium">کلاسی یافت نشد.</p>
          {activeFilters > 0 && (
            <button type="button" onClick={clearFilters} className="mt-2 text-xs text-primary font-bold">
              پاک کردن فیلترها
            </button>
          )}
        </div>
      ) : (
        <>
          <p className="text-[11px] text-muted-foreground">{filtered.length} کلاس یافت شد</p>
          <div className="grid grid-cols-2 gap-3">
            {filtered.map(({ cls, coach }, index) => (
              <ClassCard
                key={cls.id}
                cls={cls}
                coach={coach}
                index={index}
                onClick={openSheet}
              />
            ))}
          </div>
        </>
      )}

      <ClassDetailSheet
        cls={selectedClass}
        coachName={selectedCoach ? getUserFullName(selectedCoach) || "مربی رکت‌زون" : ""}
        coachImage={selectedCoach?.image}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
      />
    </div>
  );
}
