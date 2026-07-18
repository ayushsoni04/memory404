import { PrismaClient } from "@prisma/client";
import {
  closeMongo,
  ensureMongoIndexes,
  getCollections,
  pingMongo,
} from "@/lib/db/mongodb";
import type {
  GroupDocument,
  LinkDocument,
  UserDocument,
} from "@/lib/db/types";

const execute = process.argv.includes("--execute");
const verifyOnly = process.argv.includes("--verify-only");

const prisma = new PrismaClient();

function assertSourceConfigured(): void {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error(
      "DATABASE_URL must point to the source Postgres database for migration.",
    );
  }
  if (!process.env.MONGODB_URI?.trim()) {
    throw new Error("MONGODB_URI must point to the target MongoDB deployment.");
  }
}

async function sourceCounts() {
  const [users, groups, links] = await Promise.all([
    prisma.user.count(),
    prisma.group.count(),
    prisma.link.count(),
  ]);
  return { users, groups, links };
}

async function targetCounts() {
  const collections = await getCollections();
  const [users, groups, links] = await Promise.all([
    collections.users.countDocuments(),
    collections.groups.countDocuments(),
    collections.links.countDocuments(),
  ]);
  return { users, groups, links };
}

async function verifyMigration(): Promise<void> {
  const collections = await getCollections();
  const [source, target] = await Promise.all([sourceCounts(), targetCounts()]);
  console.info("Source counts:", source);
  console.info("Target counts:", target);

  for (const key of ["users", "groups", "links"] as const) {
    if (source[key] !== target[key]) {
      throw new Error(
        `Count mismatch for ${key}: source=${source[key]} target=${target[key]}`,
      );
    }
  }

  const [orphanGroups, orphanLinks, invalidStatuses] =
    await Promise.all([
      collections.groups
        .aggregate([
          {
            $lookup: {
              from: "users",
              localField: "userId",
              foreignField: "_id",
              as: "owner",
            },
          },
          { $match: { owner: { $size: 0 } } },
          { $count: "count" },
        ])
        .next(),
      collections.links
        .aggregate([
          {
            $lookup: {
              from: "groups",
              localField: "groupId",
              foreignField: "_id",
              as: "group",
            },
          },
          { $match: { group: { $size: 0 } } },
          { $count: "count" },
        ])
        .next(),
      collections.links.countDocuments({
        metadataStatus: { $nin: ["pending", "ready"] },
      }),
    ]);

  // Parent references need a separate lookup; keep this explicit so a broken
  // hierarchy cannot pass verification merely because counts match.
  const parentOrphans = await collections.groups
    .aggregate([
      { $match: { parentGroupId: { $ne: null } } },
      {
        $lookup: {
          from: "groups",
          localField: "parentGroupId",
          foreignField: "_id",
          as: "parent",
        },
      },
      { $match: { parent: { $size: 0 } } },
      { $count: "count" },
    ])
    .next();

  const failures = {
    orphanGroups: orphanGroups?.count ?? 0,
    orphanLinks: orphanLinks?.count ?? 0,
    orphanParents: parentOrphans?.count ?? 0,
    invalidStatuses,
  };
  console.info("Integrity checks:", failures);
  if (Object.values(failures).some((count) => count > 0)) {
    throw new Error("MongoDB integrity verification failed.");
  }
}

async function copyData(): Promise<void> {
  const collections = await getCollections();
  const [users, groups, links] = await Promise.all([
    prisma.user.findMany(),
    prisma.group.findMany(),
    prisma.link.findMany(),
  ]);

  const userDocuments: UserDocument[] = users.map((user) => ({
    _id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    plan: user.plan,
    createdAt: user.createdAt,
  }));
  const groupDocuments: GroupDocument[] = groups.map((group) => ({
    _id: group.id,
    userId: group.userId,
    name: group.name,
    sortOrder: group.sortOrder,
    parentGroupId: group.parentGroupId,
    createdAt: group.createdAt,
    deletedAt: group.deletedAt,
  }));
  const linkDocuments: LinkDocument[] = links.map((link) => ({
    _id: link.id,
    userId: link.userId,
    url: link.url,
    title: link.title,
    customTitle: link.customTitle,
    description: link.description,
    imageUrl: link.imageUrl,
    faviconUrl: link.faviconUrl,
    tags: link.tags,
    notes: link.notes,
    groupId: link.groupId,
    metadataStatus: link.metadataStatus,
    createdAt: link.createdAt,
    deletedAt: link.deletedAt,
  }));

  if (userDocuments.length) {
    await collections.users.bulkWrite(
      userDocuments.map((document) => ({
        replaceOne: {
          filter: { _id: document._id },
          replacement: document,
          upsert: true,
        },
      })),
    );
  }
  if (groupDocuments.length) {
    await collections.groups.bulkWrite(
      groupDocuments.map((document) => ({
        replaceOne: {
          filter: { _id: document._id },
          replacement: document,
          upsert: true,
        },
      })),
    );
  }
  if (linkDocuments.length) {
    await collections.links.bulkWrite(
      linkDocuments.map((document) => ({
        replaceOne: {
          filter: { _id: document._id },
          replacement: document,
          upsert: true,
        },
      })),
    );
  }
}

async function main(): Promise<void> {
  assertSourceConfigured();
  await pingMongo();

  if (verifyOnly) {
    await verifyMigration();
    return;
  }

  const counts = await sourceCounts();
  console.info("Migration source:", counts);
  if (!execute) {
    console.info(
      "Dry run only. Re-run with --execute during the write-maintenance window.",
    );
    return;
  }

  await ensureMongoIndexes();
  await copyData();
  await verifyMigration();
  console.info("Postgres → MongoDB migration completed and verified.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await Promise.allSettled([prisma.$disconnect(), closeMongo()]);
  });
