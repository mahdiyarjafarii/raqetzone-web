CREATE TABLE IF NOT EXISTS "match_ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid NOT NULL,
	"from_user_id" uuid NOT NULL,
	"to_user_id" uuid NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "wallet_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_id" uuid,
	"user_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"direction" varchar(10) NOT NULL,
	"type" varchar(40) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"reference_type" varchar(40),
	"reference_id" uuid,
	"gateway_track_code" varchar(255),
	"callback_body" jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "wallets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"balance" integer DEFAULT 0 NOT NULL,
	"currency" varchar(10) DEFAULT 'IRT' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "wallets_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "payment_method" varchar(20) DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "payment_status" varchar(20) DEFAULT 'unpaid' NOT NULL;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "is_certified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "invite_token" varchar(64);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_match_ratings_match_id" ON "match_ratings" ("match_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_match_ratings_to_user_id" ON "match_ratings" ("to_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_match_ratings_from_user_id" ON "match_ratings" ("from_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "match_ratings_unique" ON "match_ratings" ("match_id","from_user_id","to_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_wallet_transactions_user_id" ON "wallet_transactions" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_wallet_transactions_wallet_id" ON "wallet_transactions" ("wallet_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_wallet_transactions_gateway_track_code" ON "wallet_transactions" ("gateway_track_code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_wallet_transactions_reference" ON "wallet_transactions" ("reference_type","reference_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_wallets_user_id" ON "wallets" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_matches_invite_token" ON "matches" ("invite_token");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "match_ratings" ADD CONSTRAINT "match_ratings_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "match_ratings" ADD CONSTRAINT "match_ratings_from_user_id_users_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "match_ratings" ADD CONSTRAINT "match_ratings_to_user_id_users_id_fk" FOREIGN KEY ("to_user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
