ALTER TABLE "users" ADD COLUMN "password_hash" varchar(255);
ALTER TABLE "users" ADD COLUMN "is_default_password" boolean NOT NULL DEFAULT false;
