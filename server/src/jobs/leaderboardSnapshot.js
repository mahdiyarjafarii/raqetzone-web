import { CronJob } from "cron";
import { snapshotMonthlyLeaderboard } from "../controllers/rankingController.js";

const SPORTS = ["padel", "tennis"];

function getPreviousPersianYearMonth() {
  // Called at 00:05 UTC on 1st of UTC month — Tehran is UTC+3:30, so it's already ~03:35 Tehran
  // We want the Persian month that just ended (i.e., previous Persian month)
  const now = new Date();
  const parts = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    year: "numeric", month: "numeric", timeZone: "Asia/Tehran",
  }).formatToParts(now);
  const toWestern = (s) => String(s ?? "").replace(/[۰-۹]/g, (d) => "0123456789"["۰۱۲۳۴۵۶۷۸۹".indexOf(d)]);
  const curMonth = parseInt(toWestern(parts.find((p) => p.type === "month")?.value));
  const curYear = parseInt(toWestern(parts.find((p) => p.type === "year")?.value));
  return curMonth === 1
    ? { year: curYear - 1, month: 12 }
    : { year: curYear, month: curMonth - 1 };
}

async function runSnapshot() {
  const { year, month } = getPreviousPersianYearMonth();

  console.log(`[leaderboardSnapshot] Snapshotting ${year}-${month} for all sports`);
  for (const sport of SPORTS) {
    try {
      const result = await snapshotMonthlyLeaderboard(year, month, sport);
      console.log(`[leaderboardSnapshot] ${sport} ${year}-${month}: ${result.snapshotCount} rows`);
    } catch (err) {
      console.error(`[leaderboardSnapshot] error for ${sport}:`, err);
    }
  }
}

// Runs at 00:05 on the 1st of every month (UTC)
export const leaderboardSnapshotJob = new CronJob(
  "5 0 1 * *",
  runSnapshot,
  null,
  true,
  "UTC"
);
