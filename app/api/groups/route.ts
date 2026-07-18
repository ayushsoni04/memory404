import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import {
  getMongoEnvError,
  isDuplicateKeyError,
} from "@/lib/db/mongodb";
import {
  createGroup,
  getOrCreateGeneralGroup,
  listGroupsWithPreviews,
  reorderGroups,
} from "@/lib/db/repositories";

export const runtime = "nodejs";

type PostBody = {
  name?: unknown;
  parentGroupId?: unknown;
  insertAt?: unknown;
};

type PatchBody = {
  orderedIds?: unknown;
};

export async function GET() {
  const envErr = getMongoEnvError();
  if (envErr) {
    return NextResponse.json({ error: envErr }, { status: 503 });
  }

  const auth = await requireAuth();
  if (auth instanceof Response) return auth;

  try {
    await getOrCreateGeneralGroup(auth.id);
    const groups = await listGroupsWithPreviews(auth.id);
    return NextResponse.json({
      groups: groups.map((g) => ({
        id: g.id,
        name: g.name,
        sortOrder: g.sortOrder,
        parentGroupId: g.parentGroupId,
        createdAt: g.createdAt.toISOString(),
        linksCount: g.linksCount,
        previewTitles: g.previewTitles,
      })),
    });
  } catch (e) {
    console.error("GET /api/groups:", e);
    return NextResponse.json(
      { error: "Failed to load groups" },
      { status: 500 },
    );
  }
}


export async function POST(request: Request) {
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
    let body: PostBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (typeof body.name !== "string") {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const name = body.name.trim();
    if (!name) {
      return NextResponse.json(
        { error: "name cannot be empty" },
        { status: 400 },
      );
    }

    let parentGroupId: string | null = null;
    if ("parentGroupId" in body && body.parentGroupId != null) {
      if (typeof body.parentGroupId !== "string" || !body.parentGroupId.trim()) {
        return NextResponse.json(
          { error: "parentGroupId must be a non-empty string when provided" },
          { status: 400 },
        );
      }
      parentGroupId = body.parentGroupId.trim();
    }

    const insertAt =
      typeof body.insertAt === "number" &&
      Number.isFinite(body.insertAt) &&
      Number.isInteger(body.insertAt)
        ? body.insertAt
        : undefined;
    const created = await createGroup({
      userId: auth.id,
      name,
      parentGroupId,
      insertAt,
    });

    return NextResponse.json(
      {
        group: {
          id: created.id,
          name: created.name,
          sortOrder: created.sortOrder,
          parentGroupId: created.parentGroupId,
          createdAt: created.createdAt.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (e) {
    if (e instanceof Error && e.message === "INVALID_PARENT_GROUP") {
      return NextResponse.json(
        { error: "parentGroupId is invalid" },
        { status: 400 },
      );
    }
    if (isDuplicateKeyError(e)) {
      return NextResponse.json(
        { error: "A group with this name already exists." },
        { status: 409 },
      );
    }
    console.error("POST /api/groups:", e);
    return NextResponse.json(
      { error: "Failed to create group" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
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
    let body: PatchBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (!Array.isArray(body.orderedIds) || body.orderedIds.length === 0) {
      return NextResponse.json(
        { error: "orderedIds must be a non-empty array of group ids" },
        { status: 400 },
      );
    }

    const orderedIds = body.orderedIds.filter(
      (id): id is string => typeof id === "string" && id.trim().length > 0,
    );
    if (orderedIds.length !== body.orderedIds.length) {
      return NextResponse.json(
        { error: "orderedIds must contain only non-empty strings" },
        { status: 400 },
      );
    }
    if (new Set(orderedIds).size !== orderedIds.length) {
      return NextResponse.json(
        { error: "orderedIds must not contain duplicates" },
        { status: 400 },
      );
    }

    const result = await reorderGroups(auth.id, orderedIds);
    if (result === "invalid") {
      return NextResponse.json(
        { error: "orderedIds must include every group exactly once" },
        { status: 400 },
      );
    }

    if (result === "general-not-first") {
      return NextResponse.json(
        { error: "General must remain first" },
        { status: 400 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("PATCH /api/groups:", e);
    return NextResponse.json(
      { error: "Failed to reorder groups" },
      { status: 500 },
    );
  }
}
