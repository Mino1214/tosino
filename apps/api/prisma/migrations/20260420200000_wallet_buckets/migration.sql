-- CreateEnum
CREATE TYPE "WalletTransactionType" AS ENUM ('POINT_REDEEM', 'COMP_SETTLEMENT', 'BET', 'WIN', 'DEPOSIT', 'WITHDRAW', 'UNLOCK', 'ROLLBACK', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "WalletBucket" AS ENUM ('LOCKED_DEPOSIT', 'LOCKED_WIN', 'COMP_FREE', 'POINT_FREE');

-- AlterTable
ALTER TABLE "Wallet" ADD COLUMN "lockedDeposit" DECIMAL(18,2) NOT NULL DEFAULT 0;
ALTER TABLE "Wallet" ADD COLUMN "lockedWin" DECIMAL(18,2) NOT NULL DEFAULT 0;
ALTER TABLE "Wallet" ADD COLUMN "compFree" DECIMAL(18,2) NOT NULL DEFAULT 0;
ALTER TABLE "Wallet" ADD COLUMN "pointFree" DECIMAL(18,2) NOT NULL DEFAULT 0;

UPDATE "Wallet" SET "lockedDeposit" = "balance" WHERE "lockedDeposit" = 0;

-- CreateTable
CREATE TABLE "PointRedeemLog" (
    "id" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "redeemAmount" DECIMAL(18,2) NOT NULL,
    "pointsRedeemed" DECIMAL(18,2) NOT NULL,
    "pointBefore" DECIMAL(18,2) NOT NULL,
    "pointAfter" DECIMAL(18,2) NOT NULL,
    "pointFreeBefore" DECIMAL(18,2) NOT NULL,
    "pointFreeAfter" DECIMAL(18,2) NOT NULL,
    "currency" VARCHAR(8) NOT NULL DEFAULT 'KRW',
    "eventKey" VARCHAR(160) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointRedeemLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompSettlementLedgerLog" (
    "id" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "settlementAmount" DECIMAL(18,2) NOT NULL,
    "compFreeBefore" DECIMAL(18,2) NOT NULL,
    "compFreeAfter" DECIMAL(18,2) NOT NULL,
    "settlementPeriodStart" TIMESTAMP(3) NOT NULL,
    "settlementPeriodEnd" TIMESTAMP(3) NOT NULL,
    "compSettlementId" TEXT,
    "eventKey" VARCHAR(160) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompSettlementLedgerLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletTransaction" (
    "id" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "transactionType" "WalletTransactionType" NOT NULL,
    "sourceBucket" "WalletBucket",
    "targetBucket" "WalletBucket",
    "amount" DECIMAL(18,2) NOT NULL,
    "balanceBefore" DECIMAL(18,2) NOT NULL,
    "balanceAfter" DECIMAL(18,2) NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "eventKey" VARCHAR(160),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PointRedeemLog_eventKey_key" ON "PointRedeemLog"("eventKey");

CREATE INDEX "PointRedeemLog_userId_createdAt_idx" ON "PointRedeemLog"("userId", "createdAt");

CREATE INDEX "PointRedeemLog_platformId_createdAt_idx" ON "PointRedeemLog"("platformId", "createdAt");

CREATE UNIQUE INDEX "CompSettlementLedgerLog_compSettlementId_key" ON "CompSettlementLedgerLog"("compSettlementId");

CREATE UNIQUE INDEX "CompSettlementLedgerLog_eventKey_key" ON "CompSettlementLedgerLog"("eventKey");

CREATE INDEX "CompSettlementLedgerLog_userId_createdAt_idx" ON "CompSettlementLedgerLog"("userId", "createdAt");

CREATE INDEX "CompSettlementLedgerLog_platformId_createdAt_idx" ON "CompSettlementLedgerLog"("platformId", "createdAt");

CREATE INDEX "WalletTransaction_userId_createdAt_idx" ON "WalletTransaction"("userId", "createdAt");

CREATE INDEX "WalletTransaction_platformId_createdAt_idx" ON "WalletTransaction"("platformId", "createdAt");

CREATE INDEX "WalletTransaction_platformId_eventKey_idx" ON "WalletTransaction"("platformId", "eventKey");

-- AddForeignKey
ALTER TABLE "PointRedeemLog" ADD CONSTRAINT "PointRedeemLog_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "Platform"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointRedeemLog" ADD CONSTRAINT "PointRedeemLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompSettlementLedgerLog" ADD CONSTRAINT "CompSettlementLedgerLog_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "Platform"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompSettlementLedgerLog" ADD CONSTRAINT "CompSettlementLedgerLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "Platform"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
