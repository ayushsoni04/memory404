/** A links page after the first one includes a cursor. */
export function isLaterLinksPage(url: string): boolean {
  try {
    return new URL(url, "http://localhost").searchParams.has("cursor");
  } catch {
    return false;
  }
}

/**
 * A failed first load replaces the feed. A later failure must not, because
 * links are already on screen.
 */
export function replaceFeedWithLoadError(
  fetchError: string | null,
  linkCount: number,
): boolean {
  return Boolean(fetchError) && linkCount === 0;
}
