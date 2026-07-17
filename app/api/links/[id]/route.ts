import { Prisma } from "@prisma/client";
import { after, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { enrichLinkMetadataInBackground } from "@/lib/enrich-link-metadata";
import { linkToApiRow } from "@/lib/links";
import { getDatabaseEnvError, prisma } from "@/lib/prisma";

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
  const envErr = getDatabaseEnvError();
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
      const existing = await prisma.link.findUnique({
        where: { id, userId: auth.id },
        select: { id: true, url: true },
      });
      if (!existing) {
        return NextResponse.json({ error: "Link not found" }, { status: 404 });
      }
      const pending = await prisma.link.update({
        where: { id },
        data: { metadataStatus: "pending" },
      });
      after(() => enrichLinkMetadataInBackground(existing.id, existing.url));
      return NextResponse.json({ link: linkToApiRow(pending) });
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
        const groupExists = await prisma.group.findUnique({
          where: { id: normalizedGroupId, userId: auth.id },
          select: { id: true },
        });
        if (!groupExists) {
          return NextResponse.json(
            { error: "groupId is invalid" },
            { status: 400 },
          );
        }
        updateData.group = { connect: { id: normalizedGroupId } };
      } else {
        return NextResponse.json(
          { error: "groupId must be a non-empty string" },
          { status: 400 },
        );
      }
    }

    const updated = await prisma.link.update({
      where: { id, userId: auth.id },
      data: updateData,
    });

    return NextResponse.json({ link: linkToApiRow(updated) });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2025"
    ) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }
    console.error("PATCH /api/links/[id]:", e);
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json(
        {
          error: "Could not update link.",
          hint: e.message,
          code: e.code,
        },
        { status: 500 },
      );
    }
    return NextResponse.json(
      { error: "Failed to update link" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const envErr = getDatabaseEnvError();
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
    const trashed = await prisma.link.update({
      where: { id, userId: auth.id },
      data: { deletedAt: new Date() },
    });
    return NextResponse.json({ ok: true, link: linkToApiRow(trashed) });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2025"
    ) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }
    console.error("DELETE /api/links/[id]:", e);
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json(
        {
          error: "Could not delete link.",
          hint: e.message,
          code: e.code,
        },
        { status: 500 },
      );
    }
    return NextResponse.json(
      { error: "Failed to delete link" },
      { status: 500 },
    );
  }
}

