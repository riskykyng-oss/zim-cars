-- Production hardening: bring the schema created by the initial migration in
-- line with prisma/schema.prisma.
--
-- This migration is intentionally idempotent. The original 20261028114949_init
-- migration was committed before the schema was finalised, so databases that
-- were created from it need these changes. Databases that already match the
-- current schema (for example the original local development database) can
-- apply it without error.

-- DropIndex
DROP INDEX IF EXISTS "leads_referral_code_key";

-- AlterTable: leads
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "ip" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "lead_id_short" VARCHAR(20);
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "page_url" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "user_agent" TEXT;
ALTER TABLE "leads" ALTER COLUMN "referral_code" DROP NOT NULL;

-- AlterTable: sales
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "marked_by" TEXT;
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "ref_code" VARCHAR(80);

-- AlterTable: vehicles
ALTER TABLE "vehicles" ADD COLUMN IF NOT EXISTS "duty_paid" BOOLEAN DEFAULT false;
ALTER TABLE "vehicles" ADD COLUMN IF NOT EXISTS "fuel_type" VARCHAR(20);
ALTER TABLE "vehicles" ADD COLUMN IF NOT EXISTS "location" VARCHAR(80);
ALTER TABLE "vehicles" ADD COLUMN IF NOT EXISTS "mileage" INTEGER;
ALTER TABLE "vehicles" ADD COLUMN IF NOT EXISTS "slug" VARCHAR(120);
ALTER TABLE "vehicles" ADD COLUMN IF NOT EXISTS "transmission" VARCHAR(20);
ALTER TABLE "vehicles" ADD COLUMN IF NOT EXISTS "video_url" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "lead_events" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "event" VARCHAR(50) NOT NULL,
    "old_value" TEXT,
    "new_value" TEXT,
    "actor" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "lead_events_lead_id_idx" ON "lead_events"("lead_id");
CREATE INDEX IF NOT EXISTS "lead_events_created_at_idx" ON "lead_events"("created_at");

CREATE INDEX IF NOT EXISTS "audit_logs_actor_id_idx" ON "audit_logs"("actor_id");
CREATE INDEX IF NOT EXISTS "audit_logs_dealer_id_idx" ON "audit_logs"("dealer_id");
CREATE INDEX IF NOT EXISTS "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");
CREATE INDEX IF NOT EXISTS "audit_logs_created_at_idx" ON "audit_logs"("created_at");

CREATE INDEX IF NOT EXISTS "commission_payments_sale_id_idx" ON "commission_payments"("sale_id");
CREATE INDEX IF NOT EXISTS "commission_payments_paid_at_idx" ON "commission_payments"("paid_at");
CREATE INDEX IF NOT EXISTS "commission_payments_recorded_by_idx" ON "commission_payments"("recorded_by");

CREATE UNIQUE INDEX IF NOT EXISTS "leads_lead_id_short_key" ON "leads"("lead_id_short");
CREATE INDEX IF NOT EXISTS "leads_dealer_id_idx" ON "leads"("dealer_id");
CREATE INDEX IF NOT EXISTS "leads_vehicle_id_idx" ON "leads"("vehicle_id");
CREATE INDEX IF NOT EXISTS "leads_status_idx" ON "leads"("status");
CREATE INDEX IF NOT EXISTS "leads_created_at_idx" ON "leads"("created_at");
CREATE INDEX IF NOT EXISTS "leads_dealer_id_created_at_idx" ON "leads"("dealer_id", "created_at");
CREATE INDEX IF NOT EXISTS "leads_dealer_id_status_idx" ON "leads"("dealer_id", "status");
CREATE INDEX IF NOT EXISTS "leads_vehicle_id_buyer_phone_idx" ON "leads"("vehicle_id", "buyer_phone");

CREATE INDEX IF NOT EXISTS "sales_vehicle_id_idx" ON "sales"("vehicle_id");
CREATE INDEX IF NOT EXISTS "sales_status_idx" ON "sales"("status");
CREATE INDEX IF NOT EXISTS "sales_sold_at_idx" ON "sales"("sold_at");
CREATE INDEX IF NOT EXISTS "sales_confirmed_by_idx" ON "sales"("confirmed_by");

CREATE INDEX IF NOT EXISTS "users_dealer_id_idx" ON "users"("dealer_id");
CREATE INDEX IF NOT EXISTS "vehicle_images_vehicle_id_idx" ON "vehicle_images"("vehicle_id");

CREATE UNIQUE INDEX IF NOT EXISTS "vehicles_slug_key" ON "vehicles"("slug");
CREATE INDEX IF NOT EXISTS "vehicles_dealer_id_idx" ON "vehicles"("dealer_id");
CREATE INDEX IF NOT EXISTS "vehicles_status_idx" ON "vehicles"("status");
CREATE INDEX IF NOT EXISTS "vehicles_created_at_idx" ON "vehicles"("created_at");
CREATE INDEX IF NOT EXISTS "vehicles_dealer_id_status_idx" ON "vehicles"("dealer_id", "status");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lead_events_lead_id_fkey'
  ) THEN
    ALTER TABLE "lead_events"
      ADD CONSTRAINT "lead_events_lead_id_fkey"
      FOREIGN KEY ("lead_id") REFERENCES "leads"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END
$$;
