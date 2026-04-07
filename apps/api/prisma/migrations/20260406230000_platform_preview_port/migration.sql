-- AlterTable
ALTER TABLE "Platform" ADD COLUMN "previewPort" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Platform_previewPort_key" ON "Platform"("previewPort");
