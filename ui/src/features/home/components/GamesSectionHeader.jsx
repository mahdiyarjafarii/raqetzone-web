import React, { useEffect, useMemo, useState } from "react";
import { SwordsIcon } from "lucide-react";

function pad(n) {
  return String(n).padStart(2, "0");
}

function TimeBox({ value }) {
  return (
    <span className="min-w-[26px] rounded-lg bg-primary px-1.5 py-1 text-center text-[13px] font-black tabular-nums text-white shadow-sm">
      {pad(value)}
    </span>
  );
}

/**
 * Countdown timer synced to the soonest upcoming game.
 *
 * `schedules` is a list of match start times (Date | timestamp | ISO string).
 * Each tick it targets the earliest one still in the future, so when a game
 * kicks off the timer automatically rolls over to the next one. If there is no
 * upcoming game, it renders nothing.
 */
function Countdown({ schedules = [] }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const times = useMemo(
    () =>
      schedules
        .map((s) => new Date(s).getTime())
        .filter((t) => Number.isFinite(t)),
    [schedules]
  );

  // soonest match that hasn't started yet — no upcoming game → no counter
  const target = times.filter((t) => t > now).sort((a, b) => a - b)[0];
  if (!target) return null;

  const remaining = Math.max(0, target - now);
  const totalSec = Math.floor(remaining / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <span className="text-[9px] font-bold text-primary/70">تا شروع بازی بعدی</span>
      <div className="flex items-center gap-1" dir="ltr">
        <TimeBox value={h} />
        <span className="text-xs font-black text-primary">:</span>
        <TimeBox value={m} />
        <span className="text-xs font-black text-primary">:</span>
        <TimeBox value={s} />
      </div>
    </div>
  );
}

/**
 * Rich header for the games section — brand logo tile + title + subtitle on the
 * right (RTL start) and a live countdown on the left (RTL end).
 */
export default function GamesSectionHeader({
  title = "بازی‌ها",
  subtitle = "حریف هم‌سطح خودتو پیدا کن و بازی کن",
  schedules = [],
}) {
  return (
    <div className="flex items-center gap-3 px-4 pt-4 pb-3">
      <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/25">
        <SwordsIcon className="h-5 w-5 text-white" />
      </div>

      <div className="min-w-0 flex-1 text-right">
        <h2 className="text-[17px] font-black leading-tight tracking-tight text-foreground">
          {title}
        </h2>
        <p className="mt-0.5 truncate text-[12px] font-semibold text-muted-foreground">
          {subtitle}
        </p>
      </div>

      <Countdown schedules={schedules} />
    </div>
  );
}
