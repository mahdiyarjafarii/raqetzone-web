CREATE TABLE IF NOT EXISTS "direct_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"participant_a_id" uuid NOT NULL,
	"participant_b_id" uuid NOT NULL,
	"last_message_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "direct_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"sender_id" uuid NOT NULL,
	"content" text NOT NULL,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "discount_code_usages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"discount_code_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"booking_id" uuid,
	"discount_amount" integer NOT NULL,
	"used_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "discount_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"club_id" uuid NOT NULL,
	"code" varchar(50) NOT NULL,
	"discount_type" varchar(10) DEFAULT 'percent' NOT NULL,
	"discount_value" integer NOT NULL,
	"max_uses" integer,
	"used_count" integer DEFAULT 0 NOT NULL,
	"per_user_limit" smallint DEFAULT 1 NOT NULL,
	"min_booking_price" integer DEFAULT 0,
	"expires_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "discount_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_direct_conv_a" ON "direct_conversations" ("participant_a_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_direct_conv_b" ON "direct_conversations" ("participant_b_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_direct_conv_last_msg" ON "direct_conversations" ("last_message_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_direct_msg_conv_id" ON "direct_messages" ("conversation_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_direct_msg_sender_id" ON "direct_messages" ("sender_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_direct_msg_created_at" ON "direct_messages" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_discount_usages_code_id" ON "discount_code_usages" ("discount_code_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_discount_usages_user_id" ON "discount_code_usages" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_discount_usages_booking_id" ON "discount_code_usages" ("booking_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_discount_codes_club_id" ON "discount_codes" ("club_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_discount_codes_code" ON "discount_codes" ("code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_discount_codes_is_active" ON "discount_codes" ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_discount_codes_expires_at" ON "discount_codes" ("expires_at");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "direct_conversations" ADD CONSTRAINT "direct_conversations_participant_a_id_users_id_fk" FOREIGN KEY ("participant_a_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "direct_conversations" ADD CONSTRAINT "direct_conversations_participant_b_id_users_id_fk" FOREIGN KEY ("participant_b_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "direct_messages" ADD CONSTRAINT "direct_messages_conversation_id_direct_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "direct_conversations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "direct_messages" ADD CONSTRAINT "direct_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "discount_code_usages" ADD CONSTRAINT "discount_code_usages_discount_code_id_discount_codes_id_fk" FOREIGN KEY ("discount_code_id") REFERENCES "discount_codes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "discount_code_usages" ADD CONSTRAINT "discount_code_usages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "discount_code_usages" ADD CONSTRAINT "discount_code_usages_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "discount_codes" ADD CONSTRAINT "discount_codes_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
