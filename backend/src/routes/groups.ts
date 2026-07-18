import { Router, type RequestHandler } from "express";
import { DEV_USER_ID } from "@/lib/dev-user";
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

export const groupsRouter = Router();

// See backend/src/routes/links.ts for why this is a fixed dev user.
const userId = DEV_USER_ID;

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

groupsRouter.use(guardMutationsDuringMaintenance);

type PostBody = {
  name?: unknown;
  parentGroupId?: unknown;
  insertAt?: unknown;
};

type PatchBody = {
  orderedIds?: unknown;
};

groupsRouter.get("/", async (_req, res) => {
  const envErr = getMongoEnvError();
  if (envErr) {
    res.status(503).json({ error: envErr });
    return;
  }

  try {
    await getOrCreateGeneralGroup(userId);
    const groups = await listGroupsWithPreviews(userId);
    res.json({
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
    res.status(500).json({ error: "Failed to load groups" });
  }
});

groupsRouter.post("/", async (req, res) => {
  const envErr = getMongoEnvError();
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
    }

    const insertAt =
      typeof body.insertAt === "number" &&
      Number.isFinite(body.insertAt) &&
      Number.isInteger(body.insertAt)
        ? body.insertAt
        : undefined;

    const created = await createGroup({
      userId,
      name,
      parentGroupId,
      insertAt,
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
    if (e instanceof Error && e.message === "INVALID_PARENT_GROUP") {
      res.status(400).json({ error: "parentGroupId is invalid" });
      return;
    }
    if (isDuplicateKeyError(e)) {
      res.status(409).json({ error: "A group with this name already exists." });
      return;
    }
    console.error("POST /api/groups:", e);
    res.status(500).json({ error: "Failed to create group" });
  }
});

groupsRouter.patch("/", async (req, res) => {
  const envErr = getMongoEnvError();
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

    const result = await reorderGroups(userId, orderedIds);
    if (result === "invalid") {
      res.status(400).json({
        error: "orderedIds must include every group exactly once",
      });
      return;
    }

    if (result === "general-not-first") {
      res.status(400).json({ error: "General must remain first" });
      return;
    }

    res.json({ ok: true });
  } catch (e) {
    console.error("PATCH /api/groups:", e);
    res.status(500).json({ error: "Failed to reorder groups" });
  }
});
