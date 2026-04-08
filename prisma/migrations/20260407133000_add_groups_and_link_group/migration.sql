CREATE TABLE "groups" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "groups_name_key" ON "groups"("name");

ALTER TABLE "links"
ADD COLUMN "group_id" UUID;

CREATE INDEX "links_group_id_idx" ON "links"("group_id");

ALTER TABLE "links"
ADD CONSTRAINT "links_group_id_fkey"
FOREIGN KEY ("group_id") REFERENCES "groups"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
