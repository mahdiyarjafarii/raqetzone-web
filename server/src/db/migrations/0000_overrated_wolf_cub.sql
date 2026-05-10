CREATE TABLE IF NOT EXISTS "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"court_id" uuid NOT NULL,
	"date" varchar(10) NOT NULL,
	"start_time" varchar(5) NOT NULL,
	"end_time" varchar(5) NOT NULL,
	"duration_hours" integer NOT NULL,
	"total_price" integer NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"notes" text,
	"admin_note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"gpt_id" uuid,
	"title" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "courts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"location" varchar(255) NOT NULL,
	"address" text,
	"surface_type" varchar(50),
	"sport_type" varchar(50) DEFAULT 'padel' NOT NULL,
	"price_per_hour" integer NOT NULL,
	"description" text,
	"image" varchar(500),
	"manager_phone" varchar(20),
	"open_time" varchar(5) DEFAULT '07:00' NOT NULL,
	"close_time" varchar(5) DEFAULT '23:00' NOT NULL,
	"slot_duration" smallint DEFAULT 60 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "deals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"court_id" uuid NOT NULL,
	"slot_date" varchar(10) NOT NULL,
	"slot_start" varchar(5) NOT NULL,
	"slot_end" varchar(5) NOT NULL,
	"discount_percent" smallint NOT NULL,
	"valid_until" timestamp NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "gpt_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "gpts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"image" varchar(500),
	"system_prompt" text NOT NULL,
	"questions" jsonb DEFAULT '[]'::jsonb,
	"type" varchar(20),
	"index" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "image_generations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"model_slug" varchar(255) NOT NULL,
	"prompt" text NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb,
	"images" jsonb DEFAULT '[]'::jsonb,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "match_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"team" varchar(1) NOT NULL,
	"is_win" boolean,
	"joined_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"sport_type" varchar(50) NOT NULL,
	"location" varchar(255) NOT NULL,
	"court_name" varchar(255),
	"scheduled_at" timestamp NOT NULL,
	"team_size" smallint DEFAULT 2 NOT NULL,
	"status" varchar(20) DEFAULT 'open' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "message_reactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"reaction" varchar(20) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chat_id" uuid NOT NULL,
	"from" varchar(20) NOT NULL,
	"content" text NOT NULL,
	"attachments" jsonb DEFAULT '[]'::jsonb,
	"model" varchar(255) DEFAULT 'GPT-5',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "models" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"provider" varchar(100) NOT NULL,
	"type" varchar(20) NOT NULL,
	"price" integer DEFAULT 1 NOT NULL,
	"system_prompt" text DEFAULT '',
	"description" text DEFAULT ''
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"type" varchar(20) DEFAULT 'SYSTEM' NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "otp_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" varchar(20) NOT NULL,
	"code" varchar(6) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pricing_analytics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"event_type" varchar(50) NOT NULL,
	"modal_type" varchar(50) NOT NULL,
	"trigger_source" varchar(100),
	"selected_plan" varchar(50),
	"selected_period" varchar(50),
	"user_agent" text,
	"device_type" varchar(50),
	"platform" varchar(50),
	"session_id" varchar(255),
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "promotions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"subtitle" text,
	"badge_text" varchar(60),
	"cta_text" varchar(80) DEFAULT 'مشاهده' NOT NULL,
	"cta_href" varchar(255) DEFAULT '/mybooking' NOT NULL,
	"gradient_from" varchar(30) DEFAULT '#2B0FD9' NOT NULL,
	"gradient_to" varchar(30) DEFAULT '#7C3AED' NOT NULL,
	"emoji" varchar(10),
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"type" varchar(20) NOT NULL,
	"period" varchar(20) NOT NULL,
	"status" varchar(20) DEFAULT 'pending',
	"track_code" varchar(255),
	"callback_body" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" varchar(20),
	"name" varchar(255),
	"image" varchar(500),
	"credits" integer DEFAULT 30 NOT NULL,
	"subscription_type" varchar(256),
	"subscription_end_date" timestamp,
	"last_reset_credits_date" timestamp,
	"is_admin" boolean DEFAULT false NOT NULL,
	"bio" text,
	"skill_level" varchar(20) DEFAULT 'beginner',
	"favorite_sport" varchar(50) DEFAULT 'padel',
	"xp" integer DEFAULT 0 NOT NULL,
	"level" smallint DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "video_generations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"model_slug" varchar(255) NOT NULL,
	"prompt" text NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb,
	"image_reference" text,
	"status" varchar(20) DEFAULT 'queued',
	"progress" integer DEFAULT 0,
	"error_message" text,
	"video_url" text,
	"video_path" varchar(500),
	"thumbnail_path" varchar(500),
	"video_s3_key" varchar(500),
	"video_s3_url" text,
	"thumbnail_s3_key" varchar(500),
	"thumbnail_s3_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_bookings_user_id" ON "bookings" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_bookings_court_id" ON "bookings" ("court_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_bookings_date" ON "bookings" ("date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_bookings_status" ON "bookings" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_courts_sport_type" ON "courts" ("sport_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_courts_is_active" ON "courts" ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_deals_court_id" ON "deals" ("court_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_deals_valid_until" ON "deals" ("valid_until");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_deals_is_active" ON "deals" ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_match_participants_match_id" ON "match_participants" ("match_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_match_participants_user_id" ON "match_participants" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_matches_status" ON "matches" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_matches_scheduled_at" ON "matches" ("scheduled_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_matches_sport_type" ON "matches" ("sport_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_notifications_user_id" ON "notifications" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_notifications_is_read" ON "notifications" ("is_read");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_notifications_type" ON "notifications" ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_notifications_created_at" ON "notifications" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_otp_codes_phone" ON "otp_codes" ("phone");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_otp_codes_expires_at" ON "otp_codes" ("expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_otp_codes_verified" ON "otp_codes" ("verified");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_otp_codes_created_at" ON "otp_codes" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pricing_analytics_user_id" ON "pricing_analytics" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pricing_analytics_event_type" ON "pricing_analytics" ("event_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pricing_analytics_modal_type" ON "pricing_analytics" ("modal_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pricing_analytics_created_at" ON "pricing_analytics" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pricing_analytics_trigger_source" ON "pricing_analytics" ("trigger_source");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_promotions_is_active" ON "promotions" ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_promotions_sort_order" ON "promotions" ("sort_order");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_users_phone" ON "users" ("phone");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_users_subscription_type" ON "users" ("subscription_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_users_last_reset_credits_date" ON "users" ("last_reset_credits_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_users_subscription_end_date" ON "users" ("subscription_end_date");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bookings" ADD CONSTRAINT "bookings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bookings" ADD CONSTRAINT "bookings_court_id_courts_id_fk" FOREIGN KEY ("court_id") REFERENCES "courts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chats" ADD CONSTRAINT "chats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chats" ADD CONSTRAINT "chats_gpt_id_gpts_id_fk" FOREIGN KEY ("gpt_id") REFERENCES "gpts"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "deals" ADD CONSTRAINT "deals_court_id_courts_id_fk" FOREIGN KEY ("court_id") REFERENCES "courts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "gpts" ADD CONSTRAINT "gpts_category_id_gpt_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "gpt_categories"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "image_generations" ADD CONSTRAINT "image_generations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "match_participants" ADD CONSTRAINT "match_participants_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "match_participants" ADD CONSTRAINT "match_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "matches" ADD CONSTRAINT "matches_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "message_reactions" ADD CONSTRAINT "message_reactions_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "message_reactions" ADD CONSTRAINT "message_reactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "messages" ADD CONSTRAINT "messages_chat_id_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "chats"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pricing_analytics" ADD CONSTRAINT "pricing_analytics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "video_generations" ADD CONSTRAINT "video_generations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
