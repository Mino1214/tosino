-- AlterTable
ALTER TABLE "PlatformAnnouncement" ADD COLUMN "imageWidth" INTEGER,
ADD COLUMN "imageHeight" INTEGER;

-- CreateTable
CREATE TABLE "PlatformAnnouncementAsset" (
    "id" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "originalName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformAnnouncementAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlatformAnnouncementAsset_platformId_createdAt_idx" ON "PlatformAnnouncementAsset"("platformId", "createdAt");

-- AddForeignKey
ALTER TABLE "PlatformAnnouncementAsset" ADD CONSTRAINT "PlatformAnnouncementAsset_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "Platform"("id") ON DELETE CASCADE ON UPDATE CASCADE;
