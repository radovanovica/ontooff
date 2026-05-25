-- CreateTable
CREATE TABLE "closed_dates" (
    "id" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,
    "activityLocationId" TEXT,
    "activityTypeId" TEXT,
    "date" DATE,
    "dayOfWeek" INTEGER,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "closed_dates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "closed_dates_placeId_idx" ON "closed_dates"("placeId");

-- CreateIndex
CREATE INDEX "closed_dates_activityLocationId_idx" ON "closed_dates"("activityLocationId");

-- CreateIndex
CREATE INDEX "closed_dates_date_idx" ON "closed_dates"("date");

-- AddForeignKey
ALTER TABLE "closed_dates" ADD CONSTRAINT "closed_dates_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "closed_dates" ADD CONSTRAINT "closed_dates_activityLocationId_fkey" FOREIGN KEY ("activityLocationId") REFERENCES "activity_locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
