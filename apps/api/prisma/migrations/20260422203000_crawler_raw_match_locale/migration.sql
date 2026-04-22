-- aiscore 등 이중 로케일 raw 저장 + ko/en 페어링용 self-FK

ALTER TABLE "CrawlerRawMatch" ADD COLUMN "sourceLocale" TEXT NOT NULL DEFAULT 'ko';
ALTER TABLE "CrawlerRawMatch" ADD COLUMN "pairedRawMatchId" TEXT;

DROP INDEX IF EXISTS "CrawlerRawMatch_sourceSite_sourceSportSlug_sourceMatchId_key";

CREATE UNIQUE INDEX "CrawlerRawMatch_sourceSite_sourceSportSlug_sourceMatchId_sourceLocale_key"
  ON "CrawlerRawMatch"("sourceSite", "sourceSportSlug", "sourceMatchId", "sourceLocale");

CREATE INDEX IF NOT EXISTS "CrawlerRawMatch_pairedRawMatchId_idx" ON "CrawlerRawMatch"("pairedRawMatchId");

DO $$
BEGIN
  ALTER TABLE "CrawlerRawMatch"
    ADD CONSTRAINT "CrawlerRawMatch_pairedRawMatchId_fkey"
    FOREIGN KEY ("pairedRawMatchId") REFERENCES "CrawlerRawMatch"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
