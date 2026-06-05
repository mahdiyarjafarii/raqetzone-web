CREATE TABLE IF NOT EXISTS "wallets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL UNIQUE,
  "balance" integer DEFAULT 0 NOT NULL,
  "currency" varchar(10) DEFAULT 'IRT' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

DO $$ BEGIN
 ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "idx_wallets_user_id" ON "wallets" ("user_id");

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
  "metadata" jsonb DEFAULT '{}',
  "created_at" timestamp DEFAULT now() NOT NULL
);

DO $$ BEGIN
 ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE set null;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "idx_wallet_transactions_user_id" ON "wallet_transactions" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_wallet_transactions_wallet_id" ON "wallet_transactions" ("wallet_id");
CREATE INDEX IF NOT EXISTS "idx_wallet_transactions_gateway_track_code" ON "wallet_transactions" ("gateway_track_code");
CREATE INDEX IF NOT EXISTS "idx_wallet_transactions_reference" ON "wallet_transactions" ("reference_type", "reference_id");

ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "payment_method" varchar(20) DEFAULT 'none' NOT NULL;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "payment_status" varchar(20) DEFAULT 'unpaid' NOT NULL;
