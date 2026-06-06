import { db } from "../db/index.js";
import { courts } from "../db/schema.js";

const demos = [
  {
    name: "زمین پدل آزادی",
    location: "تهران، آزادی",
    address: "خیابان آزادی، کوچه ورزشگاه، پلاک ۱۲",
    surfaceType: "artificial",
    sportType: "padel",
    pricePerHour: 350000,
    description: "زمین پدل با کیفیت بالا و روشنایی عالی برای بازی شبانه",
    openTime: "08:00",
    closeTime: "23:00",
    slotDuration: 60,
  },
  {
    name: "کورت تنیس الهیه",
    location: "تهران، الهیه",
    address: "خیابان الهیه، باشگاه ورزشی پارسیان",
    surfaceType: "clay",
    sportType: "tennis",
    pricePerHour: 450000,
    description: "کورت تنیس حرفه‌ای با سطح خاک رس، مناسب برای تمام سطوح",
    openTime: "07:00",
    closeTime: "22:00",
    slotDuration: 60,
  },
  {
    name: "زمین پدل اکباتان",
    location: "تهران، اکباتان",
    address: "فاز ۳ اکباتان، مجموعه ورزشی مهتاب",
    surfaceType: "artificial",
    sportType: "padel",
    pricePerHour: 280000,
    description: "زمین پدل سرپوشیده با تهویه مناسب، ایده‌آل برای فصل سرد",
    openTime: "09:00",
    closeTime: "23:00",
    slotDuration: 90,
  },
  {
    name: "اسکواش تخصصی سعادت‌آباد",
    location: "تهران، سعادت‌آباد",
    address: "بلوار دریا، باشگاه آرمان",
    surfaceType: "hard",
    sportType: "squash",
    pricePerHour: 200000,
    description: "دو زمین اسکواش استاندارد با دیوار شیشه‌ای",
    openTime: "07:00",
    closeTime: "22:00",
    slotDuration: 45,
  },
  {
    name: "زمین پدل نیاوران",
    location: "تهران، نیاوران",
    address: "خیابان نیاوران، پارک جمشیدیه",
    surfaceType: "artificial",
    sportType: "padel",
    pricePerHour: 400000,
    description: "زمین پدل لوکس در محیطی سرسبز با امکانات کامل",
    openTime: "08:00",
    closeTime: "22:00",
    slotDuration: 60,
  },
];

async function seed() {
  await db.insert(courts).values(demos);
  console.log("✅ Seeded", demos.length, "courts");
  process.exit(0);
}

seed().catch((e) => { console.error(e); process.exit(1); });
