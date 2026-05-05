-- Add CONTRIBUTOR value to UserRole enum
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'CONTRIBUTOR';

-- Create BlogStatus enum
DO $$ BEGIN
    CREATE TYPE "BlogStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable: blog_categories
CREATE TABLE IF NOT EXISTS "blog_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blog_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable: blog_tags
CREATE TABLE IF NOT EXISTS "blog_tags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "blog_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable: blog_posts
CREATE TABLE IF NOT EXISTS "blog_posts" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT,
    "body" TEXT NOT NULL,
    "coverUrl" TEXT,
    "status" "BlogStatus" NOT NULL DEFAULT 'DRAFT',
    "authorId" TEXT NOT NULL,
    "placeId" TEXT,
    "categoryId" TEXT,
    "readingTimeMinutes" INTEGER,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blog_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable: blog_post_tags
CREATE TABLE IF NOT EXISTS "blog_post_tags" (
    "postId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "blog_post_tags_pkey" PRIMARY KEY ("postId","tagId")
);

-- CreateTable: contributor_place_access
CREATE TABLE IF NOT EXISTS "contributor_place_access" (
    "id" TEXT NOT NULL,
    "contributorId" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,
    "grantedById" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contributor_place_access_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "blog_categories_name_key" ON "blog_categories"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "blog_categories_slug_key" ON "blog_categories"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "blog_tags_name_key" ON "blog_tags"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "blog_tags_slug_key" ON "blog_tags"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "blog_posts_slug_key" ON "blog_posts"("slug");
CREATE INDEX IF NOT EXISTS "blog_posts_authorId_idx" ON "blog_posts"("authorId");
CREATE INDEX IF NOT EXISTS "blog_posts_placeId_idx" ON "blog_posts"("placeId");
CREATE INDEX IF NOT EXISTS "blog_posts_status_idx" ON "blog_posts"("status");
CREATE UNIQUE INDEX IF NOT EXISTS "contributor_place_access_contributorId_placeId_key" ON "contributor_place_access"("contributorId", "placeId");
CREATE INDEX IF NOT EXISTS "contributor_place_access_contributorId_idx" ON "contributor_place_access"("contributorId");
CREATE INDEX IF NOT EXISTS "contributor_place_access_placeId_idx" ON "contributor_place_access"("placeId");

-- AddForeignKey
ALTER TABLE "blog_posts" DROP CONSTRAINT IF EXISTS "blog_posts_authorId_fkey";
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "blog_posts" DROP CONSTRAINT IF EXISTS "blog_posts_placeId_fkey";
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "places"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "blog_posts" DROP CONSTRAINT IF EXISTS "blog_posts_categoryId_fkey";
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "blog_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "blog_post_tags" DROP CONSTRAINT IF EXISTS "blog_post_tags_postId_fkey";
ALTER TABLE "blog_post_tags" ADD CONSTRAINT "blog_post_tags_postId_fkey" FOREIGN KEY ("postId") REFERENCES "blog_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "blog_post_tags" DROP CONSTRAINT IF EXISTS "blog_post_tags_tagId_fkey";
ALTER TABLE "blog_post_tags" ADD CONSTRAINT "blog_post_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "blog_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "contributor_place_access" DROP CONSTRAINT IF EXISTS "contributor_place_access_contributorId_fkey";
ALTER TABLE "contributor_place_access" ADD CONSTRAINT "contributor_place_access_contributorId_fkey" FOREIGN KEY ("contributorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "contributor_place_access" DROP CONSTRAINT IF EXISTS "contributor_place_access_placeId_fkey";
ALTER TABLE "contributor_place_access" ADD CONSTRAINT "contributor_place_access_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "contributor_place_access" DROP CONSTRAINT IF EXISTS "contributor_place_access_grantedById_fkey";
ALTER TABLE "contributor_place_access" ADD CONSTRAINT "contributor_place_access_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
