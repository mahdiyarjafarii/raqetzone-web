CREATE TABLE IF NOT EXISTS "tennis_duel_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "score" integer NOT NULL DEFAULT 0,
  "won" boolean NOT NULL DEFAULT false,
  "reward_granted" boolean NOT NULL DEFAULT false,
  "client_meta" jsonb DEFAULT '{}'::jsonb,
  "started_at" timestamp NOT NULL DEFAULT now(),
  "submitted_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "tennis_duel_rewards" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "session_id" uuid NOT NULL REFERENCES "tennis_duel_sessions"("id") ON DELETE CASCADE,
  "score" integer NOT NULL,
  "credits_granted" integer NOT NULL,
  "reward_date_key" varchar(10) NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_tennis_duel_sessions_user_id" ON "tennis_duel_sessions" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_tennis_duel_sessions_created_at" ON "tennis_duel_sessions" ("created_at");
CREATE INDEX IF NOT EXISTS "idx_tennis_duel_rewards_user_id" ON "tennis_duel_rewards" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_tennis_duel_rewards_date" ON "tennis_duel_rewards" ("reward_date_key");

CREATE UNIQUE INDEX IF NOT EXISTS "uq_tennis_duel_rewards_session_id" ON "tennis_duel_rewards" ("session_id");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_tennis_duel_rewards_user_date" ON "tennis_duel_rewards" ("user_id", "reward_date_key");
