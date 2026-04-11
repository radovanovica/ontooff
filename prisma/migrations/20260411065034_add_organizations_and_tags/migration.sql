-- CreateEnum
CREATE TYPE "OrgStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- AlterTable
ALTER TABLE "places" ADD COLUMN     "organizationId" TEXT;

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "country" TEXT,
    "website" TEXT,
    "description" TEXT,
    "status" "OrgStatus" NOT NULL DEFAULT 'PENDING',
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_tags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "icon" TEXT,
    "color" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_type_tags" (
    "activityTypeId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "activity_type_tags_pkey" PRIMARY KEY ("activityTypeId","tagId")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_email_key" ON "organizations"("email");

-- CreateIndex
CREATE INDEX "organizations_status_idx" ON "organizations"("status");

-- CreateIndex
CREATE INDEX "organizations_email_idx" ON "organizations"("email");

-- CreateIndex
CREATE UNIQUE INDEX "activity_tags_name_key" ON "activity_tags"("name");

-- CreateIndex
CREATE UNIQUE INDEX "activity_tags_slug_key" ON "activity_tags"("slug");

-- CreateIndex
CREATE INDEX "activity_tags_isActive_idx" ON "activity_tags"("isActive");

-- CreateIndex
CREATE INDEX "places_organizationId_idx" ON "places"("organizationId");

-- AddForeignKey
ALTER TABLE "places" ADD CONSTRAINT "places_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_type_tags" ADD CONSTRAINT "activity_type_tags_activityTypeId_fkey" FOREIGN KEY ("activityTypeId") REFERENCES "activity_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_type_tags" ADD CONSTRAINT "activity_type_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "activity_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
