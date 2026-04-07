-- CreateEnum
CREATE TYPE "BankSmsIngestStatus" AS ENUM ('RECEIVED', 'PARSE_ERROR', 'NO_PLATFORM', 'NO_MATCH', 'AUTO_CREDITED', 'IGNORE_WITHDRAWAL', 'DUPLICATE');

-- AlterTable Platform
ALTER TABLE "Platform" ADD COLUMN "semiVirtualEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Platform" ADD COLUMN "semiVirtualRecipientPhone" TEXT;
ALTER TABLE "Platform" ADD COLUMN "semiVirtualAccountHint" TEXT;

CREATE UNIQUE INDEX "Platform_semiVirtualRecipientPhone_key" ON "Platform"("semiVirtualRecipientPhone");

-- AlterTable WalletRequest
ALTER TABLE "WalletRequest" ADD COLUMN "depositorName" TEXT;

-- CreateTable
CREATE TABLE "BankSmsIngest" (
    "id" TEXT NOT NULL,
    "platformId" TEXT,
    "bodyHash" TEXT NOT NULL,
    "rawBody" TEXT NOT NULL,
    "sender" TEXT,
    "recipientPhoneSnapshot" TEXT,
    "parsedJson" JSONB,
    "status" "BankSmsIngestStatus" NOT NULL,
    "failureReason" TEXT,
    "matchedWalletRequestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankSmsIngest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BankSmsIngest_bodyHash_key" ON "BankSmsIngest"("bodyHash");
CREATE INDEX "BankSmsIngest_platformId_createdAt_idx" ON "BankSmsIngest"("platformId", "createdAt");

ALTER TABLE "BankSmsIngest" ADD CONSTRAINT "BankSmsIngest_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "Platform"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BankSmsIngest" ADD CONSTRAINT "BankSmsIngest_matchedWalletRequestId_fkey" FOREIGN KEY ("matchedWalletRequestId") REFERENCES "WalletRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
