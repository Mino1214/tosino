-- Operational Phase 2:
--  1) User 블랙리스트 필드 추가
--  2) Platform 게임별 롤링 턴오버 배수 5종 추가
--  3) SemiVirtualBundle / SemiVirtualAccount 번들 테이블 + 기존 데이터 백필
--  4) PlatformPolicyHistory 변경 이력 테이블

-- 1) User blacklist columns -------------------------------------------------
ALTER TABLE "User"
  ADD COLUMN "isBlocked"       BOOLEAN   NOT NULL DEFAULT false,
  ADD COLUMN "blockedReason"   TEXT,
  ADD COLUMN "blockedAt"       TIMESTAMP(3),
  ADD COLUMN "blockedByUserId" TEXT;

CREATE INDEX "User_platformId_isBlocked_idx" ON "User" ("platformId", "isBlocked");
CREATE INDEX "User_phone_idx"               ON "User" ("phone");
CREATE INDEX "User_bankAccountNumber_idx"   ON "User" ("bankAccountNumber");

-- 2) Platform per-game rolling turnover multipliers ------------------------
ALTER TABLE "Platform"
  ADD COLUMN "rollingTurnoverSports"   DECIMAL(8, 4),
  ADD COLUMN "rollingTurnoverCasino"   DECIMAL(8, 4),
  ADD COLUMN "rollingTurnoverSlot"     DECIMAL(8, 4),
  ADD COLUMN "rollingTurnoverMinigame" DECIMAL(8, 4),
  ADD COLUMN "rollingTurnoverArcade"   DECIMAL(8, 4);

-- 3) SemiVirtualBundle / SemiVirtualAccount --------------------------------
CREATE TABLE "SemiVirtualBundle" (
  "id"              TEXT         NOT NULL,
  "platformId"      TEXT         NOT NULL,
  "label"           TEXT,
  "status"          TEXT         NOT NULL DEFAULT 'CURRENT',
  "createdByUserId" TEXT,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "retiredAt"       TIMESTAMP(3),
  "retiredReason"   TEXT,
  CONSTRAINT "SemiVirtualBundle_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SemiVirtualBundle_platformId_status_createdAt_idx"
  ON "SemiVirtualBundle" ("platformId", "status", "createdAt");

ALTER TABLE "SemiVirtualBundle"
  ADD CONSTRAINT "SemiVirtualBundle_platformId_fkey"
  FOREIGN KEY ("platformId") REFERENCES "Platform"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "SemiVirtualAccount" (
  "id"            TEXT         NOT NULL,
  "bundleId"      TEXT         NOT NULL,
  "platformId"    TEXT         NOT NULL,
  "bankName"      TEXT         NOT NULL,
  "accountNumber" TEXT         NOT NULL,
  "accountHolder" TEXT         NOT NULL,
  "memo"          TEXT,
  "sortOrder"     INTEGER      NOT NULL DEFAULT 0,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SemiVirtualAccount_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SemiVirtualAccount_bundleId_idx"
  ON "SemiVirtualAccount" ("bundleId");
CREATE INDEX "SemiVirtualAccount_platformId_idx"
  ON "SemiVirtualAccount" ("platformId");
CREATE INDEX "SemiVirtualAccount_platformId_accountNumber_idx"
  ON "SemiVirtualAccount" ("platformId", "accountNumber");

ALTER TABLE "SemiVirtualAccount"
  ADD CONSTRAINT "SemiVirtualAccount_bundleId_fkey"
  FOREIGN KEY ("bundleId") REFERENCES "SemiVirtualBundle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SemiVirtualAccount"
  ADD CONSTRAINT "SemiVirtualAccount_platformId_fkey"
  FOREIGN KEY ("platformId") REFERENCES "Platform"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 3-1) 기존 Platform.semiVirtual* 값을 새 번들/계좌로 백필한다.
-- 은행명·계좌번호·예금주 중 하나라도 존재하면 CURRENT 번들 1개 + 계좌 1개 생성.
INSERT INTO "SemiVirtualBundle" ("id", "platformId", "label", "status", "createdAt")
SELECT
  gen_random_uuid()::text || '_svb',
  p."id",
  '최초 등록',
  'CURRENT',
  COALESCE(p."updatedAt", p."createdAt")
FROM "Platform" p
WHERE
  (COALESCE(NULLIF(TRIM(p."semiVirtualBankName"), ''), NULL) IS NOT NULL)
  OR (COALESCE(NULLIF(TRIM(p."semiVirtualAccountNumber"), ''), NULL) IS NOT NULL)
  OR (COALESCE(NULLIF(TRIM(p."semiVirtualAccountHolder"), ''), NULL) IS NOT NULL);

INSERT INTO "SemiVirtualAccount"
  ("id", "bundleId", "platformId", "bankName", "accountNumber", "accountHolder", "sortOrder", "createdAt")
SELECT
  gen_random_uuid()::text || '_sva',
  b."id",
  p."id",
  COALESCE(NULLIF(TRIM(p."semiVirtualBankName"), ''), '미입력'),
  COALESCE(NULLIF(TRIM(p."semiVirtualAccountNumber"), ''), '미입력'),
  COALESCE(NULLIF(TRIM(p."semiVirtualAccountHolder"), ''), '미입력'),
  0,
  b."createdAt"
FROM "SemiVirtualBundle" b
JOIN "Platform" p ON p."id" = b."platformId"
WHERE b."status" = 'CURRENT';

-- 4) PlatformPolicyHistory ------------------------------------------------
CREATE TABLE "PlatformPolicyHistory" (
  "id"               TEXT         NOT NULL,
  "platformId"       TEXT         NOT NULL,
  "policyType"       TEXT         NOT NULL,
  "beforeJson"       JSONB        NOT NULL DEFAULT '{}',
  "afterJson"        JSONB        NOT NULL DEFAULT '{}',
  "changedByUserId"  TEXT,
  "changedByLoginId" TEXT,
  "note"             TEXT,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlatformPolicyHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PlatformPolicyHistory_platformId_policyType_createdAt_idx"
  ON "PlatformPolicyHistory" ("platformId", "policyType", "createdAt");

ALTER TABLE "PlatformPolicyHistory"
  ADD CONSTRAINT "PlatformPolicyHistory_platformId_fkey"
  FOREIGN KEY ("platformId") REFERENCES "Platform"("id") ON DELETE CASCADE ON UPDATE CASCADE;
