-- CreateTable
CREATE TABLE "activity_location_activities" (
    "activityLocationId" TEXT NOT NULL,
    "activityTypeId" TEXT NOT NULL,

    CONSTRAINT "activity_location_activities_pkey" PRIMARY KEY ("activityLocationId","activityTypeId")
);

-- CreateIndex
CREATE INDEX "activity_location_activities_activityLocationId_idx" ON "activity_location_activities"("activityLocationId");

-- CreateIndex
CREATE INDEX "activity_location_activities_activityTypeId_idx" ON "activity_location_activities"("activityTypeId");

-- AddForeignKey
ALTER TABLE "activity_location_activities" ADD CONSTRAINT "activity_location_activities_activityLocationId_fkey" FOREIGN KEY ("activityLocationId") REFERENCES "activity_locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_location_activities" ADD CONSTRAINT "activity_location_activities_activityTypeId_fkey" FOREIGN KEY ("activityTypeId") REFERENCES "activity_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;
