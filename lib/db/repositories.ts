import { randomUUID } from "node:crypto";
import type {
  ClientSession,
  Filter,
  FindOptions,
  UpdateFilter,
} from "mongodb";
import { GENERAL_GROUP_NAME } from "@/lib/group-constants";
import {
  getCollections,
  isDuplicateKeyError,
  withMongoTransaction,
} from "@/lib/db/mongodb";
import {
  groupDocumentToRow,
  linkDocumentToRow,
  userDocumentToRow,
  type GroupDocument,
  type GroupRow,
  type LinkDocument,
  type LinkRow,
  type UserRow,
} from "@/lib/db/types";

const LEGACY_UNCATEGORIZED_GROUP_NAME = "Uncategorized";

export type GroupWithPreview = GroupRow & {
  linksCount: number;
  previewTitles: string[];
};

export async function upsertUser(input: {
  id: string;
  email: string;
}): Promise<UserRow> {
  const { users } = await getCollections();
  const now = new Date();
  const document = await users.findOneAndUpdate(
    { _id: input.id },
    {
      $set: { email: input.email },
      $setOnInsert: {
        name: null,
        avatarUrl: null,
        plan: "free",
        createdAt: now,
      },
    },
    { upsert: true, returnDocument: "after" },
  );
  if (!document) throw new Error("Failed to upsert user");
  return userDocumentToRow(document);
}

export async function getOrCreateGeneralGroup(
  userId: string,
): Promise<string> {
  const { groups, links } = await getCollections();

  try {
    return await withMongoTransaction(async (session) => {
      let general = await groups.findOne(
        { userId, name: GENERAL_GROUP_NAME },
        { session },
      );
      const legacy = await groups.findOne(
        { userId, name: LEGACY_UNCATEGORIZED_GROUP_NAME },
        { session },
      );

      if (general && legacy) {
        await Promise.all([
          links.updateMany(
            { userId, groupId: legacy._id },
            { $set: { groupId: general._id } },
            { session },
          ),
          groups.updateMany(
            { userId, parentGroupId: legacy._id },
            { $set: { parentGroupId: general._id } },
            { session },
          ),
        ]);
        await groups.deleteOne({ _id: legacy._id, userId }, { session });
        return general._id;
      }

      if (!general && legacy) {
        await groups.updateOne(
          { _id: legacy._id, userId },
          { $set: { name: GENERAL_GROUP_NAME, sortOrder: 0 } },
          { session },
        );
        return legacy._id;
      }

      if (!general) {
        general = {
          _id: randomUUID(),
          userId,
          name: GENERAL_GROUP_NAME,
          sortOrder: 0,
          parentGroupId: null,
          createdAt: new Date(),
          deletedAt: null,
        };
        await groups.insertOne(general, { session });
      }
      return general._id;
    });
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;
    const existing = await groups.findOne({ userId, name: GENERAL_GROUP_NAME });
    if (!existing) throw error;
    return existing._id;
  }
}

export async function listGroupsWithPreviews(
  userId: string,
  includeDeleted = false,
): Promise<GroupWithPreview[]> {
  const { groups } = await getCollections();
  const deletedFilter = includeDeleted ? {} : { deletedAt: null };
  const rows = await groups
    .aggregate<
      GroupDocument & {
        linksCount: number;
        previewTitles: string[];
      }
    >([
      { $match: { userId, ...deletedFilter } },
      { $sort: { sortOrder: 1, createdAt: 1 } },
      {
        $lookup: {
          from: "links",
          let: { groupId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$groupId", "$$groupId"] },
                deletedAt: null,
              },
            },
            { $sort: { createdAt: -1, _id: -1 } },
            {
              $facet: {
                count: [{ $count: "value" }],
                previews: [
                  { $limit: 3 },
                  { $project: { title: 1, customTitle: 1, url: 1 } },
                ],
              },
            },
          ],
          as: "linkSummary",
        },
      },
      {
        $set: {
          linksCount: {
            $ifNull: [
              { $arrayElemAt: ["$linkSummary.count.value", 0] },
              0,
            ],
          },
          previewTitles: {
            $map: {
              input: {
                $ifNull: [
                  { $arrayElemAt: ["$linkSummary.previews", 0] },
                  [],
                ],
              },
              as: "link",
              in: {
                $ifNull: [
                  "$$link.customTitle",
                  { $ifNull: ["$$link.title", "$$link.url"] },
                ],
              },
            },
          },
        },
      },
      { $unset: "linkSummary" },
    ])
    .toArray();

  return rows.map(({ linksCount, previewTitles, ...group }) => ({
    ...groupDocumentToRow(group),
    linksCount,
    previewTitles,
  }));
}

