/**
 * Framework-agnostic dev-user fallback, shared by the Next.js app (lib/auth.ts)
 * and the standalone Express API (backend/src/routes/*) — neither of which
 * has a real sign-in flow yet. Every row is attributed to this seeded user
 * until real auth ships.
 *
 * Matches the seed row inserted by
 * prisma/migrations/20260718120000_add_multi_tenancy_user_id/migration.sql —
 * keep both in sync if this ever changes.
 */
export const DEV_USER_ID = "00000000-0000-0000-0000-000000000001";
export const DEV_USER_EMAIL = "dev@memory404.local";
