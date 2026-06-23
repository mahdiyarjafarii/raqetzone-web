-- Make discount_codes.club_id nullable for platform-level discounts
ALTER TABLE "discount_codes" ALTER COLUMN "club_id" DROP NOT NULL;

-- Create spin_wheel_spins table
CREATE TABLE IF NOT EXISTS "spin_wheel_spins" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "prize_label" varchar(100) NOT NULL,
  "prize_type" varchar(20) NOT NULL,
  "prize_value" integer NOT NULL,
  "discount_code_id" uuid REFERENCES "discount_codes"("id") ON DELETE SET NULL,
  "spun_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_spin_wheel_spins_user_id" ON "spin_wheel_spins" ("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_spin_wheel_spins_user_id" ON "spin_wheel_spins" ("user_id");
