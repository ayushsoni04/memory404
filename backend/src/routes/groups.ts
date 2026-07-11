import { Prisma } from "@prisma/client";
import { Router } from "express";
import { getOrCreateUncategorizedGroupId } from "@/lib/groups";
import { getDatabaseEnvError, prisma } from "@/lib/prisma";

export const groupsRouter = Router();

type PostBody = {
  name?: unknown;
  parentGroupId?: unknown;
  insertAt?: unknown;
};

type PatchBody = {
  orderedIds?: unknown;
};

groupsRouter.get("/", async (_req, res) => {
  const envErr = getDatabaseEnvError();
  if (envErr) {
    res.status(503).json({ error: envErr });
    return;
  }

  try {
    await getOrCreateUncategorizedGroupId();
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
    res.json({
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
    res.status(500).json({ error: "Failed to load groups" });
  }
});

groupsRouter.post("/", async (req, res) => {
  const envErr = getDatabaseEnvError();
  if (envErr) {
    res.status(503).json({ error: envErr });
    return;
  }

  try {
    const body = req.body as PostBody;

    if (typeof body.name !== "string") {
      res.status(400).json({ error: "name is required" });
      return;
    }

    const name = body.name.trim();
    if (!name) {
      res.status(400).json({ error: "name cannot be empty" });
      return;
    }

    let parentGroupId: string | null = null;
    if ("parentGroupId" in body && body.parentGroupId != null) {
      if (typeof body.parentGroupId !== "string" || !body.parentGroupId.trim()) {
        res.status(400).json({
          error: "parentGroupId must be a non-empty string when provided",
        });
        return;
      }
      parentGroupId = body.parentGroupId.trim();
      const parentExists = await prisma.group.findUnique({
        where: { id: parentGroupId },
        select: { id: true },
      });
      if (!parentExists) {
        res.status(400).json({ error: "parentGroupId is invalid" });
        return;
      }
    }

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
      const insertAt = Math.max(0, Math.min(body.insertAt, count));
      sortOrder = insertAt;
      await prisma.group.updateMany({
        where: { sortOrder: { gte: insertAt } },
        data: { sortOrder: { increment: 1 } },
      });
    }

    const created = await prisma.group.create({
      data: { name, parentGroupId, sortOrder },
    });

    res.status(201).json({
      group: {
        id: created.id,
        name: created.name,
        sortOrder: created.sortOrder,
        parentGroupId: created.parentGroupId,
        createdAt: created.createdAt.toISOString(),
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      res.status(409).json({ error: "A group with this name already exists." });
      return;
    }
    console.error("POST /api/groups:", e);
    res.status(500).json({ error: "Failed to create group" });
  }
});

groupsRouter.patch("/", async (req, res) => {
  const envErr = getDatabaseEnvError();
  if (envErr) {
    res.status(503).json({ error: envErr });
    return;
  }

  try {
    const body = req.body as PatchBody;

    if (!Array.isArray(body.orderedIds) || body.orderedIds.length === 0) {
      res.status(400).json({
        error: "orderedIds must be a non-empty array of group ids",
      });
      return;
    }

    const orderedIds = body.orderedIds.filter(
      (id): id is string => typeof id === "string" && id.trim().length > 0,
    );
    if (orderedIds.length !== body.orderedIds.length) {
      res.status(400).json({
        error: "orderedIds must contain only non-empty strings",
      });
      return;
    }
    if (new Set(orderedIds).size !== orderedIds.length) {
      res.status(400).json({ error: "orderedIds must not contain duplicates" });
      return;
    }

    const existing = await prisma.group.findMany({ select: { id: true } });
    const existingIds = new Set(existing.map((g) => g.id));
    if (
      orderedIds.length !== existingIds.size ||
      orderedIds.some((id) => !existingIds.has(id))
    ) {
      res.status(400).json({
        error: "orderedIds must include every group exactly once",
      });
      return;
    }

    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.group.update({
          where: { id },
          data: { sortOrder: index },
        }),
      ),
    );

    res.json({ ok: true });
  } catch (e) {
    console.error("PATCH /api/groups:", e);
    res.status(500).json({ error: "Failed to reorder groups" });
  }
});
