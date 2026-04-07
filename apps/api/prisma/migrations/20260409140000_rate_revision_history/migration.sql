-- CreateTable
CREATE TABLE "RollingRateRevision" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rollingEnabled" BOOLEAN NOT NULL,
    "rollingSportsDomesticPct" DECIMAL(5,2),
    "rollingSportsOverseasPct" DECIMAL(5,2),
    "rollingCasinoPct" DECIMAL(5,2),
    "rollingSlotPct" DECIMAL(5,2),
    "rollingMinigamePct" DECIMAL(5,2),
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RollingRateRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentCommissionRevision" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "agentPlatformSharePct" DECIMAL(5,2),
    "agentSplitFromParentPct" DECIMAL(5,2),
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentCommissionRevision_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RollingRateRevision_userId_effectiveFrom_idx" ON "RollingRateRevision"("userId", "effectiveFrom");
CREATE INDEX "AgentCommissionRevision_userId_effectiveFrom_idx" ON "AgentCommissionRevision"("userId", "effectiveFrom");

ALTER TABLE "RollingRateRevision" ADD CONSTRAINT "RollingRateRevision_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgentCommissionRevision" ADD CONSTRAINT "AgentCommissionRevision_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 기존 데이터 기준선: 가입 시각부터 위 스냅샷이 유효했던 것으로 간주
INSERT INTO "RollingRateRevision" (
    "id", "userId", "rollingEnabled",
    "rollingSportsDomesticPct", "rollingSportsOverseasPct",
    "rollingCasinoPct", "rollingSlotPct", "rollingMinigamePct",
    "effectiveFrom", "createdAt"
)
SELECT
    gen_random_uuid()::text,
    "id",
    "rollingEnabled",
    "rollingSportsDomesticPct",
    "rollingSportsOverseasPct",
    "rollingCasinoPct",
    "rollingSlotPct",
    "rollingMinigamePct",
    "createdAt",
    CURRENT_TIMESTAMP
FROM "User"
WHERE "role" = 'USER';

INSERT INTO "AgentCommissionRevision" (
    "id", "userId",
    "agentPlatformSharePct", "agentSplitFromParentPct",
    "effectiveFrom", "createdAt"
)
SELECT
    gen_random_uuid()::text,
    "id",
    "agentPlatformSharePct",
    "agentSplitFromParentPct",
    "createdAt",
    CURRENT_TIMESTAMP
FROM "User"
WHERE "role" = 'MASTER_AGENT';
