import { db } from "../db/index.js";
import { matches } from "../db/schema.js";

const demos = [
  {
    title: "مسابقه دوستانه پادل",
    sportType: "padel",
    location: "تهران، پارک لاله",
    courtName: "زمین شماره ۱",
    scheduledAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2h from now
    teamSize: 2,
    status: "open",
  },
  {
    title: "تنیس جمعه صبح",
    sportType: "tennis",
    location: "تهران، کلوب الهیه",
    courtName: "Court A",
    scheduledAt: new Date(Date.now() + 20 * 60 * 60 * 1000), // tomorrow
    teamSize: 2,
    status: "open",
  },
  {
    title: "چالش بدمینتون",
    sportType: "badminton",
    location: "اصفهان، سالن ورزشی شهید رجایی",
    scheduledAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
    teamSize: 2,
    status: "open",
  },
  {
    title: "اسکواش سریع",
    sportType: "squash",
    location: "تهران، باشگاه آزادی",
    scheduledAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
    teamSize: 1,
    status: "open",
  },
];

async function seed() {
  await db.insert(matches).values(demos);
  console.log("✅ Seeded", demos.length, "demo matches");
  process.exit(0);
}

seed().catch((e) => { console.error(e); process.exit(1); });
