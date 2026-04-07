-- 플랫폼별 회원 분리: 이메일·추천코드 유일성을 (platformId 스코프)로 변경
-- SUPER_ADMIN 등 platformId IS NULL 은 이메일 전역 유일(한 행만)

DROP INDEX IF EXISTS "User_email_key";
DROP INDEX IF EXISTS "User_referralCode_key";

CREATE UNIQUE INDEX "User_email_platform_unique"
  ON "User" ("platformId", "email")
  WHERE "platformId" IS NOT NULL;

CREATE UNIQUE INDEX "User_email_global_unique"
  ON "User" ("email")
  WHERE "platformId" IS NULL;

CREATE UNIQUE INDEX "User_referral_platform_unique"
  ON "User" ("platformId", "referralCode")
  WHERE "referralCode" IS NOT NULL;

CREATE INDEX "User_platformId_email_idx" ON "User"("platformId", "email");
