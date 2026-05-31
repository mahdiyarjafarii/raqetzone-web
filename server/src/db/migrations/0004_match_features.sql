-- Add certified flag and invite token to matches
ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "is_certified" boolean DEFAULT false NOT NULL;
ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "invite_token" varchar(64);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_matches_invite_token" ON "matches" ("invite_token");
--> statement-breakpoint

-- Match ratings table (for Match Quality Index)
CREATE TABLE IF NOT EXISTS "match_ratings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "match_id" uuid NOT NULL REFERENCES "matches"("id") ON DELETE cascade,
  "from_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "to_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "tags" text[] NOT NULL DEFAULT '{}',
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "match_ratings_unique" UNIQUE ("match_id", "from_user_id", "to_user_id")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_match_ratings_match_id" ON "match_ratings" ("match_id");
CREATE INDEX IF NOT EXISTS "idx_match_ratings_to_user_id" ON "match_ratings" ("to_user_id");
CREATE INDEX IF NOT EXISTS "idx_match_ratings_from_user_id" ON "match_ratings" ("from_user_id");
