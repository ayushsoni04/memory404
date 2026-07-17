import { Prisma } from "@prisma/client";
import { GENERAL_GROUP_NAME } from "@/lib/group-constants";
import { prisma } from "@/lib/prisma";

export { GENERAL_GROUP_NAME };

type Db = Prisma.TransactionClient | typeof prisma;
const LEGACY_UNCATEGORIZED_GROUP_NAME = "Uncategorized";

/**
 * Returns the id of the Uncategorized group for this user, creating it if
 * missing. Handles concurrent creates via unique constraint + retry.
 */
export async function getOrCreateGeneralGroupId(
  userId: string,
  db: Db = prisma,
): Promise<string> {
  const existing = await db.group.findUnique({
    where: { userId_name: { userId, name: GENERAL_GROUP_NAME } },
    select: { id: true },
  });
  if (existing) {
    const legacy = await db.group.findUnique({
      where: { userId_name: { userId, name: LEGACY_UNCATEGORIZED_GROUP_NAME } },
      select: { id: true },
    });
    if (legacy) {
      await db.link.updateMany({
        where: { groupId: legacy.id },
        data: { groupId: existing.id },
      });
      await db.group.updateMany({
        where: { parentGroupId: legacy.id },
        data: { parentGroupId: existing.id },
      });
      await db.group.delete({ where: { id: legacy.id } });
    }
    return existing.id;
  }

  const legacy = await db.group.findUnique({
    where: { userId_name: { userId, name: LEGACY_UNCATEGORIZED_GROUP_NAME } },
    select: { id: true },
  });
  if (legacy) {
    try {
      const renamed = await db.group.update({
        where: { id: legacy.id },
        data: { name: GENERAL_GROUP_NAME, sortOrder: 0 },
        select: { id: true },
      });
      return renamed.id;
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002"
      ) {
        const again = await db.group.findUnique({
          where: { userId_name: { userId, name: GENERAL_GROUP_NAME } },
          select: { id: true },
        });
        if (again) return again.id;
      }
      throw e;
    }
  }

  try {
    const created = await db.group.create({
      data: { userId, name: GENERAL_GROUP_NAME, sortOrder: 0 },
      select: { id: true },
    });
    return created.id;
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      const again = await db.group.findUnique({
        where: { userId_name: { userId, name: GENERAL_GROUP_NAME } },
        select: { id: true },
      });
      if (again) return again.id;
    }
    throw e;
  }
}

export function isGeneralName(name: string): boolean {
  const normalized = name.trim().toLowerCase();
  return (
    normalized === GENERAL_GROUP_NAME.toLowerCase() ||
    normalized === LEGACY_UNCATEGORIZED_GROUP_NAME.toLowerCase()
  );
}
