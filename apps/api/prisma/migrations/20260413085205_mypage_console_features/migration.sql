-- CreateEnum
CREATE TYPE "PointLedgerEntryType" AS ENUM ('ATTENDANCE', 'ATTENDANCE_STREAK', 'LOSE_BET', 'REFERRAL_FIRST_BET', 'REDEEM', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "DepositEventKind" AS ENUM ('FIRST_CHARGE', 'LIMITED_TIME');

-- AlterTable
ALTER TABLE "Platform" ADD COLUMN     "agentCanEditMemberRolling" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "minDepositKrw" DECIMAL(18,2),
ADD COLUMN     "minDepositUsdt" DECIMAL(18,8),
ADD COLUMN     "minPointRedeemKrw" DECIMAL(18,2),
ADD COLUMN     "minPointRedeemPoints" INTEGER,
ADD COLUMN     "minPointRedeemUsdt" DECIMAL(18,8),
ADD COLUMN     "minWithdrawKrw" DECIMAL(18,2),
ADD COLUMN     "minWithdrawUsdt" DECIMAL(18,8),
ADD COLUMN     "pointRulesJson" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "rollingLockWithdrawals" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "rollingTurnoverMultiplier" DECIMAL(8,4) NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "PlatformAnnouncement" ADD COLUMN     "mandatoryRead" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Wallet" ADD COLUMN     "pointBalance" DECIMAL(18,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "AnnouncementRead" (
    "userId" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnnouncementRead_pkey" PRIMARY KEY ("userId","announcementId")
);

-- CreateTable
CREATE TABLE "RollingObligation" (
    "id" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceRef" VARCHAR(160) NOT NULL,
    "principalAmount" DECIMAL(18,2) NOT NULL,
    "requiredTurnover" DECIMAL(18,2) NOT NULL,
    "appliedTurnover" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "satisfiedAt" TIMESTAMP(3),

    CONSTRAINT "RollingObligation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DepositEvent" (
    "id" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "kind" "DepositEventKind" NOT NULL,
    "title" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "tiersJson" JSONB NOT NULL DEFAULT '[]',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DepositEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserDepositEventClaim" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserDepositEventClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PointLedgerEntry" (
    "id" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "PointLedgerEntryType" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "balanceAfter" DECIMAL(18,2) NOT NULL,
    "reference" TEXT,
    "metaJson" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnnouncementRead_announcementId_idx" ON "AnnouncementRead"("announcementId");

-- CreateIndex
CREATE INDEX "RollingObligation_userId_satisfiedAt_idx" ON "RollingObligation"("userId", "satisfiedAt");

-- CreateIndex
CREATE INDEX "RollingObligation_platformId_userId_idx" ON "RollingObligation"("platformId", "userId");

-- CreateIndex
CREATE INDEX "DepositEvent_platformId_kind_active_idx" ON "DepositEvent"("platformId", "kind", "active");

-- CreateIndex
CREATE INDEX "UserDepositEventClaim_eventId_idx" ON "UserDepositEventClaim"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "UserDepositEventClaim_userId_eventId_key" ON "UserDepositEventClaim"("userId", "eventId");

-- CreateIndex
CREATE INDEX "PointLedgerEntry_userId_createdAt_idx" ON "PointLedgerEntry"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "PointLedgerEntry_platformId_userId_idx" ON "PointLedgerEntry"("platformId", "userId");

-- AddForeignKey
ALTER TABLE "AnnouncementRead" ADD CONSTRAINT "AnnouncementRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnouncementRead" ADD CONSTRAINT "AnnouncementRead_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "PlatformAnnouncement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RollingObligation" ADD CONSTRAINT "RollingObligation_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "Platform"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RollingObligation" ADD CONSTRAINT "RollingObligation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepositEvent" ADD CONSTRAINT "DepositEvent_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "Platform"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserDepositEventClaim" ADD CONSTRAINT "UserDepositEventClaim_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserDepositEventClaim" ADD CONSTRAINT "UserDepositEventClaim_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "DepositEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointLedgerEntry" ADD CONSTRAINT "PointLedgerEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
