-- Campaign "Ajak Teman": semua kolom baru, aditif dan nullable/berdefault. Data yang ada tidak berubah.
CREATE TYPE "PeranReferral" AS ENUM ('PENGAJAK', 'TEMAN');

ALTER TABLE "RatePeriod"
  ADD COLUMN "campaign" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "acuanId" TEXT;

ALTER TABLE "RatePeriod"
  ADD CONSTRAINT "RatePeriod_acuanId_fkey" FOREIGN KEY ("acuanId") REFERENCES "RatePeriod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ServiceJob"
  ADD COLUMN "referralKode" TEXT,
  ADD COLUMN "referralPeran" "PeranReferral";

CREATE INDEX "ServiceJob_referralKode_idx" ON "ServiceJob"("referralKode");
