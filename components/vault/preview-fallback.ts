/**
 * After a card preview fails, try the site favicon once.
 * A second failure, or a favicon that is already the failed image, means the
 * card should show a letter mark instead of a blank frame.
 */
export function nextCardPreview(
  failedSrc: string,
  faviconUrl: string | null,
  alreadyTriedFavicon: boolean,
): string | null {
  if (alreadyTriedFavicon) return null;
  if (!faviconUrl || faviconUrl === failedSrc) return null;
  return faviconUrl;
}
