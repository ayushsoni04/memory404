import type { Filter } from "mongodb";
import { after, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import {
  getMongoEnvError,
  isDuplicateKeyError,
} from "@/lib/db/mongodb";
import {
  createGroup,
  createLink,
  findGroup,
  findLink,
  findLinks,
} from "@/lib/db/repositories";
import type { LinkDocument } from "@/lib/db/types";
import { GENERAL_GROUP_NAME } from "@/lib/group-constants";
import {
  getOrCreateGeneralGroupId,
  isGeneralName,
} from "@/lib/groups";
import { linkTextSearchWhere } from "@/lib/link-search";
import { isValidHttpUrl, linkToApiRow } from "@/lib/links";
import {
  decodeLinkCursor,
  LINKS_PAGE_MAX,
  linksCursorWhere,
  parseLinksLimit,
  toLinksPage,
} from "@/lib/links-pagination";
import { enrichLinkMetadataInBackground } from "@/lib/enrich-link-metadata";
import { uploadImageToCloudinary } from "@/lib/cloudinary";
import { startTimer } from "@/lib/perf";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const envErr = getMongoEnvError();
  if (envErr) {
    return NextResponse.json({ error: envErr }, { status: 503 });
  }

  const auth = await requireAuth();
  if (auth instanceof Response) return auth;

  const timer = startTimer();
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") ?? searchParams.get("q") ?? "";
    const groupIdParam = searchParams.get("groupId")?.trim() ?? "";
    const legacyGroup = searchParams.get("group")?.trim() ?? "";
    const cursorParam = searchParams.get("cursor")?.trim() ?? "";
    const idsParam = searchParams
      .getAll("ids")
      .flatMap((value) => value.split(","))
      .map((value) => value.trim())
      .filter(Boolean);
    const tagParams = searchParams
      .getAll("tag")
      .flatMap((value) => value.split(","))
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);
    const limit = parseLinksLimit(searchParams.get("limit"));

    // Lightweight status refresh for specific pending rows (no full list reload).
    if (idsParam.length) {
      const uniqueIds = Array.from(new Set(idsParam)).slice(0, LINKS_PAGE_MAX);
      const rows = await findLinks(
        { _id: { $in: uniqueIds }, userId: auth.id, deletedAt: null },
        { sort: { createdAt: -1, _id: -1 } },
      );
      timer.mark("query");
      const idsPayload = {
        links: rows.map(linkToApiRow),
        nextCursor: null,
        hasMore: false,
      };
      timer.mark("serialize");
      timer.done("GET /api/links[ids]");
      return NextResponse.json(idsPayload);
    }

    let filterGroupId: string | undefined;
    if (groupIdParam) {
      filterGroupId = groupIdParam;
    } else if (legacyGroup === "uncategorized" || legacyGroup === "general") {
      const inbox = await findGroup({
        userId: auth.id,
        name: GENERAL_GROUP_NAME,
      });
      if (inbox) filterGroupId = inbox.id;
    } else if (legacyGroup) {
      filterGroupId = legacyGroup;
    }

    let cursor = null as ReturnType<typeof decodeLinkCursor>;
    if (cursorParam) {
      cursor = decodeLinkCursor(cursorParam);
      if (!cursor) {
        return NextResponse.json(
          { error: "Invalid cursor" },
          { status: 400 },
        );
      }
    }

    const where: Filter<LinkDocument> = {
      $and: [
        { userId: auth.id, deletedAt: null },
        search.trim() ? linkTextSearchWhere(search) : {},
        filterGroupId ? { groupId: filterGroupId } : {},
        tagParams.length
          ? { tags: { $in: Array.from(new Set(tagParams)) } }
          : {},
        linksCursorWhere(cursor),
      ],
    };

    const rows = await findLinks(where, {
      sort: { createdAt: -1, _id: -1 },
      limit: limit + 1,
    });
    timer.mark("query");
    const payload = toLinksPage(rows, limit);
    timer.mark("serialize");
    timer.done("GET /api/links");
    return NextResponse.json(payload, {
      headers: {
        // Brief private SWR window — keeps feed snappy without serving stale shared CDN caches.
        "Cache-Control": "private, max-age=10, stale-while-revalidate=30",
      },
    });
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

async function resolveTargetGroupIdForCreate(
  userId: string,
  body: PostBody,
): Promise<
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
    if (isGeneralName(newName)) {
      const id = await getOrCreateGeneralGroupId(userId);
      return { ok: true, groupId: id };
    }
    try {
      const g = await createGroup({ userId, name: newName });
      return { ok: true, groupId: g.id };
    } catch (e) {
      if (isDuplicateKeyError(e)) {
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
    const exists = await findGroup({ _id: gid, userId, deletedAt: null });
    if (!exists) {
      return { ok: false, status: 400, error: "groupId is invalid" };
    }
    return { ok: true, groupId: gid };
  }

  const fallback = await getOrCreateGeneralGroupId(userId);
  return { ok: true, groupId: fallback };
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

  const limit = rateLimit(`links:create:${auth.id}`, 30, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many links created, please slow down." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
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

    const existing = await findLink({ userId: auth.id, url });
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

    const resolved = await resolveTargetGroupIdForCreate(auth.id, body);
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

    let imageUrl = imageUrlFromPayload;
    if (imageUrl) {
      const cloudinaryUrl = await uploadImageToCloudinary(imageUrl);
      if (cloudinaryUrl) {
        imageUrl = cloudinaryUrl;
      }
    }

    const created = await createLink({
      userId: auth.id,
      url,
      title: titleFromPayload ?? url,
      description: descriptionFromPayload,
      imageUrl,
      groupId: resolved.groupId,
    });

    // Detach from the request so the client isn't held open by meta/screenshot work.
    after(() => enrichLinkMetadataInBackground(created.id, url));

    return NextResponse.json(
      { link: linkToApiRow(created) },
      { status: 201 },
    );
  } catch (e) {
    console.error("POST /api/links:", e);
    if (isDuplicateKeyError(e)) {
      return NextResponse.json(
        { error: "A link with this URL already exists." },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "Failed to save link" },
      { status: 500 },
    );
  }
}
