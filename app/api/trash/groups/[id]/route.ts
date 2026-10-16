import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import {
  getCollections,
  getMongoEnvError,
  isDuplicateKeyError,
  withMongoTransaction,
} from "@/lib/db/mongodb";
import { GENERAL_GROUP_NAME } from "@/lib/group-constants";
import { groupNameConflict } from "@/lib/group-name";
import {
  GROUP_NOT_IN_TRASH,
  GROUP_RESTORE_TAKEN,
  groupRestoreIssue,
} from "@/lib/trash-restore";

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
    const { groups } = await getCollections();
    const group = await groups.findOne(
      { _id: id, userId: auth.id },
      { projection: { name: 1, deletedAt: 1 } },
    );
    let activeName: string | null = null;
    if (group?.deletedAt != null) {
      const active = await groups
        .find({ userId: auth.id, deletedAt: null }, { projection: { name: 1 } })
        .toArray();
      if (
        groupNameConflict(
          group.name,
          active.map((row) => ({ name: row.name, deletedAt: null })),
        ) === "active"
      ) {
        const target = group.name.trim().toLowerCase();
        activeName =
          active.find((row) => row.name.trim().toLowerCase() === target)?.name ??
          group.name;
      }
    }
    const issue = groupRestoreIssue({
      found: group != null,
      inTrash: group?.deletedAt != null,
      activeName,
    });
    if (issue) {
      return NextResponse.json({ error: issue.message }, { status: issue.status });
    }

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
      return NextResponse.json({ error: GROUP_NOT_IN_TRASH }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return NextResponse.json({ error: GROUP_RESTORE_TAKEN }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to restore group" }, { status: 500 });
  }
}

// DELETE — permanently delete a group that is already in Trash, and its links.
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
        { _id: id, userId: auth.id, deletedAt: { $ne: null } },
        { session, projection: { name: 1 } },
      );
      if (!group) throw new Error("GROUP_NOT_IN_TRASH");
      if (group.name === GENERAL_GROUP_NAME) {
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
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "GROUP_NOT_IN_TRASH") {
      return NextResponse.json({ error: "Group is not in Trash" }, { status: 404 });
    }
    if (message === "GROUP_PURGE_FORBIDDEN") {
      return NextResponse.json(
        { error: "This group cannot be deleted" },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Failed to permanently delete group" }, { status: 500 });
  }
}
