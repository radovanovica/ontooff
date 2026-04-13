-- CreateTable
CREATE TABLE "free_locations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "address" TEXT,
    "city" TEXT,
    "country" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "logoUrl" TEXT,
    "coverUrl" TEXT,
    "gallery" TEXT,
    "coverImageIndex" INTEGER,
    "instructions" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "free_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "free_location_tags" (
    "freeLocationId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "free_location_tags_pkey" PRIMARY KEY ("freeLocationId","tagId")
);

-- CreateIndex
CREATE UNIQUE INDEX "free_locations_slug_key" ON "free_locations"("slug");

-- CreateIndex
CREATE INDEX "free_locations_isActive_idx" ON "free_locations"("isActive");

-- CreateIndex
CREATE INDEX "free_locations_slug_idx" ON "free_locations"("slug");

-- AddForeignKey
ALTER TABLE "free_location_tags" ADD CONSTRAINT "free_location_tags_freeLocationId_fkey" FOREIGN KEY ("freeLocationId") REFERENCES "free_locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "free_location_tags" ADD CONSTRAINT "free_location_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "activity_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
