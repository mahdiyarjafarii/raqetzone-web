CREATE TABLE IF NOT EXISTS "tournament_matches" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tournament_id" uuid NOT NULL REFERENCES "tournaments"("id") ON DELETE cascade,
  "round" smallint NOT NULL,
  "match_number" smallint NOT NULL,
  "player_a_user_id" uuid REFERENCES "users"("id") ON DELETE set null,
  "player_b_user_id" uuid REFERENCES "users"("id") ON DELETE set null,
  "winner_user_id" uuid REFERENCES "users"("id") ON DELETE set null,
  "status" varchar(20) NOT NULL DEFAULT 'scheduled',
  "score_sets" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "uq_tournament_matches_round_match" UNIQUE ("tournament_id", "round", "match_number")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_tournament_matches_tournament_id" ON "tournament_matches" ("tournament_id");
CREATE INDEX IF NOT EXISTS "idx_tournament_matches_round" ON "tournament_matches" ("tournament_id", "round");
