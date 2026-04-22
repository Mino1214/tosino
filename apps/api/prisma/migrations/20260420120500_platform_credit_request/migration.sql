-- HQ 알값 충전 요청 테이블 (스키마에는 있었으나 마이그레이션 누락 → 20130000 UPDATE 가 실패하던 케이스 보강)
-- IF NOT EXISTS: 수동 생성 DB·재시도 시에도 deploy 가 막히지 않게 한다.

CREATE TABLE IF NOT EXISTS "PlatformCreditRequest" (
    "id" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "requestedAmountKrw" DECIMAL(18,2) NOT NULL,
    "requesterNote" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "approvedAmountKrw" DECIMAL(18,2),
    "adminNote" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolvedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlatformCreditRequest_pkey" PRIMARY KEY ("id")
);

DO $fk$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PlatformCreditRequest_platformId_fkey'
  ) THEN
    ALTER TABLE "PlatformCreditRequest"
      ADD CONSTRAINT "PlatformCreditRequest_platformId_fkey"
      FOREIGN KEY ("platformId") REFERENCES "Platform"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $fk$;

CREATE INDEX IF NOT EXISTS "PlatformCreditRequest_platformId_status_idx"
  ON "PlatformCreditRequest" ("platformId", "status");
CREATE INDEX IF NOT EXISTS "PlatformCreditRequest_status_createdAt_idx"
  ON "PlatformCreditRequest" ("status", "createdAt");
CREATE INDEX IF NOT EXISTS "PlatformCreditRequest_createdAt_idx"
  ON "PlatformCreditRequest" ("createdAt");
