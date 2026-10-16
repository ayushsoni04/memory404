/**
 * Fold hyphens, slashes, and repeated spaces so "side-projects"
 * matches a group named "Side Projects".
 * Keep this in step with lib/group-query.ts.
 * @param {unknown} value
 */
export function normalizeGroupQuery(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[-_/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * @param {unknown} name
 * @param {unknown} query
 */
export function groupNameMatches(name, query) {
  const q = normalizeGroupQuery(query);
  if (!q) return true;
  return normalizeGroupQuery(name).includes(q);
}

/**
 * @param {unknown} left
 * @param {unknown} right
 */
export function groupNamesMatchExactly(left, right) {
  const a = normalizeGroupQuery(left);
  const b = normalizeGroupQuery(right);
  return Boolean(a) && a === b;
}
