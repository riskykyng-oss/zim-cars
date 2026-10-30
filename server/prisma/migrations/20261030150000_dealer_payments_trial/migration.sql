-- Add subscription/trial fields to dealers
ALTER TABLE "dealers" ADD COLUMN "phone" VARCHAR(20);
ALTER TABLE "dealers" ADD COLUMN "location" VARCHAR(100);
ALTER TABLE "dealers" ADD COLUMN "plan" VARCHAR(20) DEFAULT 'trial';
ALTER TABLE "dealers" ADD COLUMN "trial_ends_at" TIMESTAMP(3);
ALTER TABLE "dealers" ADD COLUMN "subscription_ends_at" TIMESTAMP(3);
ALTER TABLE "dealers" ADD COLUMN "last_payment_at" TIMESTAMP(3);
ALTER TABLE "dealers" ADD COLUMN "onboarding_paid" BOOLEAN DEFAULT FALSE;
ALTER TABLE "dealers" ADD COLUMN "subscription_paid" BOOLEAN DEFAULT FALSE;
ALTER TABLE "dealers" ADD COLUMN "joined_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "dealers" ADD COLUMN "approved_at" TIMESTAMP(3);
ALTER TABLE "dealers" ADD COLUMN "approved_by" TEXT;
ALTER TABLE "dealers" ALTER COLUMN "status" SET DEFAULT 'trial';

-- Update existing dealers to have 2 month trial
UPDATE "dealers" SET "status" = 'trial', "plan" = 'trial', "trial_ends_at" = NOW() + INTERVAL '2 months', "joined_at" = COALESCE("created_at", NOW()) WHERE "status" = 'active';

-- Create payments table
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "dealer_id" TEXT NOT NULL,
    "type" VARCHAR(30) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "method" VARCHAR(30) NOT NULL,
    "reference" VARCHAR(150),
    "proof_url" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payments_dealer_id_idx" ON "payments"("dealer_id");
CREATE INDEX "payments_status_idx" ON "payments"("status");
CREATE INDEX "payments_created_at_idx" ON "payments"("created_at");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_dealer_id_fkey" FOREIGN KEY ("dealer_id") REFERENCES "dealers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
