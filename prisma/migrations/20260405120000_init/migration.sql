-- CreateTable
CREATE TABLE "links" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "url" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_uncategorized" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "links_pkey" PRIMARY KEY ("id")
);
