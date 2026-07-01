ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "group_id" uuid;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_bookings_group_id" ON "bookings" ("group_id");
