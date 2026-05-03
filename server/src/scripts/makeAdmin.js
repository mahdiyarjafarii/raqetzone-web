import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";

const phone = process.argv[2];
if (!phone) { console.error("Usage: node makeAdmin.js <phone>"); process.exit(1); }

const [user] = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
if (!user) { console.error("User not found:", phone); process.exit(1); }

await db.update(users).set({ isAdmin: true }).where(eq(users.id, user.id));
console.log(`✅ ${phone} is now an admin`);
process.exit(0);
