import type { LinkApiRow } from "@/lib/links";
import type { SortBy } from "./types";

export const getLinkDomain = (url: string): string => {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace("www.", "");
  } catch {
    return url;
  }
};

export const getLinkType = (url: string): string => {
  try {
    const domain = getLinkDomain(url).toLowerCase();
    if (domain.includes("figma.com")) return "Figma";
    if (domain.includes("pinterest.com") || domain.includes("pin.it"))
      return "Pinterest";
    if (domain.includes("dribbble.com")) return "Dribbble";
    if (domain.includes("github.com")) return "GitHub";
    if (domain.includes("youtube.com") || domain.includes("youtu.be"))
      return "YouTube";
    if (domain.includes("twitter.com") || domain.includes("x.com"))
      return "Twitter/X";
    if (domain.includes("behance.net")) return "Behance";
    if (domain.includes("notion.so")) return "Notion";
    return "General";
  } catch {
    return "General";
  }
};

export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

export function sortLinks(links: LinkApiRow[], sortBy: SortBy): LinkApiRow[] {
  const list = [...links];
  if (sortBy === "newest") {
    return list.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }
  if (sortBy === "oldest") {
    return list.sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  }
  if (sortBy === "domain") {
    return list.sort((a, b) =>
      getLinkDomain(a.url).localeCompare(getLinkDomain(b.url)),
    );
  }
  if (sortBy === "details") {
    const getDetailSize = (l: LinkApiRow) => {
      const descLen = l.description?.length ?? 0;
      const notesLen = l.notes?.length ?? 0;
      const titleLen = (l.customTitle ?? l.title ?? "").length;
      return descLen + notesLen + titleLen;
    };
    return list.sort((a, b) => getDetailSize(b) - getDetailSize(a));
  }
  if (sortBy === "type") {
    const typeOrder: Record<string, number> = {
      Figma: 1,
      Pinterest: 2,
      Dribbble: 3,
      GitHub: 4,
      YouTube: 5,
      "Twitter/X": 6,
      Behance: 7,
      Notion: 8,
      General: 9,
    };
    return list.sort((a, b) => {
      const typeA = getLinkType(a.url);
      const typeB = getLinkType(b.url);
      const orderA = typeOrder[typeA] ?? 99;
      const orderB = typeOrder[typeB] ?? 99;
      if (orderA !== orderB) return orderA - orderB;
      return (
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    });
  }
  return list;
}
