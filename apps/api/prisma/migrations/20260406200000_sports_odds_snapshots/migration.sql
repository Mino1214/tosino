-- CreateTable
CREATE TABLE "SportsOddsSnapshot" (
    "id" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "sourceFeedId" TEXT NOT NULL,
    "sportLabel" TEXT NOT NULL,
    "market" TEXT,
    "payloadJson" JSONB NOT NULL DEFAULT '{}',
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SportsOddsSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SportsOddsSnapshot_platformId_updatedAt_idx" ON "SportsOddsSnapshot"("platformId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SportsOddsSnapshot_platformId_sourceFeedId_key" ON "SportsOddsSnapshot"("platformId", "sourceFeedId");

-- AddForeignKey
ALTER TABLE "SportsOddsSnapshot" ADD CONSTRAINT "SportsOddsSnapshot_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "Platform"("id") ON DELETE CASCADE ON UPDATE CASCADE;
