-- CreateEnum
CREATE TYPE "AgentInquiryStatus" AS ENUM ('OPEN', 'ANSWERED', 'CLOSED');

-- CreateTable
CREATE TABLE "AgentInquiry" (
    "id" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "agentUserId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "AgentInquiryStatus" NOT NULL DEFAULT 'OPEN',
    "adminReply" TEXT,
    "repliedAt" TIMESTAMP(3),
    "repliedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentInquiry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgentInquiry_platformId_status_idx" ON "AgentInquiry"("platformId", "status");
CREATE INDEX "AgentInquiry_platformId_createdAt_idx" ON "AgentInquiry"("platformId", "createdAt");
CREATE INDEX "AgentInquiry_agentUserId_createdAt_idx" ON "AgentInquiry"("agentUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "AgentInquiry" ADD CONSTRAINT "AgentInquiry_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "Platform"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgentInquiry" ADD CONSTRAINT "AgentInquiry_agentUserId_fkey" FOREIGN KEY ("agentUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgentInquiry" ADD CONSTRAINT "AgentInquiry_repliedByUserId_fkey" FOREIGN KEY ("repliedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
