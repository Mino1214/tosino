-- Crawler HQ 매칭·alias·화이트리스트 (schema 에 있었으나 이전 마이그레이션에 누락됨)

CREATE TABLE "OddsApiLeagueAlias" (
    "id" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "koreanName" TEXT,
    "logoUrl" TEXT,
    "country" TEXT,
    "displayPriority" INTEGER NOT NULL DEFAULT 100,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OddsApiLeagueAlias_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OddsApiTeamAlias" (
    "id" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "koreanName" TEXT,
    "logoUrl" TEXT,
    "country" TEXT,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OddsApiTeamAlias_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CrawlerLeagueMapping" (
    "id" TEXT NOT NULL,
    "sourceSite" TEXT NOT NULL,
    "sourceSportSlug" TEXT NOT NULL,
    "sourceLeagueSlug" TEXT NOT NULL,
    "sourceLeagueLabel" TEXT,
    "sourceLeagueLogo" TEXT,
    "sourceCountryLabel" TEXT,
    "sourceCountryFlag" TEXT,
    "internalSportSlug" TEXT,
    "providerName" TEXT,
    "providerSportSlug" TEXT,
    "providerLeagueSlug" TEXT,
    "providerLeagueLabel" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "note" TEXT,
    "matchCount" INTEGER NOT NULL DEFAULT 0,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "confirmedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrawlerLeagueMapping_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CrawlerTeamMapping" (
    "id" TEXT NOT NULL,
    "sourceSite" TEXT NOT NULL,
    "sourceSportSlug" TEXT NOT NULL,
    "sourceTeamName" TEXT NOT NULL,
    "sourceTeamSlug" TEXT,
    "sourceTeamHref" TEXT,
    "sourceTeamLogo" TEXT,
    "sourceLeagueSlug" TEXT,
    "sourceLeagueLabel" TEXT,
    "sourceCountryLabel" TEXT,
    "internalSportSlug" TEXT,
    "providerName" TEXT,
    "providerSportSlug" TEXT,
    "providerTeamExternalId" TEXT,
    "providerTeamName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "note" TEXT,
    "matchCount" INTEGER NOT NULL DEFAULT 0,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "confirmedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrawlerTeamMapping_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CrawlerRawMatch" (
    "id" TEXT NOT NULL,
    "sourceSite" TEXT NOT NULL,
    "sourceSportSlug" TEXT NOT NULL,
    "sourceMatchId" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "sourceMatchHref" TEXT,
    "internalSportSlug" TEXT,
    "providerName" TEXT,
    "providerSportSlug" TEXT,
    "rawHomeName" TEXT,
    "rawHomeSlug" TEXT,
    "rawAwayName" TEXT,
    "rawAwaySlug" TEXT,
    "rawLeagueLabel" TEXT,
    "rawLeagueSlug" TEXT,
    "rawCountryLabel" TEXT,
    "rawKickoffText" TEXT,
    "rawKickoffUtc" TIMESTAMP(3),
    "rawScoreText" TEXT,
    "rawStatusText" TEXT,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrawlerRawMatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CrawlerMatchMapping" (
    "id" TEXT NOT NULL,
    "rawMatchId" TEXT NOT NULL,
    "sourceSite" TEXT NOT NULL,
    "sourceSportSlug" TEXT NOT NULL,
    "internalSportSlug" TEXT,
    "rawLeagueSlug" TEXT,
    "rawHomeName" TEXT,
    "rawAwayName" TEXT,
    "rawKickoffUtc" TIMESTAMP(3),
    "leagueMappingId" TEXT,
    "homeTeamMappingId" TEXT,
    "awayTeamMappingId" TEXT,
    "providerName" TEXT NOT NULL DEFAULT 'odds-api.io',
    "providerSportSlug" TEXT,
    "providerLeagueSlug" TEXT,
    "providerExternalEventId" TEXT,
    "providerHomeExternalId" TEXT,
    "providerAwayExternalId" TEXT,
    "providerHomeName" TEXT,
    "providerAwayName" TEXT,
    "providerKickoffUtc" TIMESTAMP(3),
    "kickoffDeltaSeconds" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "matchedVia" TEXT,
    "matchScore" DOUBLE PRECISION,
    "candidatesJson" JSONB,
    "reason" TEXT,
    "note" TEXT,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "matchedAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "confirmedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrawlerMatchMapping_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OddsApiDisplayWhitelist" (
    "id" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "externalEventId" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'score-crawler',
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "OddsApiDisplayWhitelist_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OddsApiLeagueAlias_sport_idx" ON "OddsApiLeagueAlias"("sport");

CREATE INDEX "OddsApiLeagueAlias_isHidden_idx" ON "OddsApiLeagueAlias"("isHidden");

CREATE UNIQUE INDEX "OddsApiLeagueAlias_sport_slug_key" ON "OddsApiLeagueAlias"("sport", "slug");

CREATE INDEX "OddsApiTeamAlias_sport_idx" ON "OddsApiTeamAlias"("sport");

CREATE INDEX "OddsApiTeamAlias_originalName_idx" ON "OddsApiTeamAlias"("originalName");

CREATE UNIQUE INDEX "OddsApiTeamAlias_sport_externalId_key" ON "OddsApiTeamAlias"("sport", "externalId");

CREATE INDEX "CrawlerLeagueMapping_sourceSite_status_idx" ON "CrawlerLeagueMapping"("sourceSite", "status");

CREATE INDEX "CrawlerLeagueMapping_providerName_providerLeagueSlug_idx" ON "CrawlerLeagueMapping"("providerName", "providerLeagueSlug");

CREATE INDEX "CrawlerLeagueMapping_internalSportSlug_idx" ON "CrawlerLeagueMapping"("internalSportSlug");

CREATE UNIQUE INDEX "CrawlerLeagueMapping_sourceSite_sourceLeagueSlug_key" ON "CrawlerLeagueMapping"("sourceSite", "sourceLeagueSlug");

CREATE INDEX "CrawlerTeamMapping_sourceSite_status_idx" ON "CrawlerTeamMapping"("sourceSite", "status");

CREATE INDEX "CrawlerTeamMapping_providerName_providerTeamExternalId_idx" ON "CrawlerTeamMapping"("providerName", "providerTeamExternalId");

CREATE INDEX "CrawlerTeamMapping_internalSportSlug_idx" ON "CrawlerTeamMapping"("internalSportSlug");

CREATE UNIQUE INDEX "CrawlerTeamMapping_sourceSite_sourceSportSlug_sourceTeamNam_key" ON "CrawlerTeamMapping"("sourceSite", "sourceSportSlug", "sourceTeamName");

CREATE INDEX "CrawlerRawMatch_sourceSite_rawKickoffUtc_idx" ON "CrawlerRawMatch"("sourceSite", "rawKickoffUtc");

CREATE INDEX "CrawlerRawMatch_internalSportSlug_rawKickoffUtc_idx" ON "CrawlerRawMatch"("internalSportSlug", "rawKickoffUtc");

CREATE INDEX "CrawlerRawMatch_rawLeagueSlug_idx" ON "CrawlerRawMatch"("rawLeagueSlug");

CREATE UNIQUE INDEX "CrawlerRawMatch_sourceSite_sourceSportSlug_sourceMatchId_key" ON "CrawlerRawMatch"("sourceSite", "sourceSportSlug", "sourceMatchId");

CREATE UNIQUE INDEX "CrawlerMatchMapping_rawMatchId_key" ON "CrawlerMatchMapping"("rawMatchId");

CREATE INDEX "CrawlerMatchMapping_status_updatedAt_idx" ON "CrawlerMatchMapping"("status", "updatedAt");

CREATE INDEX "CrawlerMatchMapping_providerSportSlug_providerExternalEvent_idx" ON "CrawlerMatchMapping"("providerSportSlug", "providerExternalEventId");

CREATE INDEX "CrawlerMatchMapping_rawKickoffUtc_idx" ON "CrawlerMatchMapping"("rawKickoffUtc");

CREATE INDEX "OddsApiDisplayWhitelist_expiresAt_idx" ON "OddsApiDisplayWhitelist"("expiresAt");

CREATE UNIQUE INDEX "OddsApiDisplayWhitelist_sport_externalEventId_key" ON "OddsApiDisplayWhitelist"("sport", "externalEventId");

ALTER TABLE "CrawlerMatchMapping" ADD CONSTRAINT "CrawlerMatchMapping_rawMatchId_fkey" FOREIGN KEY ("rawMatchId") REFERENCES "CrawlerRawMatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
