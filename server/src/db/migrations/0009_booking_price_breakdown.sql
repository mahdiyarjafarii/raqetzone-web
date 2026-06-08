ALTER TABLE "bookings" ADD COLUMN "base_price" integer;
ALTER TABLE "bookings" ADD COLUMN "slot_discount_percent" smallint DEFAULT 0;
ALTER TABLE "bookings" ADD COLUMN "discount_code" varchar(50);
ALTER TABLE "bookings" ADD COLUMN "discount_amount" integer DEFAULT 0;
