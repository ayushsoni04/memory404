-- DropIndex
DROP INDEX "links_group_cursor";

-- DropIndex
DROP INDEX "links_tags_gin";

-- AlterTable
ALTER TABLE "groups" ADD COLUMN     "deleted_at" TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "links" ADD COLUMN     "deleted_at" TIMESTAMPTZ(6),
ALTER COLUMN "title" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "links_deleted_at_idx" ON "links"("deleted_at");
