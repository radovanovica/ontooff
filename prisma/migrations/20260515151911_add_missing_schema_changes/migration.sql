/*
  Warnings:

  - You are about to drop the column `isApproved` on the `reviews` table. All the data in the column will be lost.
  - You are about to drop the column `isRejected` on the `reviews` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "PlaceStatus" AS ENUM ('REGULAR', 'RECOMMENDED', 'PREMIUM');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- DropForeignKey
ALTER TABLE "blog_posts" DROP CONSTRAINT "blog_posts_authorId_fkey";

-- DropForeignKey
ALTER TABLE "contributor_place_access" DROP CONSTRAINT "contributor_place_access_grantedById_fkey";

-- DropIndex
DROP INDEX "blog_posts_status_idx";

-- DropIndex
DROP INDEX "reviews_isApproved_idx";

-- AlterTable
ALTER TABLE "blog_posts" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "payment_breakdown_items" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "places" ADD COLUMN     "status" "PlaceStatus" NOT NULL DEFAULT 'REGULAR';

-- AlterTable
ALTER TABLE "registration_spots" ADD COLUMN     "timeslotId" TEXT;

-- AlterTable
ALTER TABLE "reviews" DROP COLUMN "isApproved",
DROP COLUMN "isRejected",
ADD COLUMN     "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "spots" ADD COLUMN     "maxDays" INTEGER,
ADD COLUMN     "minDays" INTEGER;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "favoriteLocationIds" TEXT[];

-- CreateTable
CREATE TABLE "timeslots" (
    "id" TEXT NOT NULL,
    "spotId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "isWholeDay" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "timeslots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "timeslots_spotId_idx" ON "timeslots"("spotId");

-- CreateIndex
CREATE INDEX "blog_posts_status_publishedAt_idx" ON "blog_posts"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "blog_posts_categoryId_idx" ON "blog_posts"("categoryId");

-- CreateIndex
CREATE INDEX "blog_posts_slug_idx" ON "blog_posts"("slug");

-- CreateIndex
CREATE INDEX "organizations_ownerId_idx" ON "organizations"("ownerId");

-- CreateIndex
CREATE INDEX "pricing_rules_placeId_idx" ON "pricing_rules"("placeId");

-- CreateIndex
CREATE INDEX "registration_spots_spotId_timeslotId_idx" ON "registration_spots"("spotId", "timeslotId");

-- CreateIndex
CREATE INDEX "registrations_activityLocationId_status_startDate_endDate_idx" ON "registrations"("activityLocationId", "status", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "registrations_paymentStatus_idx" ON "registrations"("paymentStatus");

-- CreateIndex
CREATE INDEX "registrations_embedTokenId_idx" ON "registrations"("embedTokenId");

-- CreateIndex
CREATE INDEX "reviews_status_idx" ON "reviews"("status");

-- CreateIndex
CREATE INDEX "reviews_placeId_status_idx" ON "reviews"("placeId", "status");

-- CreateIndex
CREATE INDEX "reviews_freeLocationId_status_idx" ON "reviews"("freeLocationId", "status");

-- AddForeignKey
ALTER TABLE "timeslots" ADD CONSTRAINT "timeslots_spotId_fkey" FOREIGN KEY ("spotId") REFERENCES "spots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pricing_rules" ADD CONSTRAINT "pricing_rules_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "places"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_spots" ADD CONSTRAINT "registration_spots_timeslotId_fkey" FOREIGN KEY ("timeslotId") REFERENCES "timeslots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contributor_place_access" ADD CONSTRAINT "contributor_place_access_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
