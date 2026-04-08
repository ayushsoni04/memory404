import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export function getDatabaseEnvError(): string | null {
  const url = process.env.DATABASE_URL?.trim() ?? "";
  const direct = process.env.DIRECT_URL?.trim() ?? "";
  if (!url || !direct) {
    return "Database is not configured: set DATABASE_URL and DIRECT_URL in .env and .env.local, then restart the dev server.";
  }
  if (
    url.includes("REPLACE_WITH_DB_PASSWORD") ||
    direct.includes("REPLACE_WITH_DB_PASSWORD")
  ) {
    return "Replace REPLACE_WITH_DB_PASSWORD in DATABASE_URL and DIRECT_URL with your Supabase database password (Dashboard → Project Settings → Database), then restart npm run dev.";
  }
  return null;
}
