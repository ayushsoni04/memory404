import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import {
  getCollections,
  getMongoEnvError,
  withMongoTransaction,
} from "@/lib/db/mongodb";
import { GENERAL_GROUP_NAME } from "@/lib/group-constants";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };

// PATCH — restore a group AND all links that were trashed with it (same deletedAt timestamp ±2s)
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
    const restored = await withMongoTransaction(async (session) => {
      const { groups, links } = await getCollections();
      const group = await groups.findOne(
        { _id: id, userId: auth.id, deletedAt: { $ne: null } },
        { session, projection: { deletedAt: 1 } },
      );
      if (!group?.deletedAt) return false;

      const ts = group.deletedAt;
      await links.updateMany(
        {
          groupId: id,
          userId: auth.id,
          deletedAt: {
            $gte: new Date(ts.getTime() - 2000),
            $lte: new Date(ts.getTime() + 2000),
          },
        },
        { $set: { deletedAt: null } },
        { session },
      );
      const result = await groups.updateOne(
        { _id: id, userId: auth.id, deletedAt: ts },
        { $set: { deletedAt: null } },
        { session },
      );
      if (result.matchedCount !== 1) throw new Error("GROUP_RESTORE_CONFLICT");
      return true;
    });
    if (!restored) {
      return NextResponse.json({ error: "Group not in Trash" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to restore group" }, { status: 500 });
  }
}

// DELETE — permanently delete a group and ALL its links (regardless of their deletedAt)
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
    await withMongoTransaction(async (session) => {
      const { groups, links } = await getCollections();
      const group = await groups.findOne(
        { _id: id, userId: auth.id },
        { session, projection: { name: 1 } },
      );
      if (!group || group.name === GENERAL_GROUP_NAME) {
        throw new Error("GROUP_PURGE_FORBIDDEN");
      }
      await links.deleteMany({ groupId: id, userId: auth.id }, { session });
      const result = await groups.deleteOne(
        { _id: id, userId: auth.id },
        { session },
      );
      if (result.deletedCount !== 1) throw new Error("GROUP_PURGE_CONFLICT");
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to permanently delete group" }, { status: 500 });
  }
}
