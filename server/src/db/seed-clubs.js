import "dotenv/config";
import { db, client } from "./index.js";
import { clubs, courts, users } from "./schema.js";
import { eq } from "drizzle-orm";

const SYSTEM_PHONE = "09000000000";
const CLUB_NAME = "رکت زون - قزوین";

async function seed() {
  // 1. Find or create system owner user
  let [owner] = await db.select().from(users).where(eq(users.phone, SYSTEM_PHONE));

  if (!owner) {
    [owner] = await db.insert(users).values({
      phone: SYSTEM_PHONE,
      name: "رکت زون",
      isClubOwner: true,
    }).returning();
    console.log("Created system user:", owner.id);
  } else {
    await db.update(users).set({ isClubOwner: true }).where(eq(users.id, owner.id));
    console.log("Using existing user:", owner.id);
  }

  // 2. Check if club already exists
  const existing = await db.select().from(clubs).where(eq(clubs.ownerId, owner.id));
  if (existing.length > 0) {
    console.log("Club already exists:", existing[0].name);
    await client.end();
    return;
  }

  // 3. Insert club
  const [club] = await db.insert(clubs).values({
    ownerId: owner.id,
    name: CLUB_NAME,
    description: "رکت زون قزوین با زمین‌های استاندارد پدل و تنیس، بهترین مجموعه ورزشی در قزوین است.",
    address: "قزوین، خیابان نوروزیان",
    phone: "02833000000",
    sportTypes: ["padel", "tennis"],
    amenities: ["parking", "locker", "shower", "wifi", "lighting"],
    images: [
      "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1549060279-7e168fcee0c2?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?auto=format&fit=crop&w=900&q=80",
    ],
    openTime: "08:00",
    closeTime: "23:00",
  }).returning();

  console.log("Created club:", club.id);

  // 4. Insert courts
  await db.insert(courts).values([
    {
      clubId: club.id,
      name: "زمین پدل ۱",
      location: CLUB_NAME,
      address: "قزوین، خیابان نوروزیان",
      sportType: "padel",
      surfaceType: "artificial",
      pricePerHour: 150000,
      openTime: "08:00",
      closeTime: "23:00",
    },
    {
      clubId: club.id,
      name: "زمین پدل ۲",
      location: CLUB_NAME,
      address: "قزوین، خیابان نوروزیان",
      sportType: "padel",
      surfaceType: "artificial",
      pricePerHour: 150000,
      openTime: "08:00",
      closeTime: "23:00",
    },
    {
      clubId: club.id,
      name: "زمین تنیس ۱",
      location: CLUB_NAME,
      address: "قزوین، خیابان نوروزیان",
      sportType: "tennis",
      surfaceType: "hard",
      pricePerHour: 200000,
      openTime: "08:00",
      closeTime: "22:00",
    },
  ]);

  console.log("Created 3 courts for", CLUB_NAME);
  await client.end();
}

seed().catch((e) => { console.error(e); process.exit(1); });
