ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "is_coach" boolean NOT NULL DEFAULT false;

ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "coach_verification_status" varchar(20) NOT NULL DEFAULT 'none';

CREATE INDEX IF NOT EXISTS "idx_users_is_coach" ON "users" ("is_coach");
CREATE INDEX IF NOT EXISTS "idx_users_coach_verification_status" ON "users" ("coach_verification_status");

CREATE TABLE IF NOT EXISTS "coach_classes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "coach_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "title" varchar(255) NOT NULL,
  "description" text,
  "sport_type" varchar(50) NOT NULL DEFAULT 'padel',
  "city" varchar(100),
  "price" integer NOT NULL DEFAULT 0,
  "capacity" integer NOT NULL DEFAULT 10,
  "enrolled_count" integer NOT NULL DEFAULT 0,
  "sessions" jsonb DEFAULT '[]'::jsonb,
  "status" varchar(20) NOT NULL DEFAULT 'active',
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_coach_classes_coach_id" ON "coach_classes" ("coach_id");
CREATE INDEX IF NOT EXISTS "idx_coach_classes_sport_type" ON "coach_classes" ("sport_type");
CREATE INDEX IF NOT EXISTS "idx_coach_classes_status" ON "coach_classes" ("status");
CREATE INDEX IF NOT EXISTS "idx_coach_classes_created_at" ON "coach_classes" ("created_at");

CREATE TABLE IF NOT EXISTS "coach_class_enrollments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "class_id" uuid NOT NULL REFERENCES "coach_classes"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "status" varchar(20) NOT NULL DEFAULT 'active',
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_coach_class_enrollments_class_id" ON "coach_class_enrollments" ("class_id");
CREATE INDEX IF NOT EXISTS "idx_coach_class_enrollments_user_id" ON "coach_class_enrollments" ("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_coach_class_enrollments_class_user" ON "coach_class_enrollments" ("class_id", "user_id");
