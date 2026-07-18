import { GENERAL_GROUP_NAME } from "@/lib/group-constants";
import { getOrCreateGeneralGroup } from "@/lib/db/repositories";

export { GENERAL_GROUP_NAME };

const LEGACY_UNCATEGORIZED_GROUP_NAME = "Uncategorized";

/**
 * Returns the id of the Uncategorized group for this user, creating it if
 * missing. Handles concurrent creates via unique constraint + retry.
 */
export async function getOrCreateGeneralGroupId(
  userId: string,
): Promise<string> {
  return getOrCreateGeneralGroup(userId);
}

export function isGeneralName(name: string): boolean {
  const normalized = name.trim().toLowerCase();
  return (
    normalized === GENERAL_GROUP_NAME.toLowerCase() ||
    normalized === LEGACY_UNCATEGORIZED_GROUP_NAME.toLowerCase()
  );
}
