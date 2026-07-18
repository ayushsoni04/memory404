import { Router, type RequestHandler } from "express";
import type { Filter } from "mongodb";
import { DEV_USER_ID } from "@/lib/dev-user";
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
  getOrCreateGeneralGroup,
  updateLink,
} from "@/lib/db/repositories";
import type { LinkDocument } from "@/lib/db/types";
import { GENERAL_GROUP_NAME } from "@/lib/group-constants";
import { isGeneralName } from "@/lib/groups";
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

// No session mechanism exists between this Express API and the Next.js app
// (different origins), so every request is attributed to the same seeded
// dev user. Swap for real per-request auth once cross-origin auth ships.
const userId = DEV_USER_ID;

export const linksRouter = Router();

const guardMutationsDuringMaintenance: RequestHandler = (req, res, next) => {
  if (
    ["POST", "PUT", "PATCH", "DELETE"].includes(req.method) &&
    process.env.MAINTENANCE_MODE?.trim().toLowerCase() === "true"
  ) {
    res.status(503).json({ error: "Service is temporarily in maintenance mode." });
    return;
  }
  next();
};

linksRouter.use(guardMutationsDuringMaintenance);

type PostBody = {
  url?: string;
  groupId?: unknown;
  newGroupName?: unknown;
  title?: unknown;
  description?: unknown;
  imageUrl?: unknown;
};

type PatchBody = {
  customTitle?: unknown;
  tags?: unknown;
  notes?: unknown;
  groupId?: unknown;
  refreshPreview?: unknown;
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
    if (isGeneralName(newName)) {
      const id = await getOrCreateGeneralGroup(userId);
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
    const exists = await findGroup({
      _id: gid,
      userId,
      deletedAt: null,
    });
    if (!exists) {
      return { ok: false, status: 400, error: "groupId is invalid" };
    }
    return { ok: true, groupId: gid };
  }

  const fallback = await getOrCreateGeneralGroup(userId);
  return { ok: true, groupId: fallback };
}

