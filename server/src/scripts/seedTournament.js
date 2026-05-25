import dotenv from "dotenv";
dotenv.config();

import { db } from "../db/index.js";
import { tournaments } from "../db/schema.js";
import { eq } from "drizzle-orm";

const EXISTING_ID = "ab83e96a-b6a3-4f92-b6f8-c8a76ca9f620";

await db
  .update(tournaments)
  .set({ prize: "🥇 اول: ۱۵ میلیون تومان + کاپ طلایی\n🥈 دوم: ۸ میلیون تومان + مدال نقره\n🥉 سوم: ۴ میلیون تومان + مدال برنز\n🎽 بهترین بازیکن: راکت کربن Bullpadel Carbon" })
  .where(eq(tournaments.id, EXISTING_ID));

console.log("✅ Prize updated on mock tournament");
process.exit(0);
