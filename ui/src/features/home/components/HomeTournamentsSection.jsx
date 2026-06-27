import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { TrophyIcon, ChevronLeftIcon } from "lucide-react";
import { motion } from "framer-motion";
import HomeTournamentCard from "./HomeTournamentCard";
import { tournamentService } from "@/features/tournaments/services/tournamentService";
import TournamentDetailSheet from "@/features/tournaments/components/TournamentDetailSheet";

function SkeletonCard() {
  return <div className="shrink-0 w-[200px] h-[172px] rounded-[24px] bg-muted animate-pulse" />;
}

export default function HomeTournamentsSection() {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    tournamentService
      .getTournaments()
      .then((res) => {
        if (res.ok) {
          const list = res.data?.tournaments ?? res.data ?? [];
          const active = list.filter((t) => t.phase === "registration" || t.phase === "ongoing");
          setTournaments(active.slice(0, 10));
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (!loading && tournaments.length === 0) return null;

  return (
    <>
      <div>
        {/* Section header */}
        <div className="flex items-center justify-between px-4 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-amber-500/10">
              <TrophyIcon className="w-4 h-4 text-amber-500" />
            </div>
            <h2 className="font-black text-foreground text-[15px] tracking-tight">تورنومنت‌های فعال</h2>
          </div>
          <Link
            to="/tournament?tab=tournaments"
            className="flex items-center gap-0.5 text-xs text-primary font-bold bg-primary/8 px-2.5 py-1.5 rounded-full"
          >
            همه
            <ChevronLeftIcon className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Horizontal scroll */}
        <div className="flex gap-3 overflow-x-auto no-scrollbar px-4 pb-2">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
          ) : (
            <>
              {tournaments.map((t, i) => (
                <HomeTournamentCard key={t.id} tournament={t} index={i} />
              ))}
              <Link
                to="/tournament?tab=tournaments"
                className="shrink-0 w-14 rounded-[24px] border border-dashed border-border bg-white/70 dark:bg-card flex flex-col items-center justify-center gap-1 text-muted-foreground text-xs font-bold hover:bg-muted transition-colors"
              >
                <span className="text-sm">+</span>
                <span>همه</span>
              </Link>
            </>
          )}
        </div>
      </div>

      <TournamentDetailSheet />
    </>
  );
}
