-- CreateTable
CREATE TABLE "event_pricing_rules" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "pricingRuleId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_pricing_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "event_pricing_rules_eventId_idx" ON "event_pricing_rules"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "event_pricing_rules_eventId_pricingRuleId_key" ON "event_pricing_rules"("eventId", "pricingRuleId");

-- AddForeignKey
ALTER TABLE "event_pricing_rules" ADD CONSTRAINT "event_pricing_rules_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "place_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_pricing_rules" ADD CONSTRAINT "event_pricing_rules_pricingRuleId_fkey" FOREIGN KEY ("pricingRuleId") REFERENCES "pricing_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
