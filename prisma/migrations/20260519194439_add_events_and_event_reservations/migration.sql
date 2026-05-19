-- AlterTable
ALTER TABLE "embed_tokens" ADD COLUMN     "eventId" TEXT;

-- CreateTable
CREATE TABLE "place_events" (
    "id" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "maxReservations" INTEGER,
    "reservationDeadline" TIMESTAMP(3),
    "pricingRuleId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "place_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_reservations" (
    "id" TEXT NOT NULL,
    "registrationNumber" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT,
    "pricingRuleId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "notes" TEXT,
    "guestCounts" JSONB NOT NULL DEFAULT '{}',
    "totalAmount" DECIMAL(10,2),
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "paymentMethod" "PaymentMethod",
    "status" "RegistrationStatus" NOT NULL DEFAULT 'PENDING',
    "editToken" TEXT NOT NULL,
    "source" TEXT DEFAULT 'web',
    "embedTokenId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_payment_breakdown_items" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "ageGroup" "AgeGroupType",
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "totalPrice" DECIMAL(10,2) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_payment_breakdown_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "place_events_placeId_idx" ON "place_events"("placeId");

-- CreateIndex
CREATE INDEX "place_events_eventDate_idx" ON "place_events"("eventDate");

-- CreateIndex
CREATE INDEX "place_events_isActive_idx" ON "place_events"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "event_reservations_registrationNumber_key" ON "event_reservations"("registrationNumber");

-- CreateIndex
CREATE UNIQUE INDEX "event_reservations_editToken_key" ON "event_reservations"("editToken");

-- CreateIndex
CREATE INDEX "event_reservations_eventId_idx" ON "event_reservations"("eventId");

-- CreateIndex
CREATE INDEX "event_reservations_userId_idx" ON "event_reservations"("userId");

-- CreateIndex
CREATE INDEX "event_reservations_status_idx" ON "event_reservations"("status");

-- CreateIndex
CREATE INDEX "event_reservations_email_idx" ON "event_reservations"("email");

-- CreateIndex
CREATE INDEX "event_reservations_editToken_idx" ON "event_reservations"("editToken");

-- CreateIndex
CREATE INDEX "event_reservations_registrationNumber_idx" ON "event_reservations"("registrationNumber");

-- CreateIndex
CREATE INDEX "event_payment_breakdown_items_reservationId_idx" ON "event_payment_breakdown_items"("reservationId");

-- CreateIndex
CREATE INDEX "embed_tokens_eventId_idx" ON "embed_tokens"("eventId");

-- AddForeignKey
ALTER TABLE "embed_tokens" ADD CONSTRAINT "embed_tokens_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "place_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "place_events" ADD CONSTRAINT "place_events_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "place_events" ADD CONSTRAINT "place_events_pricingRuleId_fkey" FOREIGN KEY ("pricingRuleId") REFERENCES "pricing_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_reservations" ADD CONSTRAINT "event_reservations_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "place_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_reservations" ADD CONSTRAINT "event_reservations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_reservations" ADD CONSTRAINT "event_reservations_pricingRuleId_fkey" FOREIGN KEY ("pricingRuleId") REFERENCES "pricing_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_reservations" ADD CONSTRAINT "event_reservations_embedTokenId_fkey" FOREIGN KEY ("embedTokenId") REFERENCES "embed_tokens"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_payment_breakdown_items" ADD CONSTRAINT "event_payment_breakdown_items_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "event_reservations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
