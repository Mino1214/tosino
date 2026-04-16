CREATE TABLE "SolutionBillingSettlement" (
  "id" TEXT NOT NULL,
  "platformId" TEXT NOT NULL,
  "periodFrom" TIMESTAMP(3) NOT NULL,
  "periodTo" TIMESTAMP(3) NOT NULL,
  "casinoBaseGgr" DECIMAL(18,2) NOT NULL,
  "sportsBaseGgr" DECIMAL(18,2) NOT NULL,
  "upstreamCasinoPct" DECIMAL(7,4) NOT NULL,
  "upstreamSportsPct" DECIMAL(7,4) NOT NULL,
  "platformCasinoPct" DECIMAL(7,4) NOT NULL,
  "platformSportsPct" DECIMAL(7,4) NOT NULL,
  "upstreamCost" DECIMAL(18,2) NOT NULL,
  "platformCharge" DECIMAL(18,2) NOT NULL,
  "solutionMargin" DECIMAL(18,2) NOT NULL,
  "note" TEXT,
  "settledByUserId" TEXT,
  "settledByLoginId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SolutionBillingSettlement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SolutionBillingSettlement_platformId_periodFrom_periodTo_key"
ON "SolutionBillingSettlement"("platformId", "periodFrom", "periodTo");

CREATE INDEX "SolutionBillingSettlement_platformId_createdAt_idx"
ON "SolutionBillingSettlement"("platformId", "createdAt");

CREATE INDEX "SolutionBillingSettlement_platformId_periodFrom_periodTo_idx"
ON "SolutionBillingSettlement"("platformId", "periodFrom", "periodTo");

ALTER TABLE "SolutionBillingSettlement"
ADD CONSTRAINT "SolutionBillingSettlement_platformId_fkey"
FOREIGN KEY ("platformId") REFERENCES "Platform"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