export async function findGroup(
  filter: Filter<GroupDocument>,
  session?: ClientSession,
): Promise<GroupRow | null> {
  const { groups } = await getCollections();
  const document = await groups.findOne(filter, { session });
  return document ? groupDocumentToRow(document) : null;
}

export async function createGroup(input: {
  userId: string;
  name: string;
  parentGroupId?: string | null;
  insertAt?: number;
}): Promise<GroupRow> {
  const { groups } = await getCollections();
  return withMongoTransaction(async (session) => {
    if (input.parentGroupId) {
      const parent = await groups.findOne(
        {
          _id: input.parentGroupId,
          userId: input.userId,
          deletedAt: null,
        },
        { session, projection: { _id: 1 } },
      );
      if (!parent) throw new Error("INVALID_PARENT_GROUP");
    }

    const [general, last, count] = await Promise.all([
      groups.findOne(
        { userId: input.userId, name: GENERAL_GROUP_NAME },
        { session, projection: { _id: 1 } },
      ),
      groups.find({ userId: input.userId }, { session })
        .sort({ sortOrder: -1 })
        .limit(1)
        .next(),
      groups.countDocuments({ userId: input.userId }, { session }),
    ]);

    let sortOrder = (last?.sortOrder ?? -1) + 1;
    if (Number.isInteger(input.insertAt)) {
      sortOrder = Math.max(
        general ? 1 : 0,
        Math.min(input.insertAt as number, count),
      );
      await groups.updateMany(
        { userId: input.userId, sortOrder: { $gte: sortOrder } },
        { $inc: { sortOrder: 1 } },
        { session },
      );
    }

    const document: GroupDocument = {
      _id: randomUUID(),
      userId: input.userId,
      name: input.name,
      sortOrder,
      parentGroupId: input.parentGroupId ?? null,
      createdAt: new Date(),
      deletedAt: null,
    };
    await groups.insertOne(document, { session });
    return groupDocumentToRow(document);
  });
}

export async function reorderGroups(
  userId: string,
  orderedIds: string[],
): Promise<"ok" | "invalid" | "general-not-first"> {
  const { groups } = await getCollections();
  return withMongoTransaction(async (session) => {
    const existing = await groups
      .find({ userId }, { session, projection: { _id: 1, name: 1 } })
      .toArray();
    const ids = new Set(existing.map((group) => group._id));
    if (
      orderedIds.length !== ids.size ||
      orderedIds.some((id) => !ids.has(id))
    ) {
      return "invalid";
    }
    const general = existing.find((group) => group.name === GENERAL_GROUP_NAME);
    if (general && orderedIds[0] !== general._id) return "general-not-first";

    if (orderedIds.length) {
      await groups.bulkWrite(
        orderedIds.map((id, sortOrder) => ({
          updateOne: {
            filter: { _id: id, userId },
            update: { $set: { sortOrder } },
          },
        })),
        { session, ordered: true },
      );
    }
    return "ok";
  });
}

export async function findLinks(
  filter: Filter<LinkDocument>,
  options: FindOptions = {},
): Promise<LinkRow[]> {
  const { links } = await getCollections();
  const documents = await links.find(filter, options).toArray();
  return documents.map(linkDocumentToRow);
}

export async function findLink(
  filter: Filter<LinkDocument>,
): Promise<LinkRow | null> {
  const { links } = await getCollections();
  const document = await links.findOne(filter);
  return document ? linkDocumentToRow(document) : null;
}

export async function createLink(input: {
  userId: string;
  url: string;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  groupId: string;
}): Promise<LinkRow> {
  const { links, groups } = await getCollections();
  const group = await groups.findOne({
    _id: input.groupId,
    userId: input.userId,
    deletedAt: null,
  });
  if (!group) throw new Error("INVALID_GROUP");

  const document: LinkDocument = {
    _id: randomUUID(),
    userId: input.userId,
    url: input.url,
    title: input.title,
    customTitle: null,
    description: input.description ?? null,
    imageUrl: input.imageUrl ?? null,
    faviconUrl: null,
    tags: [],
    notes: null,
    groupId: input.groupId,
    metadataStatus: "pending",
    createdAt: new Date(),
    deletedAt: null,
  };
  await links.insertOne(document);
  return linkDocumentToRow(document);
}

export async function updateLink(
  filter: Filter<LinkDocument>,
  update: UpdateFilter<LinkDocument>,
): Promise<LinkRow | null> {
  const { links } = await getCollections();
  const document = await links.findOneAndUpdate(filter, update, {
    returnDocument: "after",
  });
  return document ? linkDocumentToRow(document) : null;
}
