-- AlterTable
ALTER TABLE "User" ADD COLUMN "registrationResolvedAt" TIMESTAMP(3);

-- 기존 승인/거절 건은 마지막 수정 시각으로 보정 (내역 정렬용)
UPDATE "User"
SET "registrationResolvedAt" = "updatedAt"
WHERE "registrationStatus" IN ('APPROVED', 'REJECTED');

-- CreateIndex
CREATE INDEX "User_platformId_registrationResolvedAt_idx" ON "User"("platformId", "registrationResolvedAt");
