import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { GENERAL_GROUP_NAME } from "@/lib/group-constants";
import { getOrCreateGeneralGroupId } from "@/lib/groups";
import { getDatabaseEnvError, prisma } from "@/lib/prisma";

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
  const envErr = getDatabaseEnvError();
  if (envErr) {
    return NextResponse.json({ error: envErr }, { status: 503 });
  }

  try {
    await getOrCreateGeneralGroupId();
    const groups = await prisma.group.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: {
        _count: { select: { links: true } },
        links: {
          orderBy: { createdAt: "desc" },
          take: 3,
          select: {
            id: true,
            title: true,
            customTitle: true,
            url: true,
          },
        },
      },
    });
    return NextResponse.json({
      groups: groups.map((g) => ({
        id: g.id,
        name: g.name,
        sortOrder: g.sortOrder,
        parentGroupId: g.parentGroupId,
        createdAt: g.createdAt.toISOString(),
        linksCount: g._count.links,
        previewTitles: g.links.map((l) => l.customTitle ?? l.title ?? l.url),
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
  const envErr = getDatabaseEnvError();
  if (envErr) {
    return NextResponse.json({ error: envErr }, { status: 503 });
  }

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
      const parentExists = await prisma.group.findUnique({
        where: { id: parentGroupId },
        select: { id: true },
      });
      if (!parentExists) {
        return NextResponse.json(
          { error: "parentGroupId is invalid" },
          { status: 400 },
        );
      }
    }

    const general = await prisma.group.findUnique({
      where: { name: GENERAL_GROUP_NAME },
      select: { id: true },
    });
    const maxOrder = await prisma.group.aggregate({
      _max: { sortOrder: true },
    });
    const nextAppend = (maxOrder._max.sortOrder ?? -1) + 1;

    let sortOrder = nextAppend;
    if (
      typeof body.insertAt === "number" &&
      Number.isFinite(body.insertAt) &&
      Number.isInteger(body.insertAt)
    ) {
      const count = await prisma.group.count();
      const minimumInsertAt = general ? 1 : 0;
      const insertAt = Math.max(
        minimumInsertAt,
        Math.min(body.insertAt, count),
      );
      sortOrder = insertAt;
      await prisma.group.updateMany({
        where: { sortOrder: { gte: insertAt } },
        data: { sortOrder: { increment: 1 } },
      });
    }

    const created = await prisma.group.create({
      data: { name, parentGroupId, sortOrder },
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
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
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
  const envErr = getDatabaseEnvError();
  if (envErr) {
    return NextResponse.json({ error: envErr }, { status: 503 });
  }

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

    const existing = await prisma.group.findMany({
      select: { id: true, name: true },
    });
    const existingIds = new Set(existing.map((g) => g.id));
    if (
      orderedIds.length !== existingIds.size ||
      orderedIds.some((id) => !existingIds.has(id))
    ) {
      return NextResponse.json(
        { error: "orderedIds must include every group exactly once" },
        { status: 400 },
      );
    }

    const general = existing.find((group) => group.name === GENERAL_GROUP_NAME);
    if (general && orderedIds[0] !== general.id) {
      return NextResponse.json(
        { error: "General must remain first" },
        { status: 400 },
      );
    }

    // Single batched UPDATE via unnest — O(1) DB round-trips instead of N.
    // Builds: UPDATE groups SET sort_order = v.idx FROM (SELECT unnest($ids), generate_subscripts-1) WHERE id = v.id
    await prisma.$executeRaw`
      UPDATE "groups"
      SET "sort_order" = v.idx
      FROM (
        SELECT
          unnest(${orderedIds}::uuid[]) AS gid,
          (generate_subscripts(${orderedIds}::uuid[], 1) - 1) AS idx
      ) AS v
      WHERE "groups"."id" = v.gid
    `;

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("PATCH /api/groups:", e);
    return NextResponse.json(
      { error: "Failed to reorder groups" },
      { status: 500 },
    );
  }
}
