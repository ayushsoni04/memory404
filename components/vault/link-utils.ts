import type { LinkApiRow } from "@/lib/links";
import type { SortBy } from "./types";

/** Host used for site sort and type, without a leading www and without letter case. */
export const getLinkDomain = (url: string): string => {
  try {
    return new URL(url).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return url;
  }
};

/** The site itself, or a subdomain of it. A name that merely contains the site does not count. */
function hostIs(domain: string, site: string): boolean {
  return domain === site || domain.endsWith(`.${site}`);
}

export const getLinkType = (url: string): string => {
  try {
    const domain = getLinkDomain(url);
    if (hostIs(domain, "figma.com")) return "Figma";
    if (hostIs(domain, "pinterest.com") || hostIs(domain, "pin.it"))
      return "Pinterest";
    if (hostIs(domain, "dribbble.com")) return "Dribbble";
    if (hostIs(domain, "github.com")) return "GitHub";
    if (hostIs(domain, "youtube.com") || hostIs(domain, "youtu.be"))
      return "YouTube";
    if (hostIs(domain, "twitter.com") || hostIs(domain, "x.com"))
      return "Twitter/X";
    if (hostIs(domain, "behance.net")) return "Behance";
    if (hostIs(domain, "notion.so")) return "Notion";
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
    return list.sort((a, b) => {
      const domain = getLinkDomain(a.url).localeCompare(getLinkDomain(b.url));
      if (domain !== 0) return domain;
      const title = (a.displayTitle || a.title).localeCompare(
        b.displayTitle || b.title,
        undefined,
        { numeric: true, sensitivity: "base" },
      );
      if (title !== 0) return title;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
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
