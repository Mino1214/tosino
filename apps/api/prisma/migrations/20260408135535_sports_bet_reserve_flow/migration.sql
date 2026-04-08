-- CreateTable
CREATE TABLE "SportsBetReservation" (
    "id" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reserveId" VARCHAR(64) NOT NULL,
    "reservedAmount" DECIMAL(18,2) NOT NULL,
    "consumedAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "status" VARCHAR(24) NOT NULL DEFAULT 'PENDING',
    "orderIdempotencyKey" VARCHAR(64),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SportsBetReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SportsBetActual" (
    "id" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "reqId" VARCHAR(64) NOT NULL,
    "externalId" VARCHAR(64) NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SportsBetActual_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SportsBetReservation_orderIdempotencyKey_key" ON "SportsBetReservation"("orderIdempotencyKey");

-- CreateIndex
CREATE INDEX "SportsBetReservation_userId_reserveId_idx" ON "SportsBetReservation"("userId", "reserveId");

-- CreateIndex
CREATE UNIQUE INDEX "SportsBetReservation_platformId_reserveId_key" ON "SportsBetReservation"("platformId", "reserveId");

-- CreateIndex
CREATE UNIQUE INDEX "SportsBetActual_externalId_key" ON "SportsBetActual"("externalId");

-- CreateIndex
CREATE INDEX "SportsBetActual_platformId_userId_idx" ON "SportsBetActual"("platformId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "SportsBetActual_reservationId_reqId_key" ON "SportsBetActual"("reservationId", "reqId");

-- AddForeignKey
ALTER TABLE "SportsBetReservation" ADD CONSTRAINT "SportsBetReservation_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "Platform"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SportsBetReservation" ADD CONSTRAINT "SportsBetReservation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SportsBetActual" ADD CONSTRAINT "SportsBetActual_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "SportsBetReservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
