import { CronJob } from "cron";
import { snapshotMonthlyLeaderboard } from "../controllers/rankingController.js";

const SPORTS = ["padel", "tennis"];

async function runSnapshot() {
  const now = new Date();
  // Snapshot the month that just ended
  const month = now.getUTCMonth() === 0 ? 12 : now.getUTCMonth(); // previous month
  const year = now.getUTCMonth() === 0 ? now.getUTCFullYear() - 1 : now.getUTCFullYear();

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
