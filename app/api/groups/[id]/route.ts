import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { GENERAL_GROUP_NAME } from "@/lib/group-constants";
import { getDatabaseEnvError, prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, context: RouteContext) {
  const envErr = getDatabaseEnvError();
  if (envErr) {
    return NextResponse.json({ error: envErr }, { status: 503 });
  }

  const auth = await requireAuth();
  if (auth instanceof Response) return auth;

  try {
    const { id } = await context.params;
    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const group = await prisma.group.findUnique({
      where: { id, userId: auth.id },
      select: { id: true, name: true, deletedAt: true },
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }
    if (group.deletedAt) {
      return NextResponse.json({ error: "Group is already in Trash" }, { status: 409 });
    }
    if (group.name === GENERAL_GROUP_NAME) {
      return NextResponse.json({ error: "The General group cannot be deleted" }, { status: 403 });
    }

    const now = new Date();

    // Soft-delete all active links in this group at the SAME timestamp so we can
    // restore them together when the group is restored.
    await prisma.link.updateMany({
      where: { groupId: id, userId: auth.id, deletedAt: null },
      data: { deletedAt: now },
    });

    // Soft-delete the group itself
    await prisma.group.update({
      where: { id, userId: auth.id },
      data: { deletedAt: now },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/groups/[id]:", e);
    return NextResponse.json({ error: "Failed to move group to Trash" }, { status: 500 });
  }
}
