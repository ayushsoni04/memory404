#!/usr/bin/env bash
# ============================================================
# memory404 — DB Migration: old → new Supabase project
# Usage: bash scripts/migrate-to-new-supabase.sh <NEW_DB_PASSWORD>
#
# Steps:
#   1. Run all Prisma migrations on the new project (schema)
#   2. pg_dump existing data from old project
#   3. pg_restore data into new project
# ============================================================
set -euo pipefail

NEW_PASS="${1:-}"
if [[ -z "$NEW_PASS" ]]; then
  echo "❌  Usage: bash scripts/migrate-to-new-supabase.sh <NEW_DB_PASSWORD>"
  echo "   Get it from: Supabase → gucdslwlvrgwfyhmazeq → Project Settings → Database"
  exit 1
fi

OLD_PASS="YuYuhakusho_04"
OLD_REF="xehhijjhmrodmcljzonl"
NEW_REF="gucdslwlvrgwfyhmazeq"

# ── Connection strings ────────────────────────────────────────────────────────
OLD_DIRECT="postgresql://postgres:${OLD_PASS}@db.${OLD_REF}.supabase.co:5432/postgres?sslmode=require"

# Direct port 5432 is blocked, so we use session mode on the pooler host (port 5432) as DIRECT_URL for migrations.
NEW_DIRECT="postgresql://postgres.${NEW_REF}:${NEW_PASS}@aws-1-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require"

# PgBouncer transaction mode pooler (port 6543) as DATABASE_URL for runtime.
NEW_POOLER="postgresql://postgres.${NEW_REF}:${NEW_PASS}@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require&connect_timeout=10&pgbouncer=true"

echo ""
echo "══════════════════════════════════════════════════════"
echo "  memory404 DB Migration"
echo "  OLD: ${OLD_REF}"
echo "  NEW: ${NEW_REF}"
echo "══════════════════════════════════════════════════════"
echo ""

# ── Step 1: Run Prisma migrations on new project ─────────────────────────────
echo "▶ Step 1/3 — Running Prisma migrations on new project…"
DATABASE_URL="$NEW_POOLER" \
DIRECT_URL="$NEW_DIRECT" \
  npx prisma migrate deploy --schema=prisma/schema.prisma
echo "✅  Schema migrated"
echo ""

# ── Step 2: Dump data from old project ───────────────────────────────────────
echo "▶ Step 2/3 — Dumping data from old project…"
DUMP_FILE="/tmp/memory404_migration_$(date +%Y%m%d_%H%M%S).dump"

# Check if pg_dump is available (preferring Homebrew path)
PG_DUMP="/opt/homebrew/opt/postgresql@18/bin/pg_dump"
PG_RESTORE="/opt/homebrew/opt/postgresql@18/bin/pg_restore"

if ! [[ -f "$PG_DUMP" ]]; then
  PG_DUMP="pg_dump"
  PG_RESTORE="pg_restore"
fi

if command -v "$PG_DUMP" &>/dev/null; then
  PGPASSWORD="$OLD_PASS" "$PG_DUMP" \
    "host=db.${OLD_REF}.supabase.co port=5432 dbname=postgres user=postgres sslmode=require" \
    --no-owner --no-privileges --data-only --schema=public \
    --exclude-table='public._prisma_migrations' \
    -Fc -f "$DUMP_FILE"
  echo "✅  Dump saved to $DUMP_FILE"
  echo ""

  # ── Step 3: Restore into new project ───────────────────────────────────────
  echo "▶ Step 3/3 — Restoring data into new project…"
  
  # Truncate tables first so that there are no duplicate conflicts (e.g. auto-created General group)
  echo "🧹  Clearing existing rows in new database..."
  DATABASE_URL="$NEW_POOLER" DIRECT_URL="$NEW_DIRECT" \
    npx prisma db execute --stdin --schema=prisma/schema.prisma <<< "TRUNCATE TABLE public.links, public.groups CASCADE;"
    
  PGPASSWORD="$NEW_PASS" "$PG_RESTORE" \
    -d "host=aws-1-ap-south-1.pooler.supabase.com port=5432 dbname=postgres user=postgres.${NEW_REF} sslmode=require" \
    --no-owner --no-privileges --schema=public \
    "$DUMP_FILE"
  echo "✅  Data restored"
  rm -f "$DUMP_FILE"
else
  echo "⚠️   pg_dump not found — skipping data migration."
  echo "   Install via: brew install postgresql@16"
  echo "   Then re-run this script."
fi

echo ""
# ── Update .env files with correct password ───────────────────────────────────
echo "▶ Updating .env and .env.local with new credentials…"
NEW_POOLER_ESC=$(printf '%s\n' "$NEW_POOLER" | sed 's/[[\.*^$()+?{|]/\\&/g')
NEW_DIRECT_ESC=$(printf '%s\n' "$NEW_DIRECT" | sed 's/[[\.*^$()+?{|]/\\&/g')

# .env
sed -i '' \
  "s|DATABASE_URL=.*|DATABASE_URL=\"${NEW_POOLER}\"|" .env 2>/dev/null || true
sed -i '' \
  "s|DIRECT_URL=.*|DIRECT_URL=\"${NEW_DIRECT}\"|" .env 2>/dev/null || true

# .env.local
sed -i '' \
  "s|DATABASE_URL=.*|DATABASE_URL=\"${NEW_POOLER}\"|" .env.local 2>/dev/null || true
sed -i '' \
  "s|DIRECT_URL=.*|DIRECT_URL=\"${NEW_DIRECT}\"|" .env.local 2>/dev/null || true

echo "✅  .env files updated"

echo ""
echo "══════════════════════════════════════════════════════"
echo "  ✅  Migration complete!"
echo ""
echo "  Next: Set these in the Render Dashboard:"
echo "    DATABASE_URL = ${NEW_POOLER}"
echo "    DIRECT_URL   = ${NEW_DIRECT}"
echo "    CLOUDINARY_CLOUD_NAME = xcmaxg3w"
echo "    CLOUDINARY_API_KEY    = 449918347441375"
echo "    CLOUDINARY_API_SECRET = 5Yn2ZKsSvyIKhc-auDH4OWNWA6Q"
echo "══════════════════════════════════════════════════════"
