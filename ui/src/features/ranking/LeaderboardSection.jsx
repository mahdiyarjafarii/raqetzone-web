import React, { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDownIcon, ArrowUpIcon, CrownIcon, MinusIcon, RefreshCwIcon, TrophyIcon } from "lucide-react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { rankingService } from "@/services/rankingService";
import { cn } from "@/lib/utils";
import { useAtomValue } from "jotai";
import { currentUserAtom } from "@/config/state";
import UserAvatar from "@/components/ui/UserAvatar";
import UserProfileSheet from "@/components/ui/UserProfileSheet";

const SPORT_OPTIONS = [
  { value: "padel", label: "پدل" },
  { value: "tennis", label: "تنیس" },
];

const PERSIAN_MONTHS = [
  "", "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
];

const PODIUM = {
  1: { medal: "🥇", bar: "bg-amber-400", ring: "ring-amber-400/60", label: "text-amber-500", avatarSize: "w-14 h-14 text-sm" },
  2: { medal: "🥈", bar: "bg-slate-400", ring: "ring-slate-400/50", label: "text-slate-400", avatarSize: "w-12 h-12 text-xs" },
  3: { medal: "🥉", bar: "bg-orange-400", ring: "ring-orange-400/50", label: "text-orange-400", avatarSize: "w-12 h-12 text-xs" },
};

function getDisplayName(row) {
  if (row?.name && String(row.name).trim()) return String(row.name).trim();
  const composed = [row?.firstName, row?.lastName].filter(Boolean).join(" ").trim();
  return composed || `بازیکن ${row?.rank ?? "-"}`;
}

function TrendIcon({ trend }) {
  if (trend === "up") return <ArrowUpIcon className="w-3 h-3 text-emerald-500" />;
  if (trend === "down") return <ArrowDownIcon className="w-3 h-3 text-red-500" />;
  return <MinusIcon className="w-3 h-3 text-muted-foreground" />;
}

/** Top-3 podium — fixed layout: rank2 | rank1 | rank3 */
function Podium({ top3, currentUserId, onSelect }) {
  // order: 2nd place left, 1st center, 3rd right
  const ordered = [top3[1], top3[0], top3[2]].filter(Boolean);

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="px-3 pt-3 pb-0">
        <span className="text-xs font-black flex items-center gap-1.5">
          <TrophyIcon className="w-3.5 h-3.5 text-amber-500" />
          برترین‌های این ماه
        </span>
      </div>

      {/* Avatar + name row — all same height */}
      <div className="grid grid-cols-3 gap-2 px-3 pt-3 pb-5">
        {ordered.map((row) => {
          if (!row) return <div key="empty" />;
          const p = PODIUM[row.rank];
          const isMe = currentUserId && String(row.userId) === String(currentUserId);
          return (
            <button
              key={row.userId}
              type="button"
              onClick={() => onSelect(row)}
              className={cn(
                "flex flex-col items-center gap-1.5 focus:outline-none",
                isMe && "opacity-100"
              )}
            >
              {/* Medal emoji above avatar */}
              <span className="text-lg leading-none">{p.medal}</span>
              <div className={cn("rounded-full ring-2 shrink-0", p.ring)}>
                <UserAvatar
                  image={row.image}
                  name={getDisplayName(row)}
                  className={cn("rounded-full text-white", p.avatarSize)}
                  fallbackClassName={cn("rounded-full bg-primary text-primary-foreground", p.avatarSize)}
                  isCoach={row.isCoach}
                />
              </div>
              <p className="text-[11px] font-bold text-foreground truncate w-full text-center leading-tight px-1">
                {getDisplayName(row)}
                {isMe && <span className="text-primary"> (شما)</span>}
              </p>
              <p className={cn("text-sm font-black leading-none", p.label)}>{row.points}</p>
              <p className="text-[10px] text-muted-foreground -mt-0.5">امتیاز</p>
            </button>
          );
        })}
      </div>

    </div>
  );
}

function MonthPicker({ periods, year, month, currentYear, onChange }) {
  if (!periods.length) return null;
  return (
    <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
      {periods.map((p) => {
        const isActive = p.year === year && p.month === month;
        return (
          <button
            key={`${p.year}-${p.month}`}
            onClick={() => onChange(p.year, p.month)}
            className={cn(
              "shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-colors whitespace-nowrap",
              isActive
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted/40 text-muted-foreground border-border"
            )}
          >
            {PERSIAN_MONTHS[p.month]}
            {p.year !== currentYear ? ` ${p.year}` : ""}
          </button>
        );
      })}
    </div>
  );
}

