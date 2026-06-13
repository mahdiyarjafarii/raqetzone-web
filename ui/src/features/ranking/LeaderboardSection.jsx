import React, { useEffect, useMemo, useState } from "react";
import { CrownIcon, MedalIcon, RefreshCwIcon } from "lucide-react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { rankingService } from "@/services/rankingService";
import { cn } from "@/lib/utils";
import { useAtomValue } from "jotai";
import { currentUserAtom } from "@/config/state";
import UserAvatar from "@/components/ui/UserAvatar";

const TOP_BADGES = {
  1: "bg-amber-500/15 text-amber-600 border-amber-500/25",
  2: "bg-slate-500/15 text-slate-600 border-slate-500/25",
  3: "bg-orange-500/15 text-orange-600 border-orange-500/25",
};

const SPORT_OPTIONS = [
  { value: "padel", label: "پدل" },
  { value: "tennis", label: "تنیس" },
];

const RANK_MEDALS = {
  1: "🥇",
  2: "🥈",
  3: "🥉",
};

function getDisplayName(row, fallbackRank) {
  if (row?.name && String(row.name).trim()) return String(row.name).trim();
  const composed = [row?.firstName, row?.lastName].filter(Boolean).join(" ").trim();
  if (composed) return composed;
  return `بازیکن ${fallbackRank ?? "-"}`;
}

