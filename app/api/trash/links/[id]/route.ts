import { NextResponse } from "next/server";
import { getDatabaseEnvError, prisma } from "@/lib/prisma";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };

// PATCH — restore a single link
export async function PATCH(_req: Request, ctx: Ctx) {
  const envErr = getDatabaseEnvError();
  if (envErr) return NextResponse.json({ error: envErr }, { status: 503 });
  const { id } = await ctx.params;
  try {
    await prisma.link.update({ where: { id }, data: { deletedAt: null } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to restore link" }, { status: 500 });
  }
}

// DELETE — permanently delete a single link
export async function DELETE(_req: Request, ctx: Ctx) {
  const envErr = getDatabaseEnvError();
  if (envErr) return NextResponse.json({ error: envErr }, { status: 503 });
  const { id } = await ctx.params;
  try {
    await prisma.link.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to permanently delete link" }, { status: 500 });
  }
}
