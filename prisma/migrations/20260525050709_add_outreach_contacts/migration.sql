-- CreateEnum
CREATE TYPE "OutreachStatus" AS ENUM ('NEW', 'CONTACTED', 'INTERESTED', 'PROPOSAL_SENT', 'CONVERTED', 'DECLINED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "outreach_contacts" (
    "id" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "contactPerson" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "city" TEXT,
    "country" TEXT,
    "website" TEXT,
    "status" "OutreachStatus" NOT NULL DEFAULT 'NEW',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "source" TEXT,
    "notes" TEXT,
    "nextActionAt" TIMESTAMP(3),
    "convertedAt" TIMESTAMP(3),
    "assignedToId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outreach_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "outreach_contacts_status_idx" ON "outreach_contacts"("status");

-- CreateIndex
CREATE INDEX "outreach_contacts_assignedToId_idx" ON "outreach_contacts"("assignedToId");

-- CreateIndex
CREATE INDEX "outreach_contacts_nextActionAt_idx" ON "outreach_contacts"("nextActionAt");

-- AddForeignKey
ALTER TABLE "outreach_contacts" ADD CONSTRAINT "outreach_contacts_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
