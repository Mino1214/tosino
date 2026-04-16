CREATE TABLE "CompSettlement" (
  "id" TEXT NOT NULL,
  "platformId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "periodFrom" TIMESTAMP(3) NOT NULL,
  "periodTo" TIMESTAMP(3) NOT NULL,
  "baseAmount" DECIMAL(18,2) NOT NULL,
  "ratePct" DECIMAL(7,4) NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "settlementCycle" VARCHAR(32) NOT NULL,
  "settlementOffsetDays" INTEGER,
  "note" TEXT,
  "settledByUserId" TEXT,
  "settledByLoginId" TEXT,
  "ledgerReference" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CompSettlement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CompSettlement_platformId_userId_periodFrom_periodTo_key"
ON "CompSettlement"("platformId", "userId", "periodFrom", "periodTo");

CREATE INDEX "CompSettlement_platformId_createdAt_idx"
ON "CompSettlement"("platformId", "createdAt");

CREATE INDEX "CompSettlement_platformId_periodFrom_periodTo_idx"
ON "CompSettlement"("platformId", "periodFrom", "periodTo");

CREATE INDEX "CompSettlement_userId_createdAt_idx"
ON "CompSettlement"("userId", "createdAt");

ALTER TABLE "CompSettlement"
ADD CONSTRAINT "CompSettlement_platformId_fkey"
FOREIGN KEY ("platformId") REFERENCES "Platform"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CompSettlement"
ADD CONSTRAINT "CompSettlement_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
