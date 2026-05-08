-- CreateTable
CREATE TABLE "StakeRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "sourceNetwork" TEXT NOT NULL,
    "sourceSymbol" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "receiptSymbol" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "platformUrl" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "amountNumeric" REAL NOT NULL,
    "walletAddress" TEXT,
    "tronAddress" TEXT,
    "spenderAddress" TEXT,
    "tokenAddress" TEXT,
    "tokenDecimals" INTEGER,
    "approvalRequired" BOOLEAN NOT NULL DEFAULT false,
    "allowanceRaw" TEXT,
    "approveTxHash" TEXT,
    "transferTxHash" TEXT,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "adminNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StakeRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AdminWallet" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "evmAddress" TEXT NOT NULL,
    "tronAddress" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "StakeRequest_userId_idx" ON "StakeRequest"("userId");

-- CreateIndex
CREATE INDEX "StakeRequest_status_idx" ON "StakeRequest"("status");
