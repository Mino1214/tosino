-- AlterTable
ALTER TABLE "BankSmsIngest" ADD COLUMN     "semiVirtualDeviceMatch" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "BankSmsIngest_platformId_semiVirtualDeviceMatch_createdAt_idx" ON "BankSmsIngest"("platformId", "semiVirtualDeviceMatch", "createdAt");
