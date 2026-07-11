-- AlterTable
ALTER TABLE "groups" ADD COLUMN "sort_order" INTEGER NOT NULL DEFAULT 0;

-- Backfill existing rows by created_at so current sequence is stable
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) - 1 AS rn
  FROM "groups"
)
UPDATE "groups" g
SET sort_order = ordered.rn
FROM ordered
WHERE g.id = ordered.id;

-- CreateIndex
CREATE INDEX "groups_sort_order_idx" ON "groups"("sort_order");
