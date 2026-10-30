-- Add verification fields to dealers
ALTER TABLE "dealers" ADD COLUMN "owner_full_name" VARCHAR(150);
ALTER TABLE "dealers" ADD COLUMN "business_email" VARCHAR(255);
ALTER TABLE "dealers" ADD COLUMN "ecocash_name" VARCHAR(150);
ALTER TABLE "dealers" ADD COLUMN "id_number" VARCHAR(50);
ALTER TABLE "dealers" ADD COLUMN "verification_status" VARCHAR(20) DEFAULT 'pending';
ALTER TABLE "dealers" ADD COLUMN "verified_at" TIMESTAMP(3);
ALTER TABLE "dealers" ADD COLUMN "verified_by" TEXT;
ALTER TABLE "dealers" ADD COLUMN "rejection_reason" TEXT;
ALTER TABLE "dealers" ALTER COLUMN "status" SET DEFAULT 'pending_verification';

-- Mark existing dealers as verified
UPDATE "dealers" SET "status" = 'trial', "verification_status" = 'verified', "verified_at" = COALESCE("verified_at", NOW()) WHERE "name" IS NOT NULL;

-- Add verification docs table
CREATE TABLE "dealer_verifications" (
  "id" TEXT NOT NULL,
  "dealer_id" TEXT NOT NULL,
  "type" VARCHAR(30) NOT NULL,
  "file_url" TEXT NOT NULL,
  "notes" TEXT,
  "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
  "reviewed_by" TEXT,
  "reviewed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "dealer_verifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "dealer_verifications_dealer_id_idx" ON "dealer_verifications"("dealer_id");
CREATE INDEX "dealer_verifications_status_idx" ON "dealer_verifications"("status");
ALTER TABLE "dealer_verifications" ADD CONSTRAINT "dealer_verifications_dealer_id_fkey" FOREIGN KEY ("dealer_id") REFERENCES "dealers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add sender name to payments
ALTER TABLE "payments" ADD COLUMN "sender_name" VARCHAR(150);