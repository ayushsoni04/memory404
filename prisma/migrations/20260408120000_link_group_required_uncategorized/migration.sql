-- Ensure default inbox group exists
INSERT INTO "groups" ("id", "name", "created_at")
SELECT gen_random_uuid(), 'Uncategorized', CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM "groups" WHERE "name" = 'Uncategorized'
);

-- Assign any orphan links to Uncategorized
UPDATE "links" AS l
SET "group_id" = (SELECT "id" FROM "groups" WHERE "name" = 'Uncategorized' LIMIT 1)
WHERE "group_id" IS NULL;

ALTER TABLE "links" ALTER COLUMN "group_id" SET NOT NULL;

ALTER TABLE "links" DROP CONSTRAINT IF EXISTS "links_group_id_fkey";

ALTER TABLE "links"
ADD CONSTRAINT "links_group_id_fkey"
FOREIGN KEY ("group_id") REFERENCES "groups"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
