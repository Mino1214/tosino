-- ==========================================================================
-- 서버 전용: 이번 배포 직후 1회 실행.
-- 남기는 것:
--   • CrawlerLeagueMapping           (리그 이름/슬러그 매핑은 운영이 누적해온 자산)
--   • OddsApiLeagueAlias             (리그 한글명 별칭)
-- 비우는 것:
--   • CrawlerMatchMapping            (경기 매칭 행 — raw 삭제 시 cascade 되지만 명시)
--   • CrawlerRawMatch                (크롤러 원본)
--   • CrawlerTeamMapping             (팀 매핑 — 이번 사이클부터 새로 쌓음)
--   • OddsApiTeamAlias               (팀 한글명 별칭)
--   • OddsApiCatalogSnapshot         (odds-api 캐시)
--   • OddsApiProcessedSnapshot       (플랫폼별 경기 스냅샷)
--
-- 모델 이름은 Prisma(PascalCase) → Postgres 쿼팅 필수.
-- TRUNCATE CASCADE 로 FK 이슈 회피.
-- ==========================================================================

BEGIN;

TRUNCATE TABLE
  "CrawlerMatchMapping",
  "CrawlerRawMatch",
  "CrawlerTeamMapping",
  "OddsApiTeamAlias",
  "OddsApiCatalogSnapshot",
  "OddsApiProcessedSnapshot"
RESTART IDENTITY CASCADE;

-- 리그 이름 매핑은 유지하되, 매치 카운트는 새 사이클부터 다시 셀 수 있도록 0 으로.
UPDATE "CrawlerLeagueMapping"
   SET "matchCount" = 0;

COMMIT;

-- 확인용:
--   SELECT COUNT(*) FROM "CrawlerLeagueMapping";    -- 유지
--   SELECT COUNT(*) FROM "CrawlerRawMatch";         -- 0
--   SELECT COUNT(*) FROM "CrawlerMatchMapping";     -- 0