linksRouter.get("/", async (req, res) => {
  const envErr = getMongoEnvError();
  if (envErr) {
    res.status(503).json({ error: envErr });
    return;
  }

  try {
    const search =
      (typeof req.query.search === "string" ? req.query.search : "") ||
      (typeof req.query.q === "string" ? req.query.q : "") ||
      "";
    const groupIdParam =
      typeof req.query.groupId === "string" ? req.query.groupId.trim() : "";
    const legacyGroup =
      typeof req.query.group === "string" ? req.query.group.trim() : "";
    const cursorParam =
      typeof req.query.cursor === "string" ? req.query.cursor.trim() : "";
    const limit = parseLinksLimit(
      typeof req.query.limit === "string" ? req.query.limit : undefined,
    );
    const idsParam = (
      Array.isArray(req.query.ids)
        ? req.query.ids
        : req.query.ids
          ? [req.query.ids]
          : []
    )
      .flatMap((value) => String(value).split(","))
      .map((value) => value.trim())
      .filter(Boolean);
    const tagParams = (
      Array.isArray(req.query.tag)
        ? req.query.tag
        : req.query.tag
          ? [req.query.tag]
          : []
    )
      .flatMap((value) => String(value).split(","))
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);

    if (idsParam.length) {
      const uniqueIds: string[] = Array.from(new Set(idsParam.map(String))).slice(
        0,
        LINKS_PAGE_MAX,
      );
      const rows = await findLinks(
        { _id: { $in: uniqueIds }, userId, deletedAt: null },
        { sort: { createdAt: -1, _id: -1 } },
      );
      res.json({
        links: rows.map(linkToApiRow),
        nextCursor: null,
        hasMore: false,
      });
      return;
    }

    let filterGroupId: string | undefined;
    if (groupIdParam) {
      filterGroupId = groupIdParam;
    } else if (legacyGroup === "uncategorized" || legacyGroup === "general") {
      const inbox = await findGroup({
        userId,
        name: GENERAL_GROUP_NAME,
        deletedAt: null,
      });
      if (inbox) filterGroupId = inbox.id;
    } else if (legacyGroup) {
      filterGroupId = legacyGroup;
    }

    let cursor = null as ReturnType<typeof decodeLinkCursor>;
    if (cursorParam) {
      cursor = decodeLinkCursor(cursorParam);
      if (!cursor) {
        res.status(400).json({ error: "Invalid cursor" });
        return;
      }
    }

    const where: Filter<LinkDocument> = {
      $and: [
        { userId, deletedAt: null },
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
    res.json(toLinksPage(rows, limit));
  } catch (e) {
    console.error("GET /api/links:", e);
    const hint = e instanceof Error ? e.message : undefined;
    res.status(500).json({
      error: "Could not load links from the database.",
      hint,
    });
  }
});

linksRouter.post("/", async (req, res) => {
  const envErr = getMongoEnvError();
  if (envErr) {
    res.status(503).json({ error: envErr });
    return;
  }

  try {
    const body = req.body as PostBody;
    const rawUrl = body.url;
    if (rawUrl == null || typeof rawUrl !== "string" || !rawUrl.trim()) {
      res.status(400).json({ error: "url is required" });
      return;
    }

    const url = rawUrl.trim();
    if (!isValidHttpUrl(url)) {
      res.status(400).json({ error: "url must be a valid http or https URL" });
      return;
    }

    const existing = await findLink({ userId, url });
    if (existing) {
      res.status(409).json({
        error: "A link with this URL already exists.",
        existingId: existing.id,
        link: linkToApiRow(existing),
      });
      return;
    }

    const resolved = await resolveTargetGroupIdForCreate(body);
    if (!resolved.ok) {
      res.status(resolved.status).json({ error: resolved.error });
      return;
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

    const created = await createLink({
      userId,
      url,
      title: titleFromPayload ?? url,
      description: descriptionFromPayload,
      imageUrl: imageUrlFromPayload,
      groupId: resolved.groupId,
    });

    void enrichLinkMetadataInBackground(created.id, url);

    res.status(201).json({ link: linkToApiRow(created) });
  } catch (e) {
    console.error("POST /api/links:", e);
    if (isDuplicateKeyError(e)) {
      res.status(409).json({ error: "A link with this URL already exists." });
      return;
    }
    res.status(500).json({ error: "Failed to save link" });
  }
});

linksRouter.patch("/:id", async (req, res) => {
  const envErr = getMongoEnvError();
  if (envErr) {
    res.status(503).json({ error: envErr });
    return;
  }

  const id = req.params.id;
  if (!id) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  try {
    const body = req.body as PatchBody;
    const hasSupportedField =
      "customTitle" in body ||
      "tags" in body ||
      "notes" in body ||
      "groupId" in body ||
      body.refreshPreview === true;

    if (!hasSupportedField) {
      res.status(400).json({
        error:
          "At least one of customTitle, tags, notes, groupId, refreshPreview is required",
      });
      return;
    }

    if (body.refreshPreview === true) {
      const existing = await findLink({ _id: id, userId, deletedAt: null });
      if (!existing) {
        res.status(404).json({ error: "Link not found" });
        return;
      }
      const pending = await updateLink(
        { _id: id, userId, deletedAt: null },
        { $set: { metadataStatus: "pending" } },
      );
      if (!pending) {
        res.status(404).json({ error: "Link not found" });
        return;
      }
      void enrichLinkMetadataInBackground(existing.id, existing.url);
      res.json({ link: linkToApiRow(pending) });
      return;
    }

    const updateData: Partial<
      Pick<LinkDocument, "customTitle" | "tags" | "notes" | "groupId">
    > = {};

    if ("customTitle" in body) {
      const raw = body.customTitle;
      if (raw === null) {
        updateData.customTitle = null;
      } else if (typeof raw === "string") {
        const t = raw.trim();
        updateData.customTitle = t.length ? t : null;
      } else {
        res.status(400).json({ error: "customTitle must be a string or null" });
        return;
      }
    }

    if ("tags" in body) {
      if (!Array.isArray(body.tags)) {
        res.status(400).json({ error: "tags must be an array of strings" });
        return;
      }
      const normalizedTags = Array.from(
        new Set(
          body.tags
            .filter((tag): tag is string => typeof tag === "string")
            .map((tag) => tag.trim().toLowerCase())
            .filter(Boolean),
        ),
      );
      updateData.tags = normalizedTags;
    }

    if ("notes" in body) {
      const rawNotes = body.notes;
      if (rawNotes === null) {
        updateData.notes = null;
      } else if (typeof rawNotes === "string") {
        const n = rawNotes.trim();
        updateData.notes = n.length ? n : null;
      } else {
        res.status(400).json({ error: "notes must be a string or null" });
        return;
      }
    }

    if ("groupId" in body) {
      const rawGroupId = body.groupId;
      if (rawGroupId === null) {
        res.status(400).json({
          error: "groupId is required on every link; use a valid group id to move",
        });
        return;
      }
      if (typeof rawGroupId === "string" && rawGroupId.trim()) {
        const normalizedGroupId = rawGroupId.trim();
        const groupExists = await findGroup({
          _id: normalizedGroupId,
          userId,
          deletedAt: null,
        });
        if (!groupExists) {
          res.status(400).json({ error: "groupId is invalid" });
          return;
        }
        updateData.groupId = normalizedGroupId;
      } else {
        res.status(400).json({ error: "groupId must be a non-empty string" });
        return;
      }
    }

    const updated = await updateLink(
      { _id: id, userId, deletedAt: null },
      { $set: updateData },
    );
    if (!updated) {
      res.status(404).json({ error: "Link not found" });
      return;
    }

    res.json({ link: linkToApiRow(updated) });
  } catch (e) {
    console.error("PATCH /api/links/:id:", e);
    res.status(500).json({ error: "Failed to update link" });
  }
});

linksRouter.delete("/:id", async (req, res) => {
  const envErr = getMongoEnvError();
  if (envErr) {
    res.status(503).json({ error: envErr });
    return;
  }

  const id = req.params.id;
  if (!id) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  try {
    const trashed = await updateLink(
      { _id: id, userId, deletedAt: null },
      { $set: { deletedAt: new Date() } },
    );
    if (!trashed) {
      res.status(404).json({ error: "Link not found" });
      return;
    }
    res.json({ ok: true, link: linkToApiRow(trashed) });
  } catch (e) {
    console.error("DELETE /api/links/:id:", e);
    res.status(500).json({ error: "Failed to delete link" });
  }
});
