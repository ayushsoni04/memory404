import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { UNCATEGORIZED_GROUP_NAME } from "@/lib/group-constants";
import {
  getOrCreateUncategorizedGroupId,
  isUncategorizedName,
} from "@/lib/groups";
import { linkTextSearchWhere } from "@/lib/link-search";
import { isValidHttpUrl, linkToApiRow, type LinkApiRow } from "@/lib/links";
import { enrichLinkMetadataInBackground } from "@/lib/enrich-link-metadata";
import { getDatabaseEnvError, prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const envErr = getDatabaseEnvError();
  if (envErr) {
    return NextResponse.json({ error: envErr }, { status: 503 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") ?? searchParams.get("q") ?? "";
    const groupIdParam = searchParams.get("groupId")?.trim() ?? "";
    const legacyGroup = searchParams.get("group")?.trim() ?? "";
    const tagParams = searchParams
      .getAll("tag")
      .flatMap((value) => value.split(","))
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);

    let filterGroupId: string | undefined;
    if (groupIdParam) {
      filterGroupId = groupIdParam;
    } else if (legacyGroup === "uncategorized") {
      const inbox = await prisma.group.findUnique({
        where: { name: UNCATEGORIZED_GROUP_NAME },
        select: { id: true },
      });
      if (inbox) filterGroupId = inbox.id;
    } else if (legacyGroup) {
      filterGroupId = legacyGroup;
    }

    const where: Prisma.LinkWhereInput = {
      AND: [
        search.trim() ? linkTextSearchWhere(search) : {},
        filterGroupId ? { groupId: filterGroupId } : {},
        tagParams.length
          ? { tags: { hasSome: Array.from(new Set(tagParams)) } }
          : {},
      ],
    };

    const rows = await prisma.link.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
    const links: LinkApiRow[] = rows.map(linkToApiRow);
    return NextResponse.json({ links });
  } catch (e) {
    console.error("GET /api/links:", e);
    const hint = e instanceof Error ? e.message : undefined;
    return NextResponse.json(
      {
        error: "Could not load links from the database.",
        hint,
      },
      { status: 500 },
    );
  }
}

type PostBody = {
  url?: string;
  groupId?: unknown;
  newGroupName?: unknown;
  title?: unknown;
  description?: unknown;
  imageUrl?: unknown;
};

async function resolveTargetGroupIdForCreate(body: PostBody): Promise<
  | { ok: true; groupId: string }
  | { ok: false; status: number; error: string }
> {
  const rawNew =
    "newGroupName" in body && body.newGroupName != null
      ? body.newGroupName
      : undefined;
  const newName =
    typeof rawNew === "string" && rawNew.trim() ? rawNew.trim() : null;

  if (newName) {
    if (isUncategorizedName(newName)) {
      const id = await getOrCreateUncategorizedGroupId();
      return { ok: true, groupId: id };
    }
    try {
      const g = await prisma.group.create({
        data: { name: newName },
        select: { id: true },
      });
      return { ok: true, groupId: g.id };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        return {
          ok: false,
          status: 409,
          error: "A group with this name already exists.",
        };
      }
      throw e;
    }
  }

  if ("groupId" in body && body.groupId != null) {
    if (typeof body.groupId !== "string" || !body.groupId.trim()) {
      return {
        ok: false,
        status: 400,
        error: "groupId must be a non-empty string when provided",
      };
    }
    const gid = body.groupId.trim();
    const exists = await prisma.group.findUnique({
      where: { id: gid },
      select: { id: true },
    });
    if (!exists) {
      return { ok: false, status: 400, error: "groupId is invalid" };
    }
    return { ok: true, groupId: gid };
  }

  const fallback = await getOrCreateUncategorizedGroupId();
  return { ok: true, groupId: fallback };
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
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 },
      );
    }

    const rawUrl = body.url;
    if (rawUrl == null || typeof rawUrl !== "string" || !rawUrl.trim()) {
      return NextResponse.json({ error: "url is required" }, { status: 400 });
    }

    const url = rawUrl.trim();
    if (!isValidHttpUrl(url)) {
      return NextResponse.json(
        { error: "url must be a valid http or https URL" },
        { status: 400 },
      );
    }

    const existing = await prisma.link.findUnique({ where: { url } });
    if (existing) {
      return NextResponse.json(
        {
          error: "A link with this URL already exists.",
          existingId: existing.id,
          link: linkToApiRow(existing),
        },
        { status: 409 },
      );
    }

    const resolved = await resolveTargetGroupIdForCreate(body);
    if (!resolved.ok) {
      return NextResponse.json(
        { error: resolved.error },
        { status: resolved.status },
      );
    }

    const titleFromPayload =
      typeof body.title === "string" && body.title.trim()
        ? body.title.trim()
        : null;
    const descriptionFromPayload =
      typeof body.description === "string" && body.description.trim()
        ? body.description.trim()
        : null;
    const imageUrlFromPayload =
      typeof body.imageUrl === "string" && body.imageUrl.trim()
        ? body.imageUrl.trim()
        : null;

    const created = await prisma.link.create({
      data: {
        url,
        title: titleFromPayload ?? url,
        description: descriptionFromPayload,
        imageUrl: imageUrlFromPayload,
        customTitle: null,
        tags: [],
        notes: null,
        groupId: resolved.groupId,
        metadataStatus: "pending",
      },
    });

    void enrichLinkMetadataInBackground(created.id, url);

    return NextResponse.json(
      { link: linkToApiRow(created) },
      { status: 201 },
    );
  } catch (e) {
    console.error("POST /api/links:", e);
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2002") {
        return NextResponse.json(
          { error: "A link with this URL already exists." },
          { status: 409 },
        );
      }
      return NextResponse.json(
        {
          error: "Could not save link.",
          hint: e.message,
          code: e.code,
        },
        { status: 500 },
      );
    }
    return NextResponse.json(
      { error: "Failed to save link" },
      { status: 500 },
    );
  }
}
