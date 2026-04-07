-- AlterTable: 스포츠 롤링을 국내/해외 분리
ALTER TABLE "User" ADD COLUMN "rollingSportsDomesticPct" DECIMAL(5,2);
ALTER TABLE "User" ADD COLUMN "rollingSportsOverseasPct" DECIMAL(5,2);
UPDATE "User"
SET
  "rollingSportsDomesticPct" = "rollingSportsPct",
  "rollingSportsOverseasPct" = "rollingSportsPct"
WHERE "rollingSportsPct" IS NOT NULL;
ALTER TABLE "User" DROP COLUMN "rollingSportsPct";
