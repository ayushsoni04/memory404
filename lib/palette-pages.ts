import { clipLabel } from "@/lib/clip-label";

export type PalettePage = {
  id: "workspace" | "settings" | "trash";
  label: string;
  href: string;
};

/** Pages the command palette can open. Workspace is owner-only. */
export function palettePagesForUser(isOwner: boolean): PalettePage[] {
  const pages: PalettePage[] = [];
  if (isOwner) {
    pages.push({ id: "workspace", label: "Workspace", href: "/workspace" });
  }
  pages.push(
    { id: "settings", label: "Settings", href: "/settings" },
    { id: "trash", label: "Trash", href: "/trash" },
  );
  return pages;
}

/**
 * With no query, every page is a destination.
 * A query keeps only pages whose name contains it, so a link search
 * does not list Settings and Trash underneath "no matches".
 */
/**
 * What to say when a search matches nothing.
 * A partial link is enough; the field does not need a full address.
 */
export function paletteMissCopy(query: string): string {
  return `No matches for “${clipLabel(query)}”. Try a title, a note, or part of the link.`;
}

export function matchingPalettePages(
  query: string,
  pages: readonly PalettePage[],
): PalettePage[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...pages];
  return pages.filter((page) => page.label.toLowerCase().includes(q));
}
