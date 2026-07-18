import { after, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getMongoEnvError } from "@/lib/db/mongodb";
import {
  findGroup,
  findLink,
  updateLink,
} from "@/lib/db/repositories";
import type { LinkDocument } from "@/lib/db/types";
import { enrichLinkMetadataInBackground } from "@/lib/enrich-link-metadata";
import { linkToApiRow } from "@/lib/links";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

type PatchBody = {
  customTitle?: unknown;
  tags?: unknown;
  notes?: unknown;
  groupId?: unknown;
  refreshPreview?: unknown;
};

export async function PATCH(request: Request, context: RouteContext) {
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

    let body: PatchBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 },
      );
    }

    const hasSupportedField =
      "customTitle" in body ||
      "tags" in body ||
      "notes" in body ||
      "groupId" in body ||
      body.refreshPreview === true;

    if (!hasSupportedField) {
      return NextResponse.json(
        {
          error:
            "At least one of customTitle, tags, notes, groupId, refreshPreview is required",
        },
        { status: 400 },
      );
    }

    if (body.refreshPreview === true) {
      const existing = await findLink({ _id: id, userId: auth.id });
      if (!existing) {
        return NextResponse.json({ error: "Link not found" }, { status: 404 });
      }
      const pending = await updateLink(
        { _id: id, userId: auth.id },
        { $set: { metadataStatus: "pending" } },
      );
      if (!pending) {
        return NextResponse.json({ error: "Link not found" }, { status: 404 });
      }
      after(() => enrichLinkMetadataInBackground(existing.id, existing.url));
      return NextResponse.json({ link: linkToApiRow(pending) });
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
        return NextResponse.json(
          { error: "customTitle must be a string or null" },
          { status: 400 },
        );
      }
    }

    if ("tags" in body) {
      if (!Array.isArray(body.tags)) {
        return NextResponse.json(
          { error: "tags must be an array of strings" },
          { status: 400 },
        );
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
        return NextResponse.json(
          { error: "notes must be a string or null" },
          { status: 400 },
        );
      }
    }

    if ("groupId" in body) {
      const rawGroupId = body.groupId;
      if (rawGroupId === null) {
        return NextResponse.json(
          { error: "groupId is required on every link; use a valid group id to move" },
          { status: 400 },
        );
      }
      if (typeof rawGroupId === "string" && rawGroupId.trim()) {
        const normalizedGroupId = rawGroupId.trim();
        const groupExists = await findGroup({
          _id: normalizedGroupId,
          userId: auth.id,
          deletedAt: null,
        });
        if (!groupExists) {
          return NextResponse.json(
            { error: "groupId is invalid" },
            { status: 400 },
          );
        }
        updateData.groupId = normalizedGroupId;
      } else {
        return NextResponse.json(
          { error: "groupId must be a non-empty string" },
          { status: 400 },
        );
      }
    }

    const updated = await updateLink(
      { _id: id, userId: auth.id },
      { $set: updateData },
    );
    if (!updated) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }

    return NextResponse.json({ link: linkToApiRow(updated) });
  } catch (e) {
    console.error("PATCH /api/links/[id]:", e);
    return NextResponse.json(
      { error: "Failed to update link" },
      { status: 500 },
    );
  }
}

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

    // Soft-delete: move to Trash instead of permanently removing
    const trashed = await updateLink(
      { _id: id, userId: auth.id },
      { $set: { deletedAt: new Date() } },
    );
    if (!trashed) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, link: linkToApiRow(trashed) });
  } catch (e) {
    console.error("DELETE /api/links/[id]:", e);
    return NextResponse.json(
      { error: "Failed to delete link" },
      { status: 500 },
    );
  }
}

