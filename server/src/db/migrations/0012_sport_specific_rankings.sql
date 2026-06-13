ALTER TABLE "user_rankings"
ADD COLUMN IF NOT EXISTS "sport_type" varchar(50) NOT NULL DEFAULT 'padel';

ALTER TABLE "ranking_events"
ADD COLUMN IF NOT EXISTS "sport_type" varchar(50) NOT NULL DEFAULT 'padel';

CREATE INDEX IF NOT EXISTS "idx_user_rankings_sport_type" ON "user_rankings" ("sport_type");
CREATE INDEX IF NOT EXISTS "idx_ranking_events_sport_type" ON "ranking_events" ("sport_type");

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_rankings_user_id_unique'
  ) THEN
    ALTER TABLE "user_rankings" DROP CONSTRAINT "user_rankings_user_id_unique";
  END IF;
END $$;

DROP INDEX IF EXISTS "uq_user_rankings_user_sport";
CREATE UNIQUE INDEX IF NOT EXISTS "uq_user_rankings_user_sport" ON "user_rankings" ("user_id", "sport_type");
