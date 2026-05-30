import React from "react";
import { Link } from "react-router-dom";
import { SwordsIcon } from "lucide-react";
import HomeMatchCard from "./HomeMatchCard";
import SectionHeader from "./SectionHeader";
import { Button } from "@/components/ui/button";

function SkeletonCard() {
  return <div className="shrink-0 w-60 h-40 rounded-[26px] bg-muted animate-pulse" />;
}

export default function MatchesCarousel({ matches = [], loading }) {
  return (
    <div>
      <SectionHeader title="بازی‌های در انتظار" emoji="⚔️" href="/tournament" />

      <div className="flex gap-3 overflow-x-auto no-scrollbar px-4 pb-2">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
        ) : matches.length === 0 ? (
          <div className="w-full flex flex-col items-center py-8 gap-3 text-center">
            <SwordsIcon className="w-10 h-10 text-muted-foreground/30" />
            <p className="text-muted-foreground text-sm font-medium">بازی فعالی وجود ندارد</p>
            <Button asChild size="sm" variant="outline" className="rounded-2xl">
              <Link to="/tournament">ایجاد بازی جدید</Link>
            </Button>
          </div>
        ) : (
          <>
            {matches.map((match, i) => (
              <HomeMatchCard key={match.id} match={match} index={i} />
            ))}
            {/* "See all" card */}
            <Link
              to="/tournament"
              className="shrink-0 w-20 rounded-[26px] border border-dashed border-border bg-white/70 dark:bg-card flex flex-col items-center justify-center gap-1.5 text-muted-foreground text-xs font-bold hover:bg-muted transition-colors"
            >
              <span className="text-lg">+</span>
              <span>همه</span>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
