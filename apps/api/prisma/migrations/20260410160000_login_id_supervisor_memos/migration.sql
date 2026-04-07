-- 로그인 식별자: loginId (플랫폼 스코프 유일). email 은 선택 연락처.
-- 마스터(플랫폼) 전용 메모 · 직속 상위 총판 전용 메모

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "loginId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "masterPrivateMemo" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "uplinePrivateMemo" TEXT;

UPDATE "User" SET "loginId" = lower(trim("email")) WHERE "loginId" IS NULL;

ALTER TABLE "User" ALTER COLUMN "loginId" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;

DROP INDEX IF EXISTS "User_email_platform_unique";
DROP INDEX IF EXISTS "User_email_global_unique";
DROP INDEX IF EXISTS "User_platformId_email_idx";
DROP INDEX IF EXISTS "User_email_key";

CREATE UNIQUE INDEX "User_loginId_platform_unique"
  ON "User" ("platformId", "loginId")
  WHERE "platformId" IS NOT NULL;

CREATE UNIQUE INDEX "User_loginId_global_unique"
  ON "User" ("loginId")
  WHERE "platformId" IS NULL;

CREATE INDEX "User_platformId_loginId_idx" ON "User"("platformId", "loginId");
CREATE INDEX "User_loginId_idx" ON "User"("loginId");
