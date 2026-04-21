-- CreateTable
CREATE TABLE "OddsApiCatalogSnapshot" (
    "id" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "filtersJson" JSONB NOT NULL DEFAULT '{}',
    "totalItems" INTEGER NOT NULL DEFAULT 0,
    "payloadJson" JSONB NOT NULL DEFAULT '{}',
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OddsApiCatalogSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OddsApiProcessedSnapshot" (
    "id" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "catalogSnapshotId" TEXT,
    "snapshotType" TEXT NOT NULL,
    "filtersJson" JSONB NOT NULL DEFAULT '{}',
    "totalMatches" INTEGER NOT NULL DEFAULT 0,
    "payloadJson" JSONB NOT NULL DEFAULT '{}',
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OddsApiProcessedSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OddsApiCatalogSnapshot_platformId_fetchedAt_idx" ON "OddsApiCatalogSnapshot"("platformId", "fetchedAt");

-- CreateIndex
CREATE INDEX "OddsApiProcessedSnapshot_platformId_snapshotType_fetchedAt_idx" ON "OddsApiProcessedSnapshot"("platformId", "snapshotType", "fetchedAt");

-- CreateIndex
CREATE INDEX "OddsApiProcessedSnapshot_catalogSnapshotId_idx" ON "OddsApiProcessedSnapshot"("catalogSnapshotId");

-- AddForeignKey
ALTER TABLE "OddsApiCatalogSnapshot" ADD CONSTRAINT "OddsApiCatalogSnapshot_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "Platform"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OddsApiProcessedSnapshot" ADD CONSTRAINT "OddsApiProcessedSnapshot_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "Platform"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OddsApiProcessedSnapshot" ADD CONSTRAINT "OddsApiProcessedSnapshot_catalogSnapshotId_fkey" FOREIGN KEY ("catalogSnapshotId") REFERENCES "OddsApiCatalogSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
