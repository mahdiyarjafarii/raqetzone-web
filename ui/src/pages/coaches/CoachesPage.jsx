import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAtomValue } from "jotai";
import { motion } from "framer-motion";
import {
  SearchIcon,
  BadgeCheckIcon,
  MapPinIcon,
  BriefcaseBusinessIcon,
  BanknoteIcon,
  SparklesIcon,
  ArrowLeftIcon,
  StarIcon,
} from "lucide-react";

import { currentUserAtom } from "@/config/state";
import { coachService } from "@/services/coachService";

const SPORT_GRADIENTS = {
  padel:    "from-emerald-500 via-teal-500 to-cyan-600",
  tennis:   "from-lime-500 via-yellow-400 to-amber-500",
  squash:   "from-orange-500 via-rose-500 to-pink-600",
  badminton:"from-sky-500 via-blue-500 to-indigo-600",
  "ping-pong":"from-violet-500 via-purple-500 to-fuchsia-600",
};

const SPORT_PATTERNS = {
  padel:    "🥎",
  tennis:   "🎾",
  squash:   "🟡",
  badminton:"🏸",
  "ping-pong":"🏓",
};

const SPORT_LABELS = {
  padel: "🥎 پدل",
  tennis: "🎾 تنیس",
  squash: "🟡 اسکواش",
  badminton: "🏸 بدمینتون",
  "ping-pong": "🏓 پینگ‌پنگ",
};

function getSportLabel(sport) {
  if (!sport) return "🥎 پدل";
  return SPORT_LABELS[sport] ?? sport;
}

function getUserFullName(user) {
  const firstName = typeof user?.firstName === "string" ? user.firstName.trim() : "";
  const lastName = typeof user?.lastName === "string" ? user.lastName.trim() : "";
  const fullName = `${firstName} ${lastName}`.trim();
  return fullName || user?.name || "";
}

function getProfileImage(image) {
  if (!image) return null;
  if (image.startsWith("http")) return image;
  return `${import.meta.env.VITE_WEBSITE_URL}/uploads/user/${image}`;
}

