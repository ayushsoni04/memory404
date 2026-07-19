/**
 * Runs once when the server process boots, before any request is handled.
 *
 * The MongoDB Atlas connection (SRV DNS lookup + TLS + SCRAM auth handshake)
 * measured 700ms–3.2s cold in testing here, and previously blocked the very
 * first request to hit the DB synchronously — landing right on the
 * skeleton→cards transition. Kicking it off here lets that cost overlap
 * with the rest of boot instead of blocking the first real page load.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { getMongoClient, getMongoEnvError } = await import(
      "@/lib/db/mongodb"
    );
    if (getMongoEnvError()) return;
    void getMongoClient().catch((error) => {
      console.error("[instrumentation] MongoDB warm-up failed:", error);
    });
  }
}
