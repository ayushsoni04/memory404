import { Prisma } from "@prisma/client";
import { Router } from "express";
import { UNCATEGORIZED_GROUP_NAME } from "@/lib/group-constants";
import {
  getOrCreateUncategorizedGroupId,
  isUncategorizedName,
} from "@/lib/groups";
import { linkTextSearchWhere } from "@/lib/link-search";
import { isValidHttpUrl, linkToApiRow, type LinkApiRow } from "@/lib/links";
import { getDatabaseEnvError, prisma } from "@/lib/prisma";

export const groupsRouter = Router();

type PostBody = {
  name?: unknown;
  parentGroupId?: unknown;
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
      orderBy: [{ name: "asc" }],
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

    const created = await prisma.group.create({
      data: { name, parentGroupId },
    });

    res.status(201).json({
      group: {
        id: created.id,
        name: created.name,
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
