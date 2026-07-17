-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "name" TEXT,
    "avatar_url" TEXT,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- Seed a single dev user so existing rows have a valid owner until real auth ships.
-- Matches DEV_USER_ID in lib/auth.ts — keep these in sync.
INSERT INTO "users" ("id", "email", "plan")
VALUES ('00000000-0000-0000-0000-000000000001', 'dev@memory404.local', 'free')
ON CONFLICT (id) DO NOTHING;

-- AlterTable: links — add nullable, backfill to the dev user, then enforce NOT NULL
ALTER TABLE "links" ADD COLUMN "user_id" UUID;
UPDATE "links" SET "user_id" = '00000000-0000-0000-0000-000000000001' WHERE "user_id" IS NULL;
ALTER TABLE "links" ALTER COLUMN "user_id" SET NOT NULL;

-- AlterTable: groups — same backfill pattern
ALTER TABLE "groups" ADD COLUMN "user_id" UUID;
UPDATE "groups" SET "user_id" = '00000000-0000-0000-0000-000000000001' WHERE "user_id" IS NULL;
ALTER TABLE "groups" ALTER COLUMN "user_id" SET NOT NULL;

-- DropIndex: replace global-uniqueness constraints with per-user ones
DROP INDEX "links_url_key";
DROP INDEX "groups_name_key";

-- CreateIndex
CREATE UNIQUE INDEX "links_user_id_url_key" ON "links"("user_id", "url");
CREATE UNIQUE INDEX "groups_user_id_name_key" ON "groups"("user_id", "name");
CREATE INDEX "links_user_id_deleted_at_created_at_id_idx" ON "links"("user_id", "deleted_at", "created_at" DESC, "id" DESC);
CREATE INDEX "groups_user_id_sort_order_idx" ON "groups"("user_id", "sort_order");

-- AddForeignKey
ALTER TABLE "links" ADD CONSTRAINT "links_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "groups" ADD CONSTRAINT "groups_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
