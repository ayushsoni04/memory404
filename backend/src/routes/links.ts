import { Prisma } from "@prisma/client";
import { Router } from "express";
import { UNCATEGORIZED_GROUP_NAME } from "@/lib/group-constants";
import {
  getOrCreateUncategorizedGroupId,
  isUncategorizedName,
} from "@/lib/groups";
import { linkTextSearchWhere } from "@/lib/link-search";
import { isValidHttpUrl, linkToApiRow, type LinkApiRow } from "@/lib/links";
import { enrichLinkMetadataInBackground } from "@/lib/enrich-link-metadata";
import { enrichLinkMetadataInBackground } from "@/lib/enrich-link-metadata";
import { getDatabaseEnvError, prisma } from "@/lib/prisma";

export const linksRouter = Router();

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

linksRouter.get("/", async (req, res) => {
  const envErr = getDatabaseEnvError();
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
    const tagParams = (Array.isArray(req.query.tag) ? req.query.tag : req.query.tag ? [req.query.tag] : [])
      .flatMap((value) => String(value).split(","))
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
    res.json({ links });
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
  const envErr = getDatabaseEnvError();
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

    const existing = await prisma.link.findUnique({ where: { url } });
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

    res.status(201).json({ link: linkToApiRow(created) });
  } catch (e) {
    console.error("POST /api/links:", e);
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2002") {
        res.status(409).json({ error: "A link with this URL already exists." });
        return;
      }
      res.status(500).json({
        error: "Could not save link.",
        hint: e.message,
        code: e.code,
      });
      return;
    }
    res.status(500).json({ error: "Failed to save link" });
  }
});

linksRouter.patch("/:id", async (req, res) => {
  const envErr = getDatabaseEnvError();
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
      const existing = await prisma.link.findUnique({
        where: { id },
        select: { id: true, url: true },
      });
      if (!existing) {
        res.status(404).json({ error: "Link not found" });
        return;
      }
      const pending = await prisma.link.update({
        where: { id },
        data: { metadataStatus: "pending" },
      });
      void enrichLinkMetadataInBackground(existing.id, existing.url);
      res.json({ link: linkToApiRow(pending) });
      return;
    }

    const updateData: Prisma.LinkUpdateInput = {};

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
        const groupExists = await prisma.group.findUnique({
          where: { id: normalizedGroupId },
          select: { id: true },
        });
        if (!groupExists) {
          res.status(400).json({ error: "groupId is invalid" });
          return;
        }
        updateData.group = { connect: { id: normalizedGroupId } };
      } else {
        res.status(400).json({ error: "groupId must be a non-empty string" });
        return;
      }
    }

    const updated = await prisma.link.update({
      where: { id },
      data: updateData,
    });

    res.json({ link: linkToApiRow(updated) });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2025"
    ) {
      res.status(404).json({ error: "Link not found" });
      return;
    }
    console.error("PATCH /api/links/:id:", e);
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      res.status(500).json({
        error: "Could not update link.",
        hint: e.message,
        code: e.code,
      });
      return;
    }
    res.status(500).json({ error: "Failed to update link" });
  }
});

linksRouter.delete("/:id", async (req, res) => {
  const envErr = getDatabaseEnvError();
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
    await prisma.link.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2025"
    ) {
      res.status(404).json({ error: "Link not found" });
      return;
    }
    console.error("DELETE /api/links/:id:", e);
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      res.status(500).json({
        error: "Could not delete link.",
        hint: e.message,
        code: e.code,
      });
      return;
    }
    res.status(500).json({ error: "Failed to delete link" });
  }
});
