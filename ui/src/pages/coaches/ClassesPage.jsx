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
  all: "همه سطوح",
  beginner: "مبتدی",
  intermediate: "متوسط",
  advanced: "پیشرفته",
};

const LEVEL_FILTER_LABELS = {
  all: "✨ همه سطوح",
  beginner: "🌱 مبتدی",
  intermediate: "⚡ متوسط",
  advanced: "🔥 پیشرفته",
};

const SPORT_LABELS = {
  padel: "پدل",
  tennis: "تنیس",
  squash: "اسکواش",
  badminton: "بدمینتون",
  "ping-pong": "پینگ‌پنگ",
};

const SPORT_FILTER_LABELS = {
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

function SportCourtPattern({ sportType }) {
  const props = {
    className: "absolute inset-0 w-full h-full",
    viewBox: "0 0 360 144",
    fill: "none",
    preserveAspectRatio: "xMidYMid slice",
    style: { opacity: 0.18 },
  };

  if (sportType === "tennis" || sportType === "padel") {
    return (
      <svg {...props}>
        <rect x="40" y="8" width="280" height="128" stroke="white" strokeWidth="2" />
        <line x1="72" y1="8" x2="72" y2="136" stroke="white" strokeWidth="1" />
        <line x1="288" y1="8" x2="288" y2="136" stroke="white" strokeWidth="1" />
        <line x1="40" y1="72" x2="320" y2="72" stroke="white" strokeWidth="2.5" />
        <line x1="180" y1="8" x2="180" y2="72" stroke="white" strokeWidth="1" />
        <line x1="180" y1="72" x2="180" y2="136" stroke="white" strokeWidth="1" />
        <line x1="72" y1="40" x2="288" y2="40" stroke="white" strokeWidth="1" />
        <line x1="72" y1="104" x2="288" y2="104" stroke="white" strokeWidth="1" />
      </svg>
    );
  }
  if (sportType === "squash") {
    return (
      <svg {...props}>
        <rect x="28" y="8" width="304" height="128" stroke="white" strokeWidth="2.5" />
        <line x1="28" y1="62" x2="332" y2="62" stroke="white" strokeWidth="2" />
        <line x1="180" y1="62" x2="180" y2="136" stroke="white" strokeWidth="1.5" />
        <line x1="90" y1="8" x2="90" y2="62" stroke="white" strokeWidth="1" />
        <line x1="270" y1="8" x2="270" y2="62" stroke="white" strokeWidth="1" />
        <line x1="90" y1="34" x2="270" y2="34" stroke="white" strokeWidth="1" />
        <line x1="90" y1="100" x2="270" y2="100" stroke="white" strokeWidth="1" />
        <line x1="28" y1="22" x2="332" y2="22" stroke="white" strokeWidth="1.5" strokeDasharray="6 4" />
      </svg>
    );
  }
  if (sportType === "badminton") {
    return (
      <svg {...props}>
        <rect x="32" y="8" width="296" height="128" stroke="white" strokeWidth="2" />
        <line x1="32" y1="72" x2="328" y2="72" stroke="white" strokeWidth="2.5" />
        <line x1="32" y1="34" x2="328" y2="34" stroke="white" strokeWidth="1" />
        <line x1="32" y1="110" x2="328" y2="110" stroke="white" strokeWidth="1" />
        <line x1="163" y1="8" x2="163" y2="34" stroke="white" strokeWidth="1" />
        <line x1="163" y1="110" x2="163" y2="136" stroke="white" strokeWidth="1" />
        <line x1="62" y1="8" x2="62" y2="136" stroke="white" strokeWidth="1" />
        <line x1="298" y1="8" x2="298" y2="136" stroke="white" strokeWidth="1" />
        <line x1="32" y1="20" x2="328" y2="20" stroke="white" strokeWidth="1" />
        <line x1="32" y1="124" x2="328" y2="124" stroke="white" strokeWidth="1" />
      </svg>
    );
  }
  if (sportType === "ping-pong") {
    return (
      <svg {...props}>
        <rect x="18" y="18" width="324" height="108" rx="6" stroke="white" strokeWidth="2.5" />
        <line x1="180" y1="18" x2="180" y2="126" stroke="white" strokeWidth="3.5" />
        <line x1="18" y1="72" x2="342" y2="72" stroke="white" strokeWidth="1" />
        <line x1="48" y1="18" x2="48" y2="126" stroke="white" strokeWidth="1" strokeOpacity="0.5" />
        <line x1="312" y1="18" x2="312" y2="126" stroke="white" strokeWidth="1" strokeOpacity="0.5" />
        <circle cx="180" cy="72" r="14" stroke="white" strokeWidth="1" />
      </svg>
    );
  }
  return (
    <svg {...props}>
      <rect x="30" y="8" width="300" height="128" stroke="white" strokeWidth="2" />
      <line x1="30" y1="72" x2="330" y2="72" stroke="white" strokeWidth="2" />
      <line x1="180" y1="8" x2="180" y2="136" stroke="white" strokeWidth="1.5" />
    </svg>
  );
}

function ClassCard({ cls, coach, index, onClick }) {
  const isFull = Number(cls.enrolledCount) >= Number(cls.capacity);
  const sessionsCount = cls.sessionsCount ?? (Array.isArray(cls.sessions) ? cls.sessions.length : 0);
  const sportGrad = SPORT_GRADIENTS[cls.sportType] ?? "from-primary to-primary/70";
  const price = Number(cls.price ?? 0);
  const coachName = getUserFullName(coach) || "مربی رکت‌زون";
  const coachImg = getProfileImage(coach?.image);
  const enrolled = Number(cls.enrolledCount ?? 0);
  const capacity = Number(cls.capacity ?? 1);
  const capacityPercent = capacity > 0 ? Math.min(100, Math.round((enrolled / capacity) * 100)) : 0;

  return (
    <motion.button
      type="button"
      onClick={() => onClick(cls, coach)}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.05, 0.35) }}
      className="w-full text-right rounded-[22px] overflow-hidden border border-border bg-card shadow-sm active:scale-[0.985] transition-all duration-200 hover:shadow-lg hover:border-primary/25 cursor-pointer"
    >
      {/* Banner */}
      <div className={`relative h-36 bg-gradient-to-br ${sportGrad} overflow-hidden`}>
        {/* Sport court lines */}
        <SportCourtPattern sportType={cls.sportType} />
        {/* Speed streak lines */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 360 144" fill="none" style={{ opacity: 0.07 }}>
          <line x1="390" y1="-10" x2="200" y2="160" stroke="white" strokeWidth="28" />
          <line x1="340" y1="-10" x2="150" y2="160" stroke="white" strokeWidth="14" />
        </svg>
        {/* Decorative rings bottom-right */}
        <svg className="absolute -bottom-6 -right-6 w-28 h-28" viewBox="0 0 112 112" fill="none" style={{ opacity: 0.1 }}>
          <circle cx="56" cy="56" r="50" stroke="white" strokeWidth="2.5" />
          <circle cx="56" cy="56" r="36" stroke="white" strokeWidth="2" />
          <circle cx="56" cy="56" r="22" stroke="white" strokeWidth="1.5" />
        </svg>
        {/* Glow top-left */}
        <div className="absolute -top-6 -left-6 w-28 h-28 rounded-full bg-white/20 blur-2xl" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />

        {/* Top-right: level badge */}
        <div className="absolute top-3 right-3">
          <span className="inline-flex items-center rounded-full bg-black/30 backdrop-blur-md border border-white/15 px-2.5 py-1 text-[10px] font-bold text-white">
            {LEVEL_LABELS[cls.level] ?? "همه سطوح"}
          </span>
        </div>

        {/* Top-left: price badge */}
        <div className="absolute top-3 left-3">
          <span className={`inline-flex items-center rounded-full backdrop-blur-md border px-2.5 py-1 text-[11px] font-black ${price > 0 ? "bg-black/30 border-white/15 text-white" : "bg-emerald-500/80 border-emerald-400/40 text-white"}`}>
            {price > 0 ? `${formatToman(price)} ت` : "رایگان"}
          </span>
        </div>

        {/* Bottom: title + sport + city + location */}
        <div className="absolute bottom-0 inset-x-0 px-4 pb-3.5">
          <h3 className="text-[15px] font-black text-white leading-snug line-clamp-1">{cls.title}</h3>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-[11px] text-white/75 font-medium">{SPORT_LABELS[cls.sportType] ?? "ورزش"}</span>
            {cls.city && (
              <>
                <span className="text-white/35 text-[10px]">|</span>
                <span className="inline-flex items-center gap-1 text-[11px] text-white/75 font-medium">
                  <MapPinIcon className="w-3 h-3 shrink-0" />
                  {cls.city}
                </span>
              </>
            )}
            {cls.location && (
              <>
                <span className="text-white/35 text-[10px]">•</span>
                <span className="text-[11px] text-white/65 font-medium truncate max-w-[120px]">{cls.location}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Card body */}
      <div className="px-4 pt-3.5 pb-4 space-y-3.5">

        {/* Coach + Status row */}
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-2xl overflow-hidden bg-primary/10 shrink-0 ring-2 ring-border">
            {coachImg ? (
              <img src={coachImg} alt={coachName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-base font-black text-primary">
                {coachName?.[0] ?? "م"}
              </div>
            )}
          </div>
          {/* Name */}
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-muted-foreground leading-none mb-1">مربی کلاس</p>
            <p className="text-sm font-bold text-foreground leading-none truncate">{coachName}</p>
          </div>
          {/* Status */}
          {isFull ? (
            <span className="shrink-0 inline-flex items-center rounded-full bg-rose-500/10 text-rose-500 px-2.5 py-1 text-[10px] font-bold">
              ظرفیت تکمیل
            </span>
          ) : (
            <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 text-[10px] font-bold">
              <SparklesIcon className="w-2.5 h-2.5" />
              ظرفیت خالی
            </span>
          )}
        </div>

        {/* Divider */}
        <div className="h-px bg-border/70" />

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="space-y-0.5">
            <p className="text-[10px] text-muted-foreground">شرکت‌کننده</p>
            <div className="flex items-center justify-center gap-1 text-[12px] font-bold text-foreground">
              <UsersIcon className="w-3 h-3 text-muted-foreground" />
              {enrolled}/{capacity}
            </div>
          </div>
          <div className="space-y-0.5 border-x border-border/50">
            <p className="text-[10px] text-muted-foreground">تعداد جلسه</p>
            <div className="flex items-center justify-center gap-1 text-[12px] font-bold text-foreground">
              <CalendarDaysIcon className="w-3 h-3 text-muted-foreground" />
              {sessionsCount}
            </div>
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] text-muted-foreground">شروع</p>
            <p className="text-[12px] font-bold text-foreground leading-none">
              {cls.startDate ? formatClassDate(cls.startDate) : "—"}
            </p>
          </div>
        </div>

        {/* Capacity progress bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>ظرفیت اشغال شده</span>
            <span className="font-bold">{capacityPercent}٪</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${isFull ? "bg-rose-500" : capacityPercent >= 70 ? "bg-amber-500" : "bg-emerald-500"}`}
              style={{ width: `${capacityPercent}%` }}
            />
          </div>
        </div>

      </div>
    </motion.button>
  );
}

export default function ClassesPage() {
  const [allClasses, setAllClasses] = useState([]);
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
      const { ok, data } = await coachService.getAllClasses();
      if (ok) {
        const classes = Array.isArray(data?.classes) ? data.classes : [];
        setAllClasses(classes.map((cls) => ({ cls, coach: cls.coach })));
      }
      setLoading(false);
    };
    load();
  }, []);

  const coachOptions = useMemo(() => {
    const seen = new Set();
    return allClasses
      .map(({ coach }) => coach)
      .filter((coach) => coach?.id && !seen.has(coach.id) && seen.add(coach.id));
  }, [allClasses]);

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
              {Object.entries(LEVEL_FILTER_LABELS).map(([key, label]) => (
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
              {Object.entries(SPORT_FILTER_LABELS).map(([key, label]) => (
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
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 rounded-[24px] bg-muted animate-pulse" />
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
          <div className="flex flex-col gap-3">
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
        coachId={selectedCoach?.id}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
      />
    </div>
  );
}
