import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import {
  getCollections,
  getMongoEnvError,
  isDuplicateKeyError,
} from "@/lib/db/mongodb";
import {
  LINK_ALREADY_SAVED,
  LINK_NOT_IN_TRASH,
  linkRestoreIssue,
} from "@/lib/trash-restore";

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
    const link = await links.findOne(
      { _id: id, userId: auth.id },
      { projection: { url: 1, deletedAt: 1 } },
    );
    const urlTaken =
      link?.deletedAt != null
        ? await links.findOne(
            {
              _id: { $ne: id },
              userId: auth.id,
              url: link.url,
              deletedAt: null,
            },
            { projection: { _id: 1 } },
          )
        : null;
    const issue = linkRestoreIssue({
      found: link != null,
      inTrash: link?.deletedAt != null,
      urlTaken: urlTaken != null,
    });
    if (issue) {
      return NextResponse.json({ error: issue.message }, { status: issue.status });
    }

    const result = await links.updateOne(
      { _id: id, userId: auth.id, deletedAt: { $ne: null } },
      { $set: { deletedAt: null } },
    );
    if (result.matchedCount !== 1) {
      return NextResponse.json({ error: LINK_NOT_IN_TRASH }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return NextResponse.json({ error: LINK_ALREADY_SAVED }, { status: 409 });
    }
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
    const result = await links.deleteOne({
      _id: id,
      userId: auth.id,
      deletedAt: { $ne: null },
    });
    if (result.deletedCount !== 1) {
      return NextResponse.json({ error: "Link is not in Trash" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to permanently delete link" }, { status: 500 });
  }
}
