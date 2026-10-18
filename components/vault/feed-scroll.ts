/** Jump the library list back to the first row after the open group changes. */
export function scrollFeedToTop(root: HTMLElement | null): void {
  if (!root) return;
  if (typeof root.scrollTo === "function") {
    root.scrollTo({ top: 0 });
    return;
  }
  root.scrollTop = 0;
}
