import React from "react";
import { Link } from "react-router-dom";
import { SwordsIcon, FlameIcon, CalendarDaysIcon, SparklesIcon, SwordsIcon as FallbackIcon, ChevronLeftIcon } from "lucide-react";
import HomeMatchCard from "./HomeMatchCard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SECTION_STYLES = {
  "🔥": { Icon: FlameIcon, iconCls: "text-orange-500", ringCls: "bg-orange-500/10" },
  "🕒": { Icon: CalendarDaysIcon, iconCls: "text-blue-500", ringCls: "bg-blue-500/10" },
  "✨": { Icon: SparklesIcon, iconCls: "text-violet-500", ringCls: "bg-violet-500/10" },
  "⚔️": { Icon: SwordsIcon, iconCls: "text-primary", ringCls: "bg-primary/10" },
};

function SectionHeader({ title, emoji, href }) {
  const style = SECTION_STYLES[emoji] ?? SECTION_STYLES["⚔️"];
  const { Icon, iconCls, ringCls } = style;

  return (
    <div className="flex items-center justify-between px-4 mb-3">
      <div className="flex items-center gap-2.5">
        <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", ringCls)}>
          <Icon className={cn("w-4 h-4", iconCls)} />
        </div>
        <h2 className="font-black text-foreground text-[15px] tracking-tight">{title}</h2>
      </div>
      {href && (
        <Link
          to={href}
          className="flex items-center gap-0.5 text-xs text-primary font-bold bg-primary/8 px-2.5 py-1.5 rounded-full"
        >
          همه
          <ChevronLeftIcon className="w-3.5 h-3.5" />
        </Link>
      )}
    </div>
  );
}

function SkeletonCard() {
  return <div className="shrink-0 w-[210px] h-[164px] rounded-[26px] bg-muted animate-pulse" />;
}

export default function MatchesCarousel({
  matches = [],
  loading,
  title = "بازی‌های در انتظار",
  emoji = "⚔️",
  emptyMessage = "بازی فعالی وجود ندارد",
  hideIfEmpty = false,
}) {
  if (hideIfEmpty && !loading && matches.length === 0) return null;

  return (
    <div>
      <SectionHeader title={title} emoji={emoji} href="/tournament" />

      <div className="flex gap-3 overflow-x-auto no-scrollbar px-4 pb-2">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
        ) : matches.length === 0 ? (
          <div className="w-full flex flex-col items-center py-8 gap-3 text-center">
            <SwordsIcon className="w-10 h-10 text-muted-foreground/30" />
            <p className="text-muted-foreground text-sm font-medium">{emptyMessage}</p>
            <Button asChild size="sm" variant="outline" className="rounded-2xl">
              <Link to="/tournament">ایجاد بازی جدید</Link>
            </Button>
          </div>
        ) : (
          <>
            {matches.map((match, i) => (
              <HomeMatchCard key={match.id} match={match} index={i} />
            ))}
            <Link
              to="/tournament"
              className="shrink-0 w-14 rounded-[26px] border border-dashed border-border bg-white/70 dark:bg-card flex flex-col items-center justify-center gap-1 text-muted-foreground text-xs font-bold hover:bg-muted transition-colors"
            >
              <span className="text-sm">+</span>
              <span>همه</span>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
