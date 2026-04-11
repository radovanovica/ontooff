-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,
    "activityLocationId" TEXT,
    "registrationId" TEXT NOT NULL,
    "userId" TEXT,
    "guestName" TEXT NOT NULL,
    "guestEmail" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "body" TEXT NOT NULL,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "isRejected" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reviews_registrationId_key" ON "reviews"("registrationId");

-- CreateIndex
CREATE INDEX "reviews_placeId_idx" ON "reviews"("placeId");

-- CreateIndex
CREATE INDEX "reviews_activityLocationId_idx" ON "reviews"("activityLocationId");

-- CreateIndex
CREATE INDEX "reviews_registrationId_idx" ON "reviews"("registrationId");

-- CreateIndex
CREATE INDEX "reviews_userId_idx" ON "reviews"("userId");

-- CreateIndex
CREATE INDEX "reviews_isApproved_idx" ON "reviews"("isApproved");

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_activityLocationId_fkey" FOREIGN KEY ("activityLocationId") REFERENCES "activity_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "registrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
