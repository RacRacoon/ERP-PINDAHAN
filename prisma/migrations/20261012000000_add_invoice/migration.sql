ALTER TABLE "ServiceJob" ADD COLUMN "invoice" TEXT;
ALTER TABLE "RepairJob" ADD COLUMN "invoice" TEXT;
CREATE UNIQUE INDEX "ServiceJob_invoice_key" ON "ServiceJob"("invoice");
CREATE UNIQUE INDEX "RepairJob_invoice_key" ON "RepairJob"("invoice");
