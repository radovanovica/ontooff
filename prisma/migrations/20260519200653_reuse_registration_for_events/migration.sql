/*
  Warnings:

  - You are about to drop the `event_payment_breakdown_items` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `event_reservations` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "event_payment_breakdown_items" DROP CONSTRAINT "event_payment_breakdown_items_reservationId_fkey";

-- DropForeignKey
ALTER TABLE "event_reservations" DROP CONSTRAINT "event_reservations_embedTokenId_fkey";

-- DropForeignKey
ALTER TABLE "event_reservations" DROP CONSTRAINT "event_reservations_eventId_fkey";

-- DropForeignKey
ALTER TABLE "event_reservations" DROP CONSTRAINT "event_reservations_pricingRuleId_fkey";

-- DropForeignKey
ALTER TABLE "event_reservations" DROP CONSTRAINT "event_reservations_userId_fkey";

-- AlterTable
ALTER TABLE "registrations" ADD COLUMN     "eventId" TEXT,
ALTER COLUMN "activityLocationId" DROP NOT NULL;

-- DropTable
DROP TABLE "event_payment_breakdown_items";

-- DropTable
DROP TABLE "event_reservations";

-- CreateIndex
CREATE INDEX "registrations_eventId_idx" ON "registrations"("eventId");

-- AddForeignKey
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "place_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
