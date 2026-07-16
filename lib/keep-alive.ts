/**
 * Supabase Free Tier Keep-Alive
 * ─────────────────────────────
 * Supabase pauses free-tier projects after 7 days of zero DB activity.
 * This module issues a lightweight `SELECT 1` every PING_INTERVAL_MS
 * (default: 3 days) to register activity and prevent auto-pause.
 *
 * A warm ping is also fired immediately at startup so the DB connection
 * pool is established before the first real request arrives.
 */
import { prisma } from "@/lib/prisma";

/** 3 days in ms — well within Supabase's 7-day inactivity window */
const PING_INTERVAL_MS = 3 * 24 * 60 * 60 * 1_000;

async function pingDatabase(): Promise<void> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log(`[keep-alive] DB pinged at ${new Date().toISOString()}`);
  } catch (err) {
    // Non-fatal — log and continue. Next ping will retry.
    console.error("[keep-alive] DB ping failed:", err);
  }
}

/**
 * Start the keep-alive loop.
 * Call once from the server entry-point after startup.
 * Returns a cleanup function to stop the interval on shutdown.
 */
export function startKeepAlive(): () => void {
  const intervalHours = PING_INTERVAL_MS / 1_000 / 60 / 60;
  console.log(`[keep-alive] Started — pinging DB every ${intervalHours}h to prevent Supabase auto-pause`);

  // Warm ping immediately at startup
  void pingDatabase();

  const timer = setInterval(() => {
    void pingDatabase();
  }, PING_INTERVAL_MS);

  // Allow Node to exit even if the interval is still pending
  timer.unref();

  return () => {
    clearInterval(timer);
    console.log("[keep-alive] Stopped");
  };
}
