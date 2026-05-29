CREATE TABLE "discount_codes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "club_id" uuid NOT NULL REFERENCES "clubs"("id") ON DELETE CASCADE,
  "code" varchar(50) NOT NULL UNIQUE,
  "discount_type" varchar(10) NOT NULL DEFAULT 'percent',
  "discount_value" integer NOT NULL,
  "max_uses" integer,
  "used_count" integer NOT NULL DEFAULT 0,
  "per_user_limit" smallint NOT NULL DEFAULT 1,
  "min_booking_price" integer DEFAULT 0,
  "expires_at" timestamp,
  "is_active" boolean NOT NULL DEFAULT true,
  "description" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE "discount_code_usages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "discount_code_id" uuid NOT NULL REFERENCES "discount_codes"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "booking_id" uuid REFERENCES "bookings"("id") ON DELETE SET NULL,
  "discount_amount" integer NOT NULL,
  "used_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX "idx_discount_codes_club_id" ON "discount_codes"("club_id");
CREATE INDEX "idx_discount_codes_code" ON "discount_codes"("code");
CREATE INDEX "idx_discount_codes_is_active" ON "discount_codes"("is_active");
CREATE INDEX "idx_discount_codes_expires_at" ON "discount_codes"("expires_at");
CREATE INDEX "idx_discount_usages_code_id" ON "discount_code_usages"("discount_code_id");
CREATE INDEX "idx_discount_usages_user_id" ON "discount_code_usages"("user_id");
CREATE INDEX "idx_discount_usages_booking_id" ON "discount_code_usages"("booking_id");
