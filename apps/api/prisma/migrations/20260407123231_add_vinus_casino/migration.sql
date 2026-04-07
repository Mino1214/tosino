-- CreateTable
CREATE TABLE "VinusSessionToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "token" VARCHAR(50) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VinusSessionToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CasinoVinusTx" (
    "id" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "externalId" VARCHAR(64) NOT NULL,
    "kind" VARCHAR(32) NOT NULL,
    "gameId" VARCHAR(100),
    "roundId" VARCHAR(64),
    "stake" DECIMAL(18,2),
    "payout" DECIMAL(18,2),
    "cancelledAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CasinoVinusTx_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VinusSessionToken_token_key" ON "VinusSessionToken"("token");

-- CreateIndex
CREATE INDEX "VinusSessionToken_userId_idx" ON "VinusSessionToken"("userId");

-- CreateIndex
CREATE INDEX "VinusSessionToken_platformId_idx" ON "VinusSessionToken"("platformId");

-- CreateIndex
CREATE UNIQUE INDEX "CasinoVinusTx_externalId_key" ON "CasinoVinusTx"("externalId");

-- CreateIndex
CREATE INDEX "CasinoVinusTx_platformId_userId_idx" ON "CasinoVinusTx"("platformId", "userId");

-- CreateIndex
CREATE INDEX "CasinoVinusTx_userId_gameId_roundId_idx" ON "CasinoVinusTx"("userId", "gameId", "roundId");

-- AddForeignKey
ALTER TABLE "VinusSessionToken" ADD CONSTRAINT "VinusSessionToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VinusSessionToken" ADD CONSTRAINT "VinusSessionToken_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "Platform"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CasinoVinusTx" ADD CONSTRAINT "CasinoVinusTx_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "Platform"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CasinoVinusTx" ADD CONSTRAINT "CasinoVinusTx_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