export default function CoachesPage() {
  const currentUser = useAtomValue(currentUserAtom);
  const [coaches, setCoaches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { ok, data } = await coachService.getCoaches();
      if (ok) {
        setCoaches(Array.isArray(data?.coaches) ? data.coaches : []);
      }
      setLoading(false);
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    const visibleCoaches = coaches.filter((coach) => {
      if (!currentUser?.isCoach) return true;
      return coach.id !== currentUser.id;
    });

    if (!search.trim()) return visibleCoaches;
    const q = search.trim();
    return visibleCoaches.filter((coach) => {
      const fullName = getUserFullName(coach);
      return fullName.includes(q) || coach.city?.includes(q) || coach.favoriteSport?.includes(q);
    });
  }, [coaches, currentUser?.id, currentUser?.isCoach, search]);

  return (
    <div className="px-3 py-4 sm:px-4 space-y-4" dir="rtl">
      <div className="space-y-1">
        <h1 className="text-xl font-black text-foreground">مربی‌ها</h1>
        <p className="text-xs text-muted-foreground">مربی مناسب خودت رو انتخاب کن: کلاس، جلسه خصوصی، پیام مستقیم</p>
      </div>

      <div className="relative">
        <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="جستجوی مربی، شهر یا ورزش..."
          className="h-10 w-full rounded-xl border border-border bg-card pr-9 pl-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-3">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="h-28 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          {currentUser?.isCoach ? "در حال حاضر مربی دیگری برای نمایش پیدا نشد." : "مربی‌ای پیدا نشد."}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filtered.map((coach, index) => {
            const fullName = getUserFullName(coach) || "مربی رکت‌زون";
            const imageSrc = getProfileImage(coach.image);
            const rating = Number(coach.rating ?? coach.reviewStats?.average ?? 0);
            const reviewsCount = Number(coach.reviewsCount ?? coach.reviewStats?.total ?? 0);
            return (
              <motion.div
                key={coach.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: Math.min(index * 0.05, 0.3) }}
              >
                <Link
                  to={`/coaches/${coach.id}`}
                  className="group relative block overflow-hidden rounded-[26px] border border-border/70 bg-card shadow-sm transition-all active:scale-[0.99] hover:shadow-lg hover:border-primary/30"
                >
                  <div className={`relative h-28 overflow-hidden bg-gradient-to-br ${SPORT_GRADIENTS[coach.favoriteSport] ?? "from-primary via-primary/80 to-sky-600"}`}>
                    {/* scattered emoji pattern */}
                    {[
                      { top: "8%",  left: "12%", size: 28, rotate: -18, opacity: 0.18 },
                      { top: "50%", left: "38%", size: 56, rotate:  10, opacity: 0.13 },
                      { top: "15%", left: "68%", size: 36, rotate: -30, opacity: 0.16 },
                      { top: "55%", left: "80%", size: 24, rotate:  20, opacity: 0.20 },
                      { top: "30%", left: "92%", size: 18, rotate:  -8, opacity: 0.14 },
                    ].map((p, i) => (
                      <span
                        key={i}
                        className="absolute select-none pointer-events-none leading-none"
                        style={{ top: p.top, left: p.left, fontSize: p.size, opacity: p.opacity, transform: `rotate(${p.rotate}deg)` }}
                      >
                        {SPORT_PATTERNS[coach.favoriteSport] ?? "🎾"}
                      </span>
                    ))}
                    {/* radial light spot */}
                    <div className="pointer-events-none absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/15 blur-2xl" />
                    {/* bottom fade */}
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent" />
                    {(coach.activeClassesCount ?? 0) > 0 && (
                      <div className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-black/25 px-2.5 py-1 text-[10px] font-black text-white backdrop-blur-sm border border-white/10">
                        <SparklesIcon className="w-3 h-3" />
                        {coach.activeClassesCount} کلاس فعال
                      </div>
                    )}
                  </div>

                  <div className="relative z-10 px-4 pb-4">
                    <div className="-mt-9 flex items-end justify-between gap-3">
                      <div className="h-20 w-20 rounded-2xl overflow-hidden bg-muted ring-4 ring-card shadow-lg">
                        {imageSrc ? (
                          <img src={imageSrc} alt={fullName} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-2xl font-black text-muted-foreground">
                            {fullName?.[0] ?? "م"}
                          </div>
                        )}
                      </div>

                      {reviewsCount > 0 && (
                        <div className="mb-1 inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-500/15 px-2.5 py-1 text-[11px] font-black text-amber-600 dark:text-amber-400">
                          <StarIcon className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          {rating.toFixed(1)}
                          <span className="font-medium text-amber-600/70 dark:text-amber-400/70">({reviewsCount})</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-2 flex items-center gap-1.5">
                      <p className="text-base font-black text-foreground truncate">{fullName}</p>
                      <BadgeCheckIcon className={`w-4 h-4 shrink-0 ${coach.coachVerificationStatus === "approved" ? "text-emerald-500" : "text-muted-foreground/40"}`} />
                    </div>

                    <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPinIcon className="w-3.5 h-3.5" />
                      <span>{coach.city || "نامشخص"}</span>
                      <span>•</span>
                      <span>{getSportLabel(coach.favoriteSport)}</span>
                    </div>

                    {coach.coachHeadline && (
                      <p className="mt-2 text-xs text-foreground/85 line-clamp-1">{coach.coachHeadline}</p>
                    )}
                    {coach.bio && <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{coach.bio}</p>}

                    {(coach.coachExperienceYears || coach.coachHourlyPrice) && (
                      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                        {coach.coachExperienceYears ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1">
                            <BriefcaseBusinessIcon className="w-3.5 h-3.5 text-primary" />
                            {coach.coachExperienceYears} سال تجربه
                          </span>
                        ) : null}
                        {coach.coachHourlyPrice ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1">
                            <BanknoteIcon className="w-3.5 h-3.5 text-primary" />
                            {Number(coach.coachHourlyPrice).toLocaleString("fa-IR")} ت / جلسه
                          </span>
                        ) : null}
                      </div>
                    )}

                    <div className="mt-3 flex items-center justify-center gap-1.5 rounded-2xl bg-primary/10 py-2.5 text-[12px] font-black text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                      مشاهده پروفایل مربی
                      <ArrowLeftIcon className="h-4 w-4" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
