import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getCollections, getMongoEnvError } from "@/lib/db/mongodb";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };

// PATCH — restore a single link
export async function PATCH(_req: Request, ctx: Ctx) {
  if (process.env.MAINTENANCE_MODE === "true") {
    return NextResponse.json(
      { error: "Service is temporarily unavailable during maintenance." },
      { status: 503 },
    );
  }
  const envErr = getMongoEnvError();
  if (envErr) return NextResponse.json({ error: envErr }, { status: 503 });
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;
  const { id } = await ctx.params;
  try {
    const { links } = await getCollections();
    const result = await links.updateOne(
      { _id: id, userId: auth.id },
      { $set: { deletedAt: null } },
    );
    if (result.matchedCount !== 1) throw new Error("LINK_NOT_FOUND");
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to restore link" }, { status: 500 });
  }
}

// DELETE — permanently delete a single link
export async function DELETE(_req: Request, ctx: Ctx) {
  if (process.env.MAINTENANCE_MODE === "true") {
    return NextResponse.json(
      { error: "Service is temporarily unavailable during maintenance." },
      { status: 503 },
    );
  }
  const envErr = getMongoEnvError();
  if (envErr) return NextResponse.json({ error: envErr }, { status: 503 });
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;
  const { id } = await ctx.params;
  try {
    const { links } = await getCollections();
    const result = await links.deleteOne({ _id: id, userId: auth.id });
    if (result.deletedCount !== 1) throw new Error("LINK_NOT_FOUND");
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to permanently delete link" }, { status: 500 });
  }
}
