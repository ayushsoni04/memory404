-- Migration: add_perf_indexes
-- Adds two indexes that dramatically speed up the two most common expensive queries:
--
--   1. links_tags_gin  — GIN index for array containment/overlap (hasSome, hasEvery).
--      Before: sequential scan over all tags arrays.
--      After:  O(log n) GIN bitmap index scan.
--
--   2. links_group_cursor — Covering composite index that satisfies both the
--      WHERE group_id = $1 filter AND the ORDER BY created_at DESC, id DESC
--      cursor pagination ordering in a single index-only scan.
--      Before: sequential scan filtered by group_id, then sort.
--      After:  index-only range scan, no sort.

-- GIN index for fast tag array filtering (hasSome / hasEvery)
CREATE INDEX CONCURRENTLY IF NOT EXISTS links_tags_gin
  ON public.links USING gin (tags);

-- Composite index for per-group paginated listing (covers WHERE + ORDER BY)
CREATE INDEX CONCURRENTLY IF NOT EXISTS links_group_cursor
  ON public.links (group_id, created_at DESC, id DESC);
