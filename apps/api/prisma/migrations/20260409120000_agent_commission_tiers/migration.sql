-- 총판 다단계 요율: 플랫폼 부여(최상위) + 상위 대비 분배율(하위)
ALTER TABLE "User" ADD COLUMN "agentPlatformSharePct" DECIMAL(5,2);
ALTER TABLE "User" ADD COLUMN "agentSplitFromParentPct" DECIMAL(5,2);