export default function LeaderboardSection({ mode = "embedded" }) {
  const isFullPage = mode === "full";
  const currentUser = useAtomValue(currentUserAtom);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [sport, setSport] = useState("padel");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, limit: 100, offset: 0 });
  const [currentUserRank, setCurrentUserRank] = useState(null);

  const pageSize = isFullPage ? 50 : 100;

  const topThree = useMemo(() => rows.slice(0, 3), [rows]);

  const load = async (targetPage = page, override = {}) => {
    const activeSport = override.sport ?? sport;
    setLoading(true);
    const params = {
      limit: pageSize,
      offset: (targetPage - 1) * pageSize,
      sport: activeSport,
    };
    if (isFullPage && search.trim()) params.search = search.trim();

    const res = await rankingService.getLeaderboard(params);
    setLoading(false);

    if (!res.ok) {
      toast.error(res.data?.message ?? "خطا در دریافت جدول رده‌بندی");
      return;
    }

    setRows(res.data.leaderboard ?? []);
    setPagination(res.data.pagination ?? { total: 0, totalPages: 1, limit: pageSize, offset: 0 });
    setCurrentUserRank(res.data.currentUserRank ?? null);
    setSport(activeSport);
    setPage(targetPage);
  };

  useEffect(() => {
    load(1);
  }, []);

  const applyFilters = () => {
    load(1);
  };

  const goPrev = () => {
    if (page <= 1 || loading) return;
    load(page - 1);
  };

  const goNext = () => {
    const totalPages = Number(pagination.totalPages ?? 1);
    if (page >= totalPages || loading) return;
    load(page + 1);
  };

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-border bg-card p-3 space-y-3">
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <CrownIcon className="w-4 h-4 text-amber-500 shrink-0" />
            <h3 className="text-sm font-black text-foreground truncate">رنکینگ بازیکنان رکت‌زون</h3>
          </div>

          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="inline-flex max-w-full items-center gap-1.5 overflow-x-auto no-scrollbar">
              {SPORT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => load(1, { sport: option.value })}
                  className={cn(
                    "shrink-0 whitespace-nowrap px-3 py-1.5 rounded-full text-[11px] font-bold border transition-colors",
                    sport === option.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/40 text-muted-foreground border-border"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => load(page)}
              className="shrink-0 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <RefreshCwIcon className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
              بروزرسانی
            </button>
          </div>
        </div>

        <div className={cn("flex gap-2", isFullPage ? "flex-wrap" : "") }>
          {isFullPage && (
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") applyFilters();
              }}
              placeholder="جستجو نام بازیکن"
              className="flex-1 basis-[140px] min-w-0 rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm"
            />
          )}
          <button
            onClick={applyFilters}
            className={cn(
              "px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold",
              isFullPage ? "w-full sm:w-auto" : ""
            )}
          >
            اعمال
          </button>
        </div>

        {isFullPage && currentUserRank && (
          <div className="rounded-xl border border-primary/25 bg-primary/10 px-3 py-2 text-xs text-primary font-bold">
            رتبه فعلی شما: #{currentUserRank}
          </div>
        )}
      </div>

      {!isFullPage && topThree.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {topThree.map((row) => (
            <motion.div
              key={row.userId}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-border bg-card p-3 text-center"
            >
              <span className={cn("inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-[10px] font-bold", TOP_BADGES[row.rank])}>
                #{row.rank}
              </span>
              <div className="mt-2 flex items-center justify-center gap-1.5 min-w-0">
                <UserAvatar
                  image={row.image}
                  name={getDisplayName(row, row.rank)}
                  className="w-6 h-6 rounded-full text-[10px] text-white"
                  fallbackClassName="w-6 h-6 rounded-full bg-primary text-primary-foreground text-[10px]"
                />
                <p className="text-xs font-bold text-foreground truncate max-w-[90px]">
                  {getDisplayName(row, row.rank)}
                </p>
              </div>
              <p className="mt-1 text-sm font-black text-primary inline-flex items-center justify-center gap-1">
                {row.points}
                {RANK_MEDALS[row.rank] ? <span>{RANK_MEDALS[row.rank]}</span> : null}
              </p>
              <p className="text-[10px] text-muted-foreground">امتیاز</p>
            </motion.div>
          ))}
        </div>
      )}

      <div className="rounded-2xl border border-border overflow-hidden bg-card">
        <div className="px-3 py-2 bg-muted/60 border-b border-border text-xs font-bold text-foreground">جدول کامل</div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/35 text-muted-foreground border-b border-border">
                <th className="px-2 py-2 text-right">#</th>
                <th className="px-2 py-2 text-right">بازیکن</th>
                <th className="px-2 py-2 text-right">امتیاز</th>
                <th className="px-2 py-2 text-right">مچ</th>
                <th className="px-2 py-2 text-right">تورنومنت</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-5 text-center text-muted-foreground">
                    {loading ? "در حال بارگذاری..." : "داده‌ای برای نمایش وجود ندارد"}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.userId}
                    className={cn(
                      "border-b border-border/60",
                      currentUser?.id && String(row.userId) === String(currentUser.id) && "bg-primary/10"
                    )}
                  >
                    <td className="px-2 py-2 font-bold">{row.rank}</td>
                    <td className="px-2 py-2 max-w-[180px]">
                      <div className="flex items-center gap-2 min-w-0">
                        <UserAvatar
                          image={row.image}
                          name={getDisplayName(row, row.rank)}
                          className="w-7 h-7 rounded-full text-[10px] text-white"
                          fallbackClassName="w-7 h-7 rounded-full bg-primary text-primary-foreground text-[10px]"
                        />
                        <span className="truncate font-semibold">{getDisplayName(row, row.rank)}</span>
                        {currentUser?.id && String(row.userId) === String(currentUser.id) && (
                          <span className="text-[10px] font-bold text-primary shrink-0">(شما)</span>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-2 font-bold">
                      <span className="inline-flex items-center gap-1">
                        {row.points}
                        {RANK_MEDALS[row.rank] ? <span>{RANK_MEDALS[row.rank]}</span> : null}
                      </span>
                    </td>
                    <td className="px-2 py-2">{row.matchPoints}</td>
                    <td className="px-2 py-2">{row.tournamentPoints}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isFullPage && (
        <div className="rounded-2xl border border-border bg-card px-3 py-2.5 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            صفحه {page} از {Number(pagination.totalPages ?? 1)} · {Number(pagination.total ?? 0)} بازیکن
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={goPrev}
              disabled={loading || page <= 1}
              className="px-3 py-1.5 rounded-lg border border-border bg-muted/40 disabled:opacity-50"
            >
              قبلی
            </button>
            <button
              onClick={goNext}
              disabled={loading || page >= Number(pagination.totalPages ?? 1)}
              className="px-3 py-1.5 rounded-lg border border-border bg-muted/40 disabled:opacity-50"
            >
              بعدی
            </button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-muted/30 p-3 text-[11px] text-muted-foreground leading-6">
        <div className="flex items-center gap-1.5 font-bold text-foreground mb-1">
          <MedalIcon className="w-3.5 h-3.5 text-primary" />
          قوانین فعلی امتیاز
        </div>
        برد در هر مچ تاییدشده: ۳ امتیاز · تورنومنت: بر اساس جدول نهایی و امتیاز پایه تورنومنت
      </div>
    </div>
  );
}
