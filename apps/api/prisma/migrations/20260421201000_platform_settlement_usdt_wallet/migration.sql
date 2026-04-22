-- schema.prisma 에만 있었고 과거 마이그레이션에 누락됨 → Prisma Client·seed 가 P2022
ALTER TABLE "Platform"
  ADD COLUMN IF NOT EXISTS "settlementUsdtWallet" TEXT;
