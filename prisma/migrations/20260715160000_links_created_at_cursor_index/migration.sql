-- Cursor pagination for newest-first feed (`ORDER BY created_at DESC, id DESC`)
CREATE INDEX IF NOT EXISTS "links_created_at_id_idx" ON "links" ("created_at" DESC, "id" DESC);
