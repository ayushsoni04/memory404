/**
 * Fold hyphens, slashes, and repeated spaces so "side-projects"
 * matches a group named "Side Projects".
 */
export function normalizeGroupQuery(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[-_/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function groupsMatchingQuery<T extends { name: string }>(
  groups: readonly T[],
  query: string,
): T[] {
  const q = normalizeGroupQuery(query);
  if (!q) return [...groups];
  return groups.filter((group) => normalizeGroupQuery(group.name).includes(q));
}
