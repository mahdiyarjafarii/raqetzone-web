ALTER TABLE "tournaments"
ADD COLUMN IF NOT EXISTS "ranking_points" integer NOT NULL DEFAULT 10,
ADD COLUMN IF NOT EXISTS "ranking_awarded_at" timestamp;

ALTER TABLE "matches"
ADD COLUMN IF NOT EXISTS "result_reminder_sent_at" timestamp;

CREATE TABLE IF NOT EXISTS "match_results" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "match_id" uuid NOT NULL UNIQUE REFERENCES "matches"("id") ON DELETE cascade,
  "submitted_by_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "winner_team" varchar(1) NOT NULL,
  "score_sets" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "status" varchar(20) NOT NULL DEFAULT 'pending',
  "confirmed_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_match_results_match_id" ON "match_results" ("match_id");
CREATE INDEX IF NOT EXISTS "idx_match_results_status" ON "match_results" ("status");

CREATE TABLE IF NOT EXISTS "match_result_votes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "match_result_id" uuid NOT NULL REFERENCES "match_results"("id") ON DELETE cascade,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "vote" varchar(10) NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_match_result_votes_result_id" ON "match_result_votes" ("match_result_id");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_match_result_votes_result_user" ON "match_result_votes" ("match_result_id", "user_id");

CREATE TABLE IF NOT EXISTS "user_rankings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE cascade,
  "points" integer NOT NULL DEFAULT 0,
  "match_points" integer NOT NULL DEFAULT 0,
  "tournament_points" integer NOT NULL DEFAULT 0,
  "matches_count" integer NOT NULL DEFAULT 0,
  "tournaments_count" integer NOT NULL DEFAULT 0,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_user_rankings_user_id" ON "user_rankings" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_user_rankings_points" ON "user_rankings" ("points");

CREATE TABLE IF NOT EXISTS "ranking_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "source_type" varchar(20) NOT NULL,
  "source_id" uuid NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "category" varchar(20) NOT NULL,
  "points" integer NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_ranking_events_user_id" ON "ranking_events" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_ranking_events_source" ON "ranking_events" ("source_type", "source_id");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_ranking_events_source_user" ON "ranking_events" ("source_type", "source_id", "user_id");
