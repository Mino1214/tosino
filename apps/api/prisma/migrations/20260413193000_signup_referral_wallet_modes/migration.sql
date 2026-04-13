ALTER TABLE "User"
ADD COLUMN "referredByUserId" TEXT,
ADD COLUMN "signupReferralInput" TEXT,
ADD COLUMN "usdtWalletAddress" TEXT;

ALTER TABLE "WalletRequest"
ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'KRW';

CREATE INDEX "User_referredByUserId_idx" ON "User"("referredByUserId");

ALTER TABLE "User"
ADD CONSTRAINT "User_referredByUserId_fkey"
FOREIGN KEY ("referredByUserId") REFERENCES "User"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
