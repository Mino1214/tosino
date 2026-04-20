-- CreateEnum
CREATE TYPE "IpAccessListKind" AS ENUM ('BLACKLIST', 'WHITELIST');

-- CreateTable
CREATE TABLE "IpAccessRule" (
    "id" TEXT NOT NULL,
    "isGlobal" BOOLEAN NOT NULL DEFAULT false,
    "platformId" TEXT,
    "kind" "IpAccessListKind" NOT NULL,
    "cidr" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IpAccessRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IpAccessRule_platformId_idx" ON "IpAccessRule"("platformId");

-- CreateIndex
CREATE INDEX "IpAccessRule_isGlobal_idx" ON "IpAccessRule"("isGlobal");

-- AddForeignKey
ALTER TABLE "IpAccessRule" ADD CONSTRAINT "IpAccessRule_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "Platform"("id") ON DELETE CASCADE ON UPDATE CASCADE;
