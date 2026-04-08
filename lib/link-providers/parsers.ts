export function humanizeSlugSegment(segment: string): string {
  let s = decodeURIComponent(segment).replace(/\+/g, " ");
  s = s.replace(/[-_]+/g, " ");
  return s.replace(/\s+/g, " ").trim();
}

export function isRawUrlOrEmptyTitle(title: string, pageUrl: string): boolean {
  const t = title.trim();
  if (!t) return true;
  if (t === pageUrl.trim()) return true;
  return /^https?:\/\//i.test(t);
}

export function figmaTitleFromUrl(url: URL): string | null {
  const parts = url.pathname.split("/").filter(Boolean);
  const communityIdx = parts.indexOf("community");
  if (
    communityIdx >= 0 &&
    parts[communityIdx + 1] === "file" &&
    parts[communityIdx + 3]
  ) {
    return humanizeSlugSegment(parts[communityIdx + 3]);
  }
  const typeIdx = parts.findIndex((p) =>
    ["design", "file", "proto", "make", "board"].includes(p.toLowerCase()),
  );
  if (typeIdx < 0 || typeIdx + 2 >= parts.length) return null;
  let titleIdx = typeIdx + 2;
  if (parts[titleIdx]?.toLowerCase() === "branch") {
    if (typeIdx + 4 >= parts.length) return null;
    titleIdx = typeIdx + 4;
  }
  const segment = parts[titleIdx];
  if (!segment) return null;
  return humanizeSlugSegment(segment);
}

export function isWeakFigmaTitle(title: string): boolean {
  const t = title.trim().toLowerCase();
  if (t.length < 2) return true;
  if (t === "figma") return true;
  if (t.startsWith("figma -")) return true;
  if (t.startsWith("figma:")) return true;
  if (t.includes("figma.com")) return true;
  if (t.includes("created with figma")) return true;
  return false;
}

export function githubTitleFromUrl(url: URL): string | null {
  const host = url.hostname.toLowerCase();
  const parts = url.pathname.split("/").filter(Boolean);
  if (host === "gist.github.com") {
    if (parts[0]) return `Gist · ${parts[0]}`;
    return "GitHub Gist";
  }
  if (!host.endsWith("github.com")) return null;
  if (parts.length >= 2) {
    const org = parts[0];
    const repo = parts[1];
    if (parts.length === 2) return `${org}/${repo}`;
    if (parts[2] === "issues" && parts[3])
      return `Issue #${parts[3]} · ${org}/${repo}`;
    if (parts[2] === "pull" && parts[3])
      return `PR #${parts[3]} · ${org}/${repo}`;
    if (parts[2] === "discussions" && parts[3])
      return `Discussion #${parts[3]} · ${org}/${repo}`;
    if (parts[2] === "blob" || parts[2] === "tree") {
      const file = parts[parts.length - 1];
      if (file) return `${file} · ${org}/${repo}`;
    }
  }
  return null;
}

export function notionTitleFromUrl(url: URL): string | null {
  const host = url.hostname.toLowerCase();
  if (host !== "notion.so" && !host.endsWith(".notion.so") && host !== "notion.site")
    return null;
  const parts = url.pathname.split("/").filter(Boolean);
  if (!parts.length) return null;
  const last = parts[parts.length - 1];
  if (!last || !last.includes("-")) return null;
  if (/^[a-f0-9]{32}$/i.test(last)) return null;
  const m = last.match(/^(.+)-([a-f0-9]{8,})$/i);
  if (m?.[1]) return humanizeSlugSegment(m[1]);
  return humanizeSlugSegment(last);
}

export function linearTitleFromUrl(url: URL): string | null {
  if (!url.hostname.toLowerCase().endsWith("linear.app")) return null;
  const m = url.pathname.match(/\/issue\/([A-Za-z][A-Za-z0-9]*-\d+)/);
  return m ? m[1].toUpperCase() : null;
}

export function canvaTitleFromUrl(url: URL): string | null {
  if (!url.hostname.toLowerCase().includes("canva.com")) return null;
  const parts = url.pathname.split("/").filter(Boolean);
  const di = parts.indexOf("design");
  if (di >= 0 && parts[di + 2]) return humanizeSlugSegment(parts[di + 2]);
  return null;
}

export function googleWorkspaceTitleFromUrl(url: URL): string | null {
  const h = url.hostname.toLowerCase();
  if (h !== "docs.google.com" && h !== "drive.google.com") return null;
  const p = url.pathname;
  if (p.includes("/document/")) return "Google Doc";
  if (p.includes("/spreadsheets/")) return "Google Sheet";
  if (p.includes("/presentation/")) return "Google Slides";
  if (p.includes("/forms/")) return "Google Form";
  if (p.includes("/file/d/")) return "Google Drive file";
  if (p.includes("/folders/")) return "Google Drive folder";
  if (h === "drive.google.com") return "Google Drive";
  return null;
}

export function isWeakGoogleDocTitle(title: string): boolean {
  const t = title.trim().toLowerCase();
  return (
    t.length < 3 ||
    t === "google docs" ||
    t === "google drive" ||
    t.startsWith("google docs,") ||
    t.includes("sign in")
  );
}
