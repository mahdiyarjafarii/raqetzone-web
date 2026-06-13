import React, { useEffect, useState } from "react";
import { CrownIcon } from "lucide-react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { rankingService } from "@/services/rankingService";
import UserAvatar from "@/components/ui/UserAvatar";
import SectionHeader from "./SectionHeader";

function RowSkeleton() {
  return <div className="h-10 rounded-xl bg-muted animate-pulse" />;
}

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

export default function HomeLeaderboardPreview() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sport, setSport] = useState("padel");

  const sportOptions = [
    { value: "padel", label: "پدل" },
    { value: "tennis", label: "تنیس" },
  ];

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      const res = await rankingService.getLeaderboard({ limit: 5, sport });
      if (cancelled) return;
      setLoading(false);

      if (!res.ok) {
        toast.error(res.data?.message ?? "خطا در دریافت رده‌بندی");
        return;
      }

      setRows(res.data.leaderboard ?? []);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [sport]);

  return (
    <div>
      <SectionHeader title="لیدربورد بازیکنان" emoji="🏆" href="/leaderboard" ctaLabel="کامل" />

      <div className="px-4">
        <div className="rounded-3xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/40 flex items-center justify-between">
            <div className="flex items-center gap-2 text-foreground">
              <CrownIcon className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-black">۵ نفر برتر</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-background/70 rounded-full border border-border px-1 py-1">
                {sportOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setSport(option.value)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${sport === option.value ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <Link to="/leaderboard" className="text-xs font-bold text-primary">
                مشاهده کامل
              </Link>
            </div>
          </div>

          <div className="p-3 space-y-2.5">
            {loading ? (
              Array.from({ length: 4 }).map((_, index) => <RowSkeleton key={index} />)
            ) : rows.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">هنوز داده‌ای برای جدول ثبت نشده</p>
            ) : (
              rows.map((row) => (
                <div
                  key={row.userId}
                  className="flex items-center gap-3 rounded-xl border border-border/70 bg-background/60 px-3 py-2.5"
                >
                  <span className="w-6 text-center text-xs font-black text-foreground">{row.rank}</span>
                  <UserAvatar
                    image={row.image}
                    name={getDisplayName(row, row.rank)}
                    className="w-8 h-8 rounded-full text-[10px] text-white"
                    fallbackClassName="w-8 h-8 rounded-full bg-primary text-primary-foreground text-[10px]"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-foreground truncate">{getDisplayName(row, row.rank)}</p>
                    <p className="text-[11px] text-muted-foreground">{row.matchPoints} مچ · {row.tournamentPoints} تورنومنت</p>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-black text-primary inline-flex items-center gap-1">
                      {row.points}
                      {RANK_MEDALS[row.rank] ? <span>{RANK_MEDALS[row.rank]}</span> : null}
                    </p>
                    <p className="text-[10px] text-muted-foreground">امتیاز</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
