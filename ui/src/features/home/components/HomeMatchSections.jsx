import React from "react";
import MatchesCarousel from "./MatchesCarousel";
import GamesSectionHeader from "./GamesSectionHeader";

export default function HomeMatchSections({ data, loading }) {
  const almostFull = data?.almostFullMatches ?? [];
  const today = data?.todayMatches ?? [];
  const newest = data?.newestMatches ?? [];
  const upcoming = data?.upcomingMatches ?? [];

  // Build sections — show almostFull first (urgency), then today, then newest
  // Fallback to upcoming if others are empty
  const hasAlmostFull = almostFull.length > 0;
  const hasToday = today.length > 0;
  const hasNewest = newest.length > 0;
  const showFallback = !loading && !hasAlmostFull && !hasToday && !hasNewest;

  // All match start times — the header countdown syncs to the soonest upcoming one.
  const schedules = [...almostFull, ...today, ...newest, ...upcoming]
    .map((m) => m?.scheduledAt)
    .filter(Boolean);

  return (
    <section className="relative mx-4 overflow-hidden rounded-3xl border border-primary/10 bg-gradient-to-br from-primary/[0.09] via-pink-500/[0.045] to-primary/[0.06] shadow-sm dark:border-white/5 dark:from-primary/20 dark:via-primary/10 dark:to-transparent">
      {/* decorative brand glows */}
      <div className="pointer-events-none absolute -left-10 -top-12 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-14 -right-8 h-40 w-40 rounded-full bg-pink-500/10 blur-3xl" />

      <div className="relative">
        <GamesSectionHeader schedules={schedules} />

        <div className="space-y-5 pb-4">
      {/* Almost full — highest urgency — disabled until match count grows */}
      {/* {(loading || hasAlmostFull) && (
        <MatchesCarousel
          matches={almostFull}
          loading={loading && almostFull.length === 0}
          title="نزدیک به تکمیل"
          emoji="🔥"
          hideIfEmpty={!loading}
        />
      )} */}

      {/* Today's matches */}
      {(loading || hasToday) && (
        <MatchesCarousel
          matches={today}
          loading={loading && today.length === 0}
          title="بازی‌های امروز"
          emoji="🕒"
          hideIfEmpty={!loading}
        />
      )}

      {/* Newest matches */}
      {(loading || hasNewest) && (
        <MatchesCarousel
          matches={newest}
          loading={loading && newest.length === 0}
          title="جدیدترین بازی‌ها"
          emoji="✨"
          hideIfEmpty={!loading}
        />
      )}

      {/* Fallback — if no categorized matches, show upcoming or empty state */}
      {showFallback && (
        <MatchesCarousel
          matches={upcoming}
          loading={false}
          title="بازی‌های در انتظار"
          emoji="⚔️"
        />
      )}
        </div>
      </div>
    </section>
  );
}
