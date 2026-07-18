import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getCollections, getMongoEnvError, withMongoTransaction } from "@/lib/db/mongodb";
import { GENERAL_GROUP_NAME } from "@/lib/group-constants";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, context: RouteContext) {
  if (process.env.MAINTENANCE_MODE === "true") {
    return NextResponse.json(
      { error: "Service is temporarily unavailable during maintenance." },
      { status: 503 },
    );
  }
  const envErr = getMongoEnvError();
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

    const { groups, links } = await getCollections();
    const group = await groups.findOne(
      { _id: id, userId: auth.id },
      { projection: { _id: 1, name: 1, deletedAt: 1 } },
    );

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

    await withMongoTransaction(async (session) => {
      // Use one timestamp so restoring the group can identify links deleted with it.
      await links.updateMany(
        { groupId: id, userId: auth.id, deletedAt: null },
        { $set: { deletedAt: now } },
        { session },
      );
      const result = await groups.updateOne(
        { _id: id, userId: auth.id, deletedAt: null },
        { $set: { deletedAt: now } },
        { session },
      );
      if (result.matchedCount !== 1) {
        throw new Error("GROUP_DELETE_CONFLICT");
      }
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/groups/[id]:", e);
    return NextResponse.json({ error: "Failed to move group to Trash" }, { status: 500 });
  }
}
