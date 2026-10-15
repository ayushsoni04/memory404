import { escapeMongoRegex, getCollections } from "@/lib/db/mongodb";
import {
  groupNameConflict,
  groupNameConflictMessage,
} from "@/lib/group-name";

/** Why this name cannot be created, including a match that only differs by case. */
export async function groupNameTakenMessage(
  userId: string,
  name: string,
): Promise<string | null> {
  const { groups } = await getCollections();
  const sameName = await groups
    .find(
      {
        userId,
        name: { $regex: `^${escapeMongoRegex(name.trim())}$`, $options: "i" },
      },
      { projection: { name: 1, deletedAt: 1 } },
    )
    .toArray();
  return groupNameConflictMessage(
    groupNameConflict(
      name,
      sameName.map((group) => ({
        name: group.name,
        deletedAt: group.deletedAt ?? null,
      })),
    ),
  );
}
