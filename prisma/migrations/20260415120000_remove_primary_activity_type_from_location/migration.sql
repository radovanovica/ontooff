-- Migration: remove_primary_activity_type_from_location
-- Moves existing activityTypeId (primary) values from activity_locations
-- into the activity_location_activities join table (if not already present),
-- then drops the column and its foreign key / index.

-- Step 1: Copy any existing primary activityTypeId into the join table
-- (INSERT ... ON CONFLICT DO NOTHING handles rows already there)
INSERT INTO "activity_location_activities" ("activityLocationId", "activityTypeId")
SELECT "id", "activityTypeId"
FROM "activity_locations"
WHERE "activityTypeId" IS NOT NULL
ON CONFLICT DO NOTHING;

-- Step 2: Drop the foreign key constraint on activityTypeId
ALTER TABLE "activity_locations" DROP CONSTRAINT IF EXISTS "activity_locations_activityTypeId_fkey";

-- Step 3: Drop the index on activityTypeId
DROP INDEX IF EXISTS "activity_locations_activityTypeId_idx";

-- Step 4: Drop the column itself
ALTER TABLE "activity_locations" DROP COLUMN "activityTypeId";
