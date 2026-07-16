import { NextResponse } from "next/server";
import { getDatabaseEnvError, prisma } from "@/lib/prisma";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };

// PATCH — restore a group AND all links that were trashed with it (same deletedAt timestamp ±2s)
export async function PATCH(_req: Request, ctx: Ctx) {
  const envErr = getDatabaseEnvError();
  if (envErr) return NextResponse.json({ error: envErr }, { status: 503 });
  const { id } = await ctx.params;
  try {
    const group = await prisma.group.findUnique({ where: { id }, select: { deletedAt: true } });
    if (!group?.deletedAt) return NextResponse.json({ error: "Group not in Trash" }, { status: 404 });

    const ts = group.deletedAt;
    // Restore links trashed within 2 seconds of the group (batch-trashed together)
    await prisma.link.updateMany({
      where: {
        groupId: id,
        deletedAt: { gte: new Date(ts.getTime() - 2000), lte: new Date(ts.getTime() + 2000) },
      },
      data: { deletedAt: null },
    });
    await prisma.group.update({ where: { id }, data: { deletedAt: null } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to restore group" }, { status: 500 });
  }
}

// DELETE — permanently delete a group and ALL its links (regardless of their deletedAt)
export async function DELETE(_req: Request, ctx: Ctx) {
  const envErr = getDatabaseEnvError();
  if (envErr) return NextResponse.json({ error: envErr }, { status: 503 });
  const { id } = await ctx.params;
  try {
    // Delete links first (FK: onDelete Restrict)
    await prisma.link.deleteMany({ where: { groupId: id } });
    await prisma.group.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to permanently delete group" }, { status: 500 });
  }
}
