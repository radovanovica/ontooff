ALTER TABLE "reviews" ALTER COLUMN "registrationId" DROP NOT NULL;
ALTER TABLE "reviews" ALTER COLUMN "placeId" DROP NOT NULL;
ALTER TABLE "reviews" DROP CONSTRAINT IF EXISTS "reviews_placeId_fkey";
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reviews" DROP CONSTRAINT IF EXISTS "reviews_registrationId_fkey";
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "registrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "freeLocationId" TEXT;
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_freeLocationId_fkey" FOREIGN KEY ("freeLocationId") REFERENCES "free_locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "reviews_freeLocationId_idx" ON "reviews"("freeLocationId");