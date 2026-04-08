-- AlterTable
ALTER TABLE "links" ADD COLUMN "custom_title" TEXT,
ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "notes" TEXT;

-- Backfill system title (required, non-null)
UPDATE "links" SET "title" = COALESCE(NULLIF(TRIM("title"), ''), "url")
WHERE "title" IS NULL OR TRIM("title") = '';

ALTER TABLE "links" ALTER COLUMN "title" SET NOT NULL;
ALTER TABLE "links" ALTER COLUMN "title" SET DEFAULT '';

ALTER TABLE "links" DROP COLUMN IF EXISTS "is_uncategorized";

-- Enforce unique URLs: keep oldest row per URL (by created_at, then id)
DELETE FROM "links" l
WHERE l.id NOT IN (
  SELECT DISTINCT ON (url) id
  FROM "links"
  ORDER BY url, created_at ASC NULLS LAST, id ASC
);

CREATE UNIQUE INDEX "links_url_key" ON "links"("url");
