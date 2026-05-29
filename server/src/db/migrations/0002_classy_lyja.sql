CREATE TABLE IF NOT EXISTS "club_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"club_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"rating" smallint NOT NULL,
	"comment" text,
	"owner_reply" text,
	"owner_replied_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
CREATE TABLE IF NOT EXISTS "tournament_registrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"payment_status" varchar(20) DEFAULT 'pending' NOT NULL,
	"registered_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tournaments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"club_id" uuid,
	"title" varchar(255) NOT NULL,
	"description" text,
	"entry_fee" integer DEFAULT 0 NOT NULL,
	"max_participants" smallint DEFAULT 16 NOT NULL,
	"registration_deadline" timestamp NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"min_level" smallint DEFAULT 1 NOT NULL,
	"sport_type" varchar(50) DEFAULT 'padel' NOT NULL,
	"prize" text,
	"rules" text,
	"status" varchar(20) DEFAULT 'open' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP TABLE "gpt_categories";--> statement-breakpoint
DROP TABLE "gpts";--> statement-breakpoint
DROP TABLE "image_generations";--> statement-breakpoint
DROP TABLE "models";--> statement-breakpoint
DROP TABLE "video_generations";--> statement-breakpoint
ALTER TABLE "chats" DROP CONSTRAINT "chats_gpt_id_gpts_id_fk";
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "tracking_code" varchar(20);--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "reminder_sent" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_club_reviews_club_id" ON "club_reviews" ("club_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_club_reviews_user_id" ON "club_reviews" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_slot_overrides_court_date" ON "slot_overrides" ("court_id","date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_tournament_reg_tournament_id" ON "tournament_registrations" ("tournament_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_tournament_reg_user_id" ON "tournament_registrations" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_tournaments_club_id" ON "tournaments" ("club_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_tournaments_status" ON "tournaments" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_tournaments_start_date" ON "tournaments" ("start_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_tournaments_sport_type" ON "tournaments" ("sport_type");--> statement-breakpoint
ALTER TABLE "chats" DROP COLUMN IF EXISTS "gpt_id";--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "club_reviews" ADD CONSTRAINT "club_reviews_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "club_reviews" ADD CONSTRAINT "club_reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "slot_overrides" ADD CONSTRAINT "slot_overrides_court_id_courts_id_fk" FOREIGN KEY ("court_id") REFERENCES "courts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tournament_registrations" ADD CONSTRAINT "tournament_registrations_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tournament_registrations" ADD CONSTRAINT "tournament_registrations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_tracking_code_unique" UNIQUE("tracking_code");