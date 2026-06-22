import React from "react";
import MatchesCarousel from "./MatchesCarousel";
import SectionHeader from "./SectionHeader";

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

  return (
    <div className="space-y-5">
      {/* Almost full — highest urgency */}
      {(loading || hasAlmostFull) && (
        <MatchesCarousel
          matches={almostFull}
          loading={loading && almostFull.length === 0}
          title="نزدیک به تکمیل"
          emoji="🔥"
          hideIfEmpty={!loading}
        />
      )}

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
  );
}
