-- AlterTable
ALTER TABLE "embed_tokens" ADD COLUMN     "activityTypeId" TEXT;

-- CreateIndex
CREATE INDEX "embed_tokens_activityTypeId_idx" ON "embed_tokens"("activityTypeId");

-- AddForeignKey
ALTER TABLE "embed_tokens" ADD CONSTRAINT "embed_tokens_activityTypeId_fkey" FOREIGN KEY ("activityTypeId") REFERENCES "activity_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;
