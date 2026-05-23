-- AlterTable
ALTER TABLE "registrations" ADD COLUMN "activityTypeId" TEXT;

-- Backfill from pricing rule, else first activity at location
UPDATE "registrations" r
SET "activityTypeId" = COALESCE(
  (SELECT pr."activityTypeId" FROM "pricing_rules" pr WHERE pr.id = r."pricingRuleId" AND pr."activityTypeId" IS NOT NULL),
  (SELECT ala."activityTypeId" FROM "activity_location_activities" ala
   WHERE ala."activityLocationId" = r."activityLocationId"
   ORDER BY ala."activityTypeId"
   LIMIT 1)
)
WHERE r."activityLocationId" IS NOT NULL AND r."activityTypeId" IS NULL;

-- AddForeignKey
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_activityTypeId_fkey" FOREIGN KEY ("activityTypeId") REFERENCES "activity_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "registrations_activityTypeId_idx" ON "registrations"("activityTypeId");

-- CreateIndex
CREATE INDEX "registrations_activityTypeId_status_startDate_endDate_idx" ON "registrations"("activityTypeId", "status", "startDate", "endDate");
