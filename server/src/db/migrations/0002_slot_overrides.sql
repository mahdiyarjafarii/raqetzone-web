-- Drop old blocked_slots if exists, create slot_overrides
DROP TABLE IF EXISTS "blocked_slots";

CREATE TABLE IF NOT EXISTS "slot_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"court_id" uuid NOT NULL,
	"date" varchar(10) NOT NULL,
	"start_time" varchar(5) NOT NULL,
	"end_time" varchar(5) NOT NULL,
	"status" varchar(20) DEFAULT 'available' NOT NULL,
	"price" integer,
	"discount_percent" smallint DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "slot_overrides" ADD CONSTRAINT "slot_overrides_court_id_courts_id_fk" FOREIGN KEY ("court_id") REFERENCES "courts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_slot_overrides_court_date" ON "slot_overrides" ("court_id","date");
