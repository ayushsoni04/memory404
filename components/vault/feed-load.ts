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

/**
 * A refresh that fails after links are already on screen.
 * The next-page error has its own message, so this stays quiet then.
 */
export function showRefreshFailure(
  fetchError: string | null,
  linkCount: number,
  loadMoreError: string | null,
): boolean {
  return Boolean(fetchError) && linkCount > 0 && !loadMoreError;
}

export type FeedMoreView = "hidden" | "button" | "loading";

/**
 * More links are a button until a page is actually loading.
 * An error has its own message, so this stays out of the way.
 */
export function feedMoreView(
  hasMoreLinks: boolean,
  loadingMore: boolean,
  loadMoreError: string | null,
): FeedMoreView {
  if (!hasMoreLinks || loadMoreError) return "hidden";
  return loadingMore ? "loading" : "button";
}
