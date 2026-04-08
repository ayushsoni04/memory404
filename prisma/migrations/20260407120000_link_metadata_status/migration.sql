CREATE TYPE "LinkMetadataStatus" AS ENUM ('pending', 'ready');

ALTER TABLE "links" ADD COLUMN "metadata_status" "LinkMetadataStatus" NOT NULL DEFAULT 'pending';

UPDATE "links" SET "metadata_status" = 'ready';
