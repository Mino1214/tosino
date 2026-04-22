-- Reserve Balance (virtual 알 restore) — Phase 1
-- creditBalance 는 init 에 없었던 DB 가 있어 IF NOT EXISTS 로 보강한다.

ALTER TABLE "Platform"
  ADD COLUMN IF NOT EXISTS "creditBalance" DECIMAL(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "reserveInitialAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "reserveRestoreEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "reserveRatePct" DECIMAL(8,4);

-- 기존 창업(이미 승인된 크레딧 총합) → reserveInitialAmount 초기값 채우기.
-- PlatformCreditRequest 가 없는 DB(또는 롤백 직후)에서도 마이그레이션이 통과하도록 가드.
DO $reserve_init$
BEGIN
  IF to_regclass('public."PlatformCreditRequest"') IS NOT NULL THEN
    UPDATE "Platform" p
    SET "reserveInitialAmount" = COALESCE(sub.total, 0)
    FROM (
      SELECT "platformId" AS pid,
             COALESCE(SUM("approvedAmountKrw"), 0) AS total
      FROM "PlatformCreditRequest"
      WHERE "status" = 'APPROVED'
      GROUP BY "platformId"
    ) sub
    WHERE p.id = sub.pid
      AND p."reserveInitialAmount" = 0;
  END IF;
END $reserve_init$;

-- creditBalance 가 reserveInitialAmount 보다 큰 극단적 케이스(수동 보정 등)에는 initial 을 끌어올려 invariant 유지.
DO $credit_cap$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class c ON a.attrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND c.relname = 'Platform'
      AND a.attname = 'creditBalance'
      AND a.attnum > 0
      AND NOT a.attisdropped
  )
  AND EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class c ON a.attrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND c.relname = 'Platform'
      AND a.attname = 'reserveInitialAmount'
      AND a.attnum > 0
      AND NOT a.attisdropped
  ) THEN
    UPDATE "Platform"
    SET "reserveInitialAmount" = "creditBalance"
    WHERE "creditBalance" > "reserveInitialAmount";
  END IF;
END $credit_cap$;

CREATE TABLE IF NOT EXISTS "PlatformReserveLog" (
  "id"              TEXT PRIMARY KEY,
  "platformId"      TEXT NOT NULL REFERENCES "Platform"("id") ON DELETE CASCADE,
  "type"            VARCHAR(16) NOT NULL,
  "baseAmount"      DECIMAL(18,2) NOT NULL,
  "rate"            DECIMAL(8,4)  NOT NULL,
  "computedAmount"  DECIMAL(18,2) NOT NULL,
  "changedAmount"   DECIMAL(18,2) NOT NULL,
  "balanceBefore"   DECIMAL(18,2) NOT NULL,
  "balanceAfter"    DECIMAL(18,2) NOT NULL,
  "initialAmount"   DECIMAL(18,2) NOT NULL,
  "relatedUserId"   TEXT,
  "relatedGameId"   TEXT,
  "relatedBetId"    TEXT,
  "eventKey"        VARCHAR(128),
  "note"            TEXT,
  "createdByUserId" TEXT,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "PlatformReserveLog_eventKey_key"
  ON "PlatformReserveLog" ("eventKey");
CREATE INDEX IF NOT EXISTS "PlatformReserveLog_platformId_createdAt_idx"
  ON "PlatformReserveLog" ("platformId", "createdAt");
CREATE INDEX IF NOT EXISTS "PlatformReserveLog_platformId_type_createdAt_idx"
  ON "PlatformReserveLog" ("platformId", "type", "createdAt");
CREATE INDEX IF NOT EXISTS "PlatformReserveLog_relatedBetId_idx"
  ON "PlatformReserveLog" ("relatedBetId");
