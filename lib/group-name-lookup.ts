import { getCollections } from "@/lib/db/mongodb";
import {
  groupNameConflict,
  groupNameConflictMessage,
} from "@/lib/group-name";

/**
 * Why this name cannot be created.
 * A match can differ by letter case, hyphens, slashes, or extra spaces.
 */
export async function groupNameTakenMessage(
  userId: string,
  name: string,
): Promise<string | null> {
  const { groups } = await getCollections();
  const rows = await groups
    .find({ userId }, { projection: { name: 1, deletedAt: 1 } })
    .toArray();
  return groupNameConflictMessage(
    groupNameConflict(
      name,
      rows.map((group) => ({
        name: group.name,
        deletedAt: group.deletedAt ?? null,
      })),
    ),
  );
}
