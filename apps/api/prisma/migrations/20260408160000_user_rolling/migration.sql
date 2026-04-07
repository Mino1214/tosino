-- AlterTable
ALTER TABLE "User" ADD COLUMN "rollingEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "rollingSportsPct" DECIMAL(5,2);
ALTER TABLE "User" ADD COLUMN "rollingCasinoPct" DECIMAL(5,2);
ALTER TABLE "User" ADD COLUMN "rollingSlotPct" DECIMAL(5,2);
ALTER TABLE "User" ADD COLUMN "rollingMinigamePct" DECIMAL(5,2);
