import { Prisma } from "@prisma/client";
import { UNCATEGORIZED_GROUP_NAME } from "@/lib/group-constants";
import { prisma } from "@/lib/prisma";

export { UNCATEGORIZED_GROUP_NAME };

type Db = Prisma.TransactionClient | typeof prisma;

/**
 * Returns the id of the Uncategorized group, creating it if missing.
 * Handles concurrent creates via unique constraint + retry.
 */
export async function getOrCreateUncategorizedGroupId(
  db: Db = prisma,
): Promise<string> {
  const existing = await db.group.findUnique({
    where: { name: UNCATEGORIZED_GROUP_NAME },
    select: { id: true },
  });
  if (existing) return existing.id;

  try {
    const created = await db.group.create({
      data: { name: UNCATEGORIZED_GROUP_NAME },
      select: { id: true },
    });
    return created.id;
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      const again = await db.group.findUnique({
        where: { name: UNCATEGORIZED_GROUP_NAME },
        select: { id: true },
      });
      if (again) return again.id;
    }
    throw e;
  }
}

export function isUncategorizedName(name: string): boolean {
  return name.trim().toLowerCase() === UNCATEGORIZED_GROUP_NAME.toLowerCase();
}
