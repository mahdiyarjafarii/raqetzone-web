-- Add reason column and update unique constraint for multi-milestone spins
ALTER TABLE "spin_wheel_spins" ADD COLUMN IF NOT EXISTS "reason" varchar(50) NOT NULL DEFAULT 'first_match';

-- Drop old single-user unique index
DROP INDEX IF EXISTS "uq_spin_wheel_spins_user_id";

-- Add new unique index per user+reason
CREATE UNIQUE INDEX IF NOT EXISTS "uq_spin_wheel_spins_user_reason" ON "spin_wheel_spins" ("user_id", "reason");
