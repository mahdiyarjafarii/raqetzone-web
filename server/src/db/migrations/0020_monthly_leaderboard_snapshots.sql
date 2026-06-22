CREATE TABLE "leaderboard_monthly_snapshots" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "sport_type" varchar(50) DEFAULT 'padel' NOT NULL,
  "period_year" integer NOT NULL,
  "period_month" integer NOT NULL,
  "rank" integer NOT NULL,
  "points" integer DEFAULT 0 NOT NULL,
  "match_points" integer DEFAULT 0 NOT NULL,
  "tournament_points" integer DEFAULT 0 NOT NULL,
  "matches_count" integer DEFAULT 0 NOT NULL,
  "tournaments_count" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "leaderboard_monthly_snapshots"
  ADD CONSTRAINT "leaderboard_monthly_snapshots_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;

CREATE INDEX "idx_lms_user_id" ON "leaderboard_monthly_snapshots" ("user_id");
CREATE INDEX "idx_lms_period" ON "leaderboard_monthly_snapshots" ("period_year", "period_month");
CREATE INDEX "idx_lms_sport_period" ON "leaderboard_monthly_snapshots" ("sport_type", "period_year", "period_month");
CREATE UNIQUE INDEX "uq_lms_user_sport_period" ON "leaderboard_monthly_snapshots" ("user_id", "sport_type", "period_year", "period_month");
