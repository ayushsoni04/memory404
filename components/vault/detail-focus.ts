/**
 * Where focus returns when a link closes.
 * A card keeps its own focus. Search has no card, so the matching card on
 * screen is used, then the library itself.
 */
export function detailReturnFocusId(origin: HTMLElement | null, linkId: string): string | null {
  const fromCard = origin?.closest<HTMLElement>("[data-feed-card]")?.id ?? null;
  if (fromCard) return fromCard;
  if (typeof document === "undefined") return null;
  const cardId = `feed-card-${linkId}`;
  if (document.getElementById(cardId) instanceof HTMLElement) return cardId;
  if (document.getElementById("vault-feed") instanceof HTMLElement) return "vault-feed";
  return null;
}
