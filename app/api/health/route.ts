import { NextResponse } from "next/server";
import { getMongoEnvError, pingMongo } from "@/lib/db/mongodb";

export const runtime = "nodejs";

/** Lightweight health + MongoDB ping. */
export async function GET() {
  const envErr = getMongoEnvError();
  if (envErr) {
    return NextResponse.json(
      { ok: false, service: "memory404-web", error: envErr },
      { status: 503 },
    );
  }

  try {
    await pingMongo();
    return NextResponse.json({
      ok: true,
      service: "memory404-web",
      db: "ok",
    });
  } catch (e) {
    console.error("GET /api/health:", e);
    return NextResponse.json(
      { ok: false, service: "memory404-web", db: "error" },
      { status: 503 },
    );
  }
}
