import { db } from "../db/index.js";
import { promotions, deals, courts } from "../db/schema.js";
import { eq } from "drizzle-orm";

async function seed() {
  // ── Promotions
  await db.insert(promotions).values([
    {
      title: "زمین‌های جدید اکباتان",
      subtitle: "۳ زمین پدل سرپوشیده با امکانات کامل",
      badgeText: "تازه افتتاح",
      ctaText: "رزرو کن",
      ctaHref: "/mybooking",
      gradientFrom: "#2B0FD9",
      gradientTo: "#7C3AED",
      emoji: "🏟",
      isActive: true,
      sortOrder: 0,
    },
    {
      title: "تورنومنت پدل تابستان ۱۴۰۳",
      subtitle: "ثبت‌نام تا ۱۵ تیر، ۳۲ تیم شرکت‌کننده",
      badgeText: "محدود",
      ctaText: "ثبت‌نام",
      ctaHref: "/tournament",
      gradientFrom: "#0891B2",
      gradientTo: "#0D9488",
      emoji: "🏆",
      isActive: true,
      sortOrder: 1,
    },
    {
      title: "بازی اول رایگان",
      subtitle: "اولین رزرو خود را با ۱۰۰٪ تخفیف انجام دهید",
      badgeText: "ویژه",
      ctaText: "استفاده کن",
      ctaHref: "/mybooking",
      gradientFrom: "#DC2626",
      gradientTo: "#EA580C",
      emoji: "🎁",
      isActive: true,
      sortOrder: 2,
    },
    {
      title: "اشتراک گروهی باشگاه",
      subtitle: "با ۴ نفر رزرو کنید، ۳۰٪ تخفیف بگیرید",
      badgeText: "گروهی",
      ctaText: "بیشتر بدان",
      ctaHref: "/mybooking",
      gradientFrom: "#059669",
      gradientTo: "#0891B2",
      emoji: "👥",
      isActive: true,
      sortOrder: 3,
    },
  ]);

  // ── Deals (get court ids first)
  const allCourts = await db.select({ id: courts.id, pricePerHour: courts.pricePerHour })
    .from(courts)
    .limit(5);

  if (allCourts.length === 0) {
    console.log("⚠️  No courts found — run seedCourts.js first");
    process.exit(1);
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().split("T")[0];

  const dealData = [
    { idx: 0, start: "09:00", end: "10:00", discount: 30, hoursAhead: 20 },
    { idx: 1, start: "14:00", end: "15:00", discount: 25, hoursAhead: 36 },
    { idx: 2, start: "18:00", end: "19:00", discount: 40, hoursAhead: 12 },
    { idx: 3, start: "20:00", end: "21:00", discount: 20, hoursAhead: 48 },
  ];

  for (const d of dealData) {
    const court = allCourts[d.idx % allCourts.length];
    const validUntil = new Date(Date.now() + d.hoursAhead * 60 * 60 * 1000);

    await db.insert(deals).values({
      courtId: court.id,
      slotDate: dateStr,
      slotStart: d.start,
      slotEnd: d.end,
      discountPercent: d.discount,
      validUntil,
      isActive: true,
    });
  }

  console.log("✅ Seeded promotions and deals");
  process.exit(0);
}

seed().catch((e) => { console.error(e); process.exit(1); });
