-- AlterTable
ALTER TABLE "spots" ADD COLUMN     "activityTypeId" TEXT;

-- CreateIndex
CREATE INDEX "spots_activityTypeId_idx" ON "spots"("activityTypeId");

-- AddForeignKey
ALTER TABLE "spots" ADD CONSTRAINT "spots_activityTypeId_fkey" FOREIGN KEY ("activityTypeId") REFERENCES "activity_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;
