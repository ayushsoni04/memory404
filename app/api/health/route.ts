import { NextResponse } from "next/server";
import { getDatabaseEnvError, prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/** Lightweight health + DB ping (keeps Supabase active on scheduled pings). */
export async function GET() {
  const envErr = getDatabaseEnvError();
  if (envErr) {
    return NextResponse.json(
      { ok: false, service: "memory404-web", error: envErr },
      { status: 503 },
    );
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
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
