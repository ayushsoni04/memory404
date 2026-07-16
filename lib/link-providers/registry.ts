import type { LinkMetadataShape, LinkProvider } from "./types";
import {
  canvaTitleFromUrl,
  figmaTitleFromUrl,
  githubTitleFromUrl,
  googleWorkspaceTitleFromUrl,
  humanizeSlugSegment,
  isRawUrlOrEmptyTitle,
  isWeakFigmaTitle,
  isWeakGoogleDocTitle,
  linearTitleFromUrl,
  notionTitleFromUrl,
} from "./parsers";

/**
 * First matching provider wins. Put more specific host rules before broad ones.
 */
export const LINK_PROVIDERS: LinkProvider[] = [
  {
    id: "figma",
    match: (u) => u.hostname === "figma.com" || u.hostname.endsWith(".figma.com"),
    brandIcon: "/brands/figma.svg",
    forceBrandIcon: true,
    titleFromUrl: figmaTitleFromUrl,
    defaultTitleWhenWeak: "Figma",
    isWeakScrapedTitle: (t) => isWeakFigmaTitle(t),
    invertInDarkMode: true,
  },
  {
    id: "googleWorkspace",
    match: (u) =>
      u.hostname === "docs.google.com" || u.hostname === "drive.google.com",
    brandIcon: "/brands/googledrive.svg",
    fallbackBrandIcon: true,
    titleFromUrl: googleWorkspaceTitleFromUrl,
    isWeakScrapedTitle: (t) => isWeakGoogleDocTitle(t),
    invertInDarkMode: true,
  },
  {
    id: "sharepoint",
    match: (u) =>
      u.hostname.endsWith("sharepoint.com") ||
      u.hostname.includes("sharepoint."),
    brandIcon: "/brands/sharepoint.svg",
    fallbackBrandIcon: true,
    defaultTitleWhenWeak: "SharePoint",
    invertInDarkMode: true,
  },
  {
    id: "onedrive",
    match: (u) =>
      u.hostname === "onedrive.live.com" ||
      u.hostname === "1drv.ms" ||
      u.hostname.endsWith(".1drv.ms"),
    brandIcon: "/brands/microsoftonedrive.svg",
    fallbackBrandIcon: true,
    defaultTitleWhenWeak: "OneDrive",
    invertInDarkMode: true,
  },
  {
    id: "microsoftTeams",
    match: (u) =>
      u.hostname.includes("teams.microsoft") ||
      u.hostname.includes("teams.live"),
    brandIcon: "/brands/teams.svg",
    fallbackBrandIcon: true,
    defaultTitleWhenWeak: "Microsoft Teams",
    invertInDarkMode: true,
  },
  {
    id: "github",
    match: (u) =>
      u.hostname === "gist.github.com" || u.hostname.endsWith("github.com"),
    brandIcon: "/brands/github.svg",
    fallbackBrandIcon: true,
    titleFromUrl: githubTitleFromUrl,
    isWeakScrapedTitle: (t) => {
      const x = t.trim().toLowerCase();
      return x === "github" || x.startsWith("sign in to github");
    },
    invertInDarkMode: true,
  },
  {
    id: "notion",
    match: (u) =>
      u.hostname === "notion.so" ||
      u.hostname.endsWith(".notion.so") ||
      u.hostname === "notion.site",
    brandIcon: "/brands/notion.svg",
    fallbackBrandIcon: true,
    titleFromUrl: notionTitleFromUrl,
    isWeakScrapedTitle: (t) => {
      const x = t.trim().toLowerCase();
      return x === "notion" || x.includes("notion.site");
    },
    invertInDarkMode: true,
  },
  {
    id: "linear",
    match: (u) => u.hostname.endsWith("linear.app"),
    brandIcon: "/brands/linear.svg",
    fallbackBrandIcon: true,
    titleFromUrl: linearTitleFromUrl,
    isWeakScrapedTitle: (t) => {
      const x = t.trim().toLowerCase();
      return x === "linear" || x.includes("linear.app");
    },
    invertInDarkMode: true,
  },
  {
    id: "canva",
    match: (u) => u.hostname === "canva.com" || u.hostname.endsWith(".canva.com"),
    brandIcon: "/brands/canva.svg",
    forceBrandIcon: true,
    titleFromUrl: canvaTitleFromUrl,
    isWeakScrapedTitle: (t) => {
      const x = t.trim().toLowerCase();
      return x.length < 4 || x.includes("canva.com");
    },
    invertInDarkMode: true,
  },
  {
    id: "miro",
    match: (u) => u.hostname === "miro.com" || u.hostname.endsWith(".miro.com"),
    brandIcon: "/brands/miro.svg",
    fallbackBrandIcon: true,
    defaultTitleWhenWeak: "Miro board",
    titleFromUrl: (u) => {
      const m = u.pathname.match(/\/app\/board\/([^/?#]+)/);
      if (!m?.[1]) return null;
      const seg = decodeURIComponent(m[1]);
      if (/^[a-f0-9-]{24,}$/i.test(seg)) return null;
      return humanizeSlugSegment(seg);
    },
    invertInDarkMode: true,
  },
  {
    id: "loom",
    match: (u) => u.hostname.includes("loom.com"),
    brandIcon: "/brands/loom.svg",
    fallbackBrandIcon: true,
    defaultTitleWhenWeak: "Loom video",
    invertInDarkMode: true,
  },
  {
    id: "slack",
    match: (u) => u.hostname.includes("slack.com"),
    brandIcon: "/brands/slack.svg",
    fallbackBrandIcon: true,
    defaultTitleWhenWeak: "Slack",
    invertInDarkMode: true,
  },
  {
    id: "zoom",
    match: (u) =>
      u.hostname.endsWith("zoom.us") || u.hostname.endsWith("zoom.com"),
    brandIcon: "/brands/zoom.svg",
    fallbackBrandIcon: true,
    defaultTitleWhenWeak: "Zoom meeting",
    invertInDarkMode: true,
  },
  {
    id: "dropbox",
    match: (u) =>
      u.hostname.endsWith("dropbox.com") ||
      u.hostname.endsWith("dropboxusercontent.com"),
    brandIcon: "/brands/dropbox.svg",
    fallbackBrandIcon: true,
    defaultTitleWhenWeak: "Dropbox",
    invertInDarkMode: true,
  },
];

export function matchLinkProvider(urlString: string): LinkProvider | undefined {
  let u: URL;
  try {
    u = new URL(urlString.trim());
  } catch {
    return undefined;
  }
  return LINK_PROVIDERS.find((p) => p.match(u));
}

export function applyProviderMetadata(
  pageUrl: string,
  meta: LinkMetadataShape,
): LinkMetadataShape {
  let u: URL;
  try {
    u = new URL(pageUrl.trim());
  } catch {
    return meta;
  }

  const p = LINK_PROVIDERS.find((pr) => pr.match(u));
  if (!p) return meta;

  let title = meta.title;
  const fromUrl = p.titleFromUrl?.(u) ?? null;
  const weakBase = isRawUrlOrEmptyTitle(title, pageUrl);
  const weakProvider = p.isWeakScrapedTitle?.(title, u) ?? false;
  const weak = weakBase || weakProvider;

  if (fromUrl && weak) title = fromUrl;
  else if (!fromUrl && weak && p.defaultTitleWhenWeak)
    title = p.defaultTitleWhenWeak;
  else if (fromUrl && !title.trim()) title = fromUrl;

  let imageUrl = meta.imageUrl;
  if (p.forceBrandIcon) imageUrl = null;

  if (!title.trim()) {
    title =
      fromUrl ||
      p.defaultTitleWhenWeak ||
      meta.title.trim() ||
      "Saved link";
  }

  return { ...meta, title, imageUrl };
}

export function providerPreviewIcon(
  linkUrl: string,
  storedImage: string | null,
): string | null {
  const p = matchLinkProvider(linkUrl);
  if (p?.forceBrandIcon) return p.brandIcon;
  const stored = storedImage?.trim();
  if (stored) return stored;
  if (p?.fallbackBrandIcon) return p.brandIcon;
  return null;
}

export function resolveProviderDisplayTitle(input: {
  customTitle: string | null;
  systemTitle: string;
  url: string;
}): string {
  if (input.customTitle?.trim()) return input.customTitle.trim();

  let u: URL;
  try {
    u = new URL(input.url.trim());
  } catch {
    return (
      input.systemTitle.trim() ||
      input.url.trim() ||
      "Untitled link"
    );
  }

  const p = LINK_PROVIDERS.find((pr) => pr.match(u));
  const hint = p?.titleFromUrl?.(u) ?? null;
  const sys = input.systemTitle?.trim() ?? "";
  const weakBase = isRawUrlOrEmptyTitle(sys, input.url);
  const weakProvider = p?.isWeakScrapedTitle?.(sys, u) ?? false;
  const weak = weakBase || weakProvider;

  if (hint && weak) return hint;
  if (!hint && weak && p?.defaultTitleWhenWeak) return p.defaultTitleWhenWeak;
  if (sys) return sys;
  if (hint) return hint;
  return input.url.trim() || "Untitled link";
}

export function brandThumbnailInvertInDark(url: string): boolean {
  return matchLinkProvider(url)?.invertInDarkMode === true;
}