export default function LeaderboardSection({ mode = "embedded" }) {
  const isFullPage = mode === "full";
  const currentUser = useAtomValue(currentUserAtom);

  function getCurrentPersianYearMonth() {
    const parts = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
      year: "numeric", month: "numeric", timeZone: "Asia/Tehran",
    }).formatToParts(new Date());
    const toWestern = (s) => String(s ?? "").replace(/[۰-۹]/g, (d) => "0123456789"["۰۱۲۳۴۵۶۷۸۹".indexOf(d)]);
    return {
      year: parseInt(toWestern(parts.find((p) => p.type === "year")?.value)),
      month: parseInt(toWestern(parts.find((p) => p.type === "month")?.value)),
    };
  }

  const { year: initYear, month: initMonth } = getCurrentPersianYearMonth();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState("");
  const [sport, setSport] = useState("padel");
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [currentUserRank, setCurrentUserRank] = useState(null);
  const [currentUserSummary, setCurrentUserSummary] = useState(null);
  const [viewingUser, setViewingUser] = useState(null);
  const [periods, setPeriods] = useState([]);
  const [periodYear, setPeriodYear] = useState(initYear);
  const [periodMonth, setPeriodMonth] = useState(initMonth);

  const sentinelRef = useRef(null);
  const pageSize = isFullPage ? 30 : 10;
  const top3 = rows.slice(0, 3);
  const restRows = isFullPage ? rows : rows.slice(3);

  const loadPeriods = useCallback(async (s) => {
    const res = await rankingService.getActivePeriods({ sport: s });
    if (res.ok) setPeriods(res.data.periods ?? []);
  }, []);

  const load = useCallback(async ({ sport: s, year, month, searchVal, reset = true } = {}) => {
    const activeSport = s ?? sport;
    const activeYear = year ?? periodYear;
    const activeMonth = month ?? periodMonth;
    const activeSearch = searchVal ?? search;
    const activeOffset = reset ? 0 : offset;

    reset ? setLoading(true) : setLoadingMore(true);

    const params = {
      limit: pageSize,
      offset: activeOffset,
      sport: activeSport,
      year: activeYear,
      month: activeMonth,
    };
    if (isFullPage && activeSearch.trim()) params.search = activeSearch.trim();

    const res = await rankingService.getLeaderboard(params);
    setLoading(false);
    setLoadingMore(false);

    if (!res.ok) {
      toast.error(res.data?.message ?? "خطا در دریافت جدول رده‌بندی");
      return;
    }

    const newRows = res.data.leaderboard ?? [];
    setRows((prev) => reset ? newRows : [...prev, ...newRows]);
    setHasMore(res.data.pagination?.hasMore ?? false);
    setOffset(activeOffset + newRows.length);
    setCurrentUserRank(res.data.currentUserRank ?? null);
    setCurrentUserSummary(res.data.currentUserSummary ?? null);
  }, [sport, periodYear, periodMonth, search, offset, isFullPage, pageSize]);

  useEffect(() => {
    loadPeriods("padel");
    load({ reset: true });
  }, []);

  // Infinite scroll
  useEffect(() => {
    if (!isFullPage) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          load({ reset: false });
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, load, isFullPage]);

  const onChangeSport = (s) => {
    setSport(s);
    setOffset(0);
    loadPeriods(s);
    load({ sport: s, reset: true });
  };

  const onChangePeriod = (y, m) => {
    setPeriodYear(y);
    setPeriodMonth(m);
    setOffset(0);
    load({ year: y, month: m, reset: true });
  };

  const onApplySearch = () => {
    setOffset(0);
    load({ searchVal: search, reset: true });
  };

  const handleSelect = (row) => {
    setViewingUser({ userId: row.userId, name: getDisplayName(row), image: row.image, sport });
  };

  return (
    <div className="space-y-3">
      {/* Header card */}
      <div className="rounded-2xl border border-border bg-card p-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CrownIcon className="w-4 h-4 text-amber-500 shrink-0" />
            <h3 className="text-sm font-black text-foreground">رنکینگ ماهانه رکت‌زون</h3>
          </div>
          <button
            onClick={() => load({ reset: true })}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <RefreshCwIcon className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          </button>
        </div>

        {/* Sport tabs */}
        <div className="flex gap-1.5">
          {SPORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onChangeSport(opt.value)}
              className={cn(
                "px-3 py-1.5 rounded-full text-[11px] font-bold border transition-colors",
                sport === opt.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/40 text-muted-foreground border-border"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Month picker — only months with data */}
        <MonthPicker periods={periods} year={periodYear} month={periodMonth} currentYear={initYear} onChange={onChangePeriod} />

        {/* Search (full page only) */}
        {isFullPage && (
          <div className="flex gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onApplySearch()}
              placeholder="جستجو نام بازیکن..."
              className="flex-1 min-w-0 rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm"
            />
            <button
              onClick={onApplySearch}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shrink-0"
            >
              جستجو
            </button>
          </div>
        )}
      </div>

      {/* Current user banner */}
      {currentUserSummary && (
        <div className="rounded-2xl border border-primary/25 bg-primary/5 px-3 py-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-black text-primary shrink-0">رتبه شما #{currentUserRank}</span>
            <div className="flex items-center gap-0.5 text-[11px] text-muted-foreground shrink-0">
              <TrendIcon trend={currentUserSummary.trend} />
              {currentUserSummary.delta !== 0 && (
                <span className={cn(currentUserSummary.trend === "up" ? "text-emerald-500" : "text-red-500")}>
                  {Math.abs(currentUserSummary.delta)}
                </span>
              )}
              <span className="mr-1">نسبت به ماه قبل</span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="text-sm font-black text-primary">{currentUserSummary.points}</span>
            <span className="text-[10px] text-muted-foreground mr-0.5">امتیاز</span>
          </div>
        </div>
      )}

      {/* Top 3 Podium */}
      {!loading && top3.length > 0 && (
        <Podium
          top3={top3}
          currentUserId={currentUser?.id}
          onSelect={handleSelect}
        />
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-3 border-b border-border/60 animate-pulse">
              <div className="w-6 h-4 bg-muted rounded" />
              <div className="w-8 h-8 bg-muted rounded-full shrink-0" />
              <div className="flex-1 h-4 bg-muted rounded" />
              <div className="w-10 h-4 bg-muted rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      {!loading && restRows.length > 0 && (
        <div className="rounded-2xl border border-border overflow-hidden bg-card">
          <div className="px-3 py-2 bg-muted/60 border-b border-border text-xs font-bold">
            {isFullPage ? "جدول کامل" : "سایر بازیکنان"}
          </div>
          {restRows.map((row, idx) => {
            const isMe = currentUser?.id && String(row.userId) === String(currentUser.id);
            const rankStyle =
              row.rank === 1 ? "text-amber-500" :
              row.rank === 2 ? "text-slate-400" :
              row.rank === 3 ? "text-orange-400" :
              "text-muted-foreground";
            return (
              <motion.div
                key={row.userId}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(idx * 0.015, 0.3) }}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2.5 border-b border-border/60 cursor-pointer hover:bg-muted/30 transition-colors last:border-b-0",
                  isMe && "bg-primary/5"
                )}
                onClick={() => handleSelect(row)}
              >
                <div className={cn("w-7 shrink-0 text-center text-xs font-black", rankStyle)}>
                  {row.rank}
                </div>
                <UserAvatar
                  image={row.image}
                  name={getDisplayName(row)}
                  className="w-8 h-8 rounded-full text-[11px] text-white shrink-0"
                  fallbackClassName="w-8 h-8 rounded-full bg-primary text-primary-foreground text-[11px]"
                  isCoach={row.isCoach}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-semibold text-foreground truncate">
                      {getDisplayName(row)}
                    </span>
                    {isMe && <span className="text-[10px] font-bold text-primary shrink-0">(شما)</span>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-sm font-black text-primary">{row.points}</span>
                  <p className="text-[10px] text-muted-foreground leading-none">امتیاز</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {!loading && rows.length === 0 && (
        <div className="rounded-2xl border border-border bg-card flex flex-col items-center justify-center py-10 gap-3">
          <TrophyIcon className="w-10 h-10 text-muted-foreground/30" />
          <p className="text-sm font-bold text-muted-foreground">هنوز کسی در این ماه بازی نکرده</p>
          <p className="text-xs text-muted-foreground/60">اولین نفر باش!</p>
        </div>
      )}

      {/* Infinite scroll sentinel + loading indicator */}
      {isFullPage && (
        <>
          <div ref={sentinelRef} className="h-1" />
          {loadingMore && (
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-3 border-b border-border/60 animate-pulse last:border-b-0">
                  <div className="w-6 h-4 bg-muted rounded" />
                  <div className="w-8 h-8 bg-muted rounded-full shrink-0" />
                  <div className="flex-1 h-4 bg-muted rounded" />
                  <div className="w-10 h-4 bg-muted rounded" />
                </div>
              ))}
            </div>
          )}
          {!hasMore && rows.length > 0 && !loading && (
            <p className="text-center text-[11px] text-muted-foreground/50 py-2">پایان لیست</p>
          )}
        </>
      )}

      {/* Distance to top 10 nudge */}
      {currentUserSummary?.distanceToTop10 > 0 && (
        <div className="rounded-2xl border border-border bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground text-center">
          تا ورود به <span className="font-bold text-foreground">Top 10</span> فقط{" "}
          <span className="font-bold text-primary">{currentUserSummary.distanceToTop10} رتبه</span> فاصله داری!
        </div>
      )}

      <div className="rounded-2xl border border-border bg-muted/30 p-3 text-[11px] text-muted-foreground leading-6">
        <div className="flex items-center gap-1.5 font-bold text-foreground mb-1">
          <CrownIcon className="w-3.5 h-3.5 text-primary" />
          قوانین امتیازدهی
        </div>
        برد در هر مچ تاییدشده: ۳ امتیاز · تورنومنت: بر اساس جایگاه نهایی · لیدربرد هر ماه ریست می‌شود
      </div>

      {viewingUser && (
        <UserProfileSheet
          userId={viewingUser.userId}
          name={viewingUser.name}
          image={viewingUser.image}
          sportType={viewingUser.sport}
          onClose={() => setViewingUser(null)}
        />
      )}
    </div>
  );
}
