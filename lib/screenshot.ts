/**
 * Capture a webpage screenshot URL using free providers (no API key required).
 * Provider: Microlink (hosted CDN PNG).
 * thum.io / WordPress mShots are skipped — placeholders and slow live captures.
 */

const FETCH_MS = 12_000;
/** Real page shots are rarely this small; placeholders often are. */
const MIN_IMAGE_BYTES = 8_000;

function isHttpUrl(pageUrl: string): boolean {
  try {
    const u = new URL(pageUrl.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function isThumIoUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    return new URL(url).hostname.includes("thum.io");
  } catch {
    return /thum\.io/i.test(url);
  }
}

/** WordPress mShots live URLs — slow and often return generating placeholders. */
export function isMshotsUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const { hostname, pathname } = new URL(url);
    return (
      (hostname === "s0.wp.com" ||
        hostname === "s.wordpress.com" ||
        hostname.endsWith(".wp.com") ||
        hostname.endsWith(".wordpress.com")) &&
      pathname.includes("/mshots/")
    );
  } catch {
    return /mshots\/v1/i.test(url);
  }
}

/** Screenshot hosts we never surface in the feed (placeholders / lag). */
export function isUnreliableScreenshotUrl(
  url: string | null | undefined,
): boolean {
  return isThumIoUrl(url) || isMshotsUrl(url);
}

async function responseLooksLikeImage(res: Response): Promise<boolean> {
  if (!res.ok) return false;
  const ct = (res.headers.get("content-type") || "").toLowerCase();
  if (ct.includes("text/html") || ct.includes("application/json")) return false;
  if (ct.startsWith("image/")) return true;
  // Some CDNs omit content-type; sniff magic bytes
  try {
    const buf = new Uint8Array(await res.clone().arrayBuffer());
    if (buf.length < MIN_IMAGE_BYTES) return false;
    // JPEG
    if (buf[0] === 0xff && buf[1] === 0xd8) return true;
    // PNG
    if (
      buf[0] === 0x89 &&
      buf[1] === 0x50 &&
      buf[2] === 0x4e &&
      buf[3] === 0x47
    ) {
      return true;
    }
    // GIF
    if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return true;
    // WEBP (RIFF....WEBP)
    if (
      buf[0] === 0x52 &&
      buf[1] === 0x49 &&
      buf[2] === 0x46 &&
      buf[3] === 0x46 &&
      buf[8] === 0x57 &&
      buf[9] === 0x45
    ) {
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

async function tryMicrolink(pageUrl: string): Promise<string | null> {
  const api = `https://api.microlink.io/?url=${encodeURIComponent(pageUrl)}&screenshot=true&meta=false&viewport.width=1280&viewport.height=800`;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), FETCH_MS);
  try {
    const res = await fetch(api, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      status?: string;
      data?: { screenshot?: { url?: string; size?: number } };
    };
    if (data.status !== "success") return null;
    const shot = data.data?.screenshot?.url?.trim();
    if (!shot || !/^https?:\/\//i.test(shot)) return null;
    if (
      typeof data.data?.screenshot?.size === "number" &&
      data.data.screenshot.size < MIN_IMAGE_BYTES
    ) {
      return null;
    }
    return shot;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/**
 * Browser-side: ask Microlink for a real screenshot URL.
 * Used when stored preview is missing or a known-bad placeholder.
 */
export async function resolveMicrolinkScreenshotUrl(
  pageUrl: string,
): Promise<string | null> {
  if (!isHttpUrl(pageUrl)) return null;
  try {
    const api = `https://api.microlink.io/?url=${encodeURIComponent(pageUrl.trim())}&screenshot=true&meta=false&viewport.width=1280&viewport.height=800`;
    const res = await fetch(api, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      status?: string;
      data?: { screenshot?: { url?: string } };
    };
    if (data.status !== "success") return null;
    const shot = data.data?.screenshot?.url?.trim();
    return shot && /^https?:\/\//i.test(shot) ? shot : null;
  } catch {
    return null;
  }
}

/**
 * Returns a validated screenshot URL, or null if capture fails.
 * Providers load the page themselves — no local pre-wait needed.
 */
export async function capturePageScreenshotUrl(
  pageUrl: string,
): Promise<string | null> {
  if (!isHttpUrl(pageUrl)) return null;

  const custom = process.env.SCREENSHOT_URL_TEMPLATE?.trim();
  if (custom) {
    const url = custom.replaceAll("{url}", encodeURIComponent(pageUrl.trim()));
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), FETCH_MS);
    try {
      const res = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
      });
      if (await responseLooksLikeImage(res)) return url;
    } catch {
      /* fall through to defaults */
    } finally {
      clearTimeout(t);
    }
  }

  return tryMicrolink(pageUrl);
}

/**
 * Hostnames that serve images with permissive CORS headers and don't need
 * proxying. Add any CDN you trust here.
 */
const DIRECT_SERVE_HOSTS = new Set([
  "res.cloudinary.com",
  "images.unsplash.com",
  "lh3.googleusercontent.com",
  "www.google.com", // Google favicons
  "s.gravatar.com",
  "avatars.githubusercontent.com",
  "github.com",
  "raw.githubusercontent.com",
  "cdn.dribbble.com",
  "mir-s3-cdn-cf.behance.net",
  "i.ytimg.com", // YouTube thumbnails
  "og.figma.com",
  "pbs.twimg.com",
  "wsrv.nl",
  "cdn.simpleicons.org",
  "miro.medium.com",
  "substackcdn.com",
  "cloudinary-res.cloudinary.com",
  "www.gstatic.com",
]);

export function getProxiedImageUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  // Data URIs and relative paths are always served directly
  if (url.startsWith("/") || url.startsWith("data:")) return url;
  // Bypass proxy for trusted CDN origins — they support CORS natively
  try {
    const { hostname } = new URL(url);
    if (DIRECT_SERVE_HOSTS.has(hostname)) return url;
  } catch {
    // Malformed URL — fall through to proxy
  }
  return `/api/image-proxy?url=${encodeURIComponent(url)}`;
}

const CLOUDINARY_UPLOAD_MARKER = "/image/upload/";
/** Display widths for feed srcset — capped at 640 to keep Large cards snappy. */
const FEED_IMAGE_WIDTHS = [320, 480, 640] as const;

function withCloudinaryTransform(
  url: string,
  transform: string,
): string | null {
  try {
    const parsed = new URL(url);
    if (
      parsed.hostname !== "res.cloudinary.com" ||
      !parsed.pathname.includes(CLOUDINARY_UPLOAD_MARKER)
    ) {
      return null;
    }

    // Replace any existing transform segment so we never stack transforms.
    const matched = parsed.pathname.match(
      /^(.*?\/image\/upload\/)(?:.+\/)?(v\d+\/.+)$/,
    );
    if (matched) {
      parsed.pathname = `${matched[1]}${transform}/${matched[2]}`;
      return parsed.toString();
    }

    parsed.pathname = parsed.pathname.replace(
      CLOUDINARY_UPLOAD_MARKER,
      `${CLOUDINARY_UPLOAD_MARKER}${transform}/`,
    );
    return parsed.toString();
  } catch {
    return null;
  }
}

function getCloudinaryImageUrl(url: string, width: number): string | null {
  return withCloudinaryTransform(url, `f_auto,q_auto:eco,c_limit,w_${width}`);
}

/**
 * Returns a display-sized preview instead of decoding the original Cloudinary
 * upload in every card. Non-Cloudinary previews retain the existing proxy path.
 */
export function getFeedImageUrl(
  url: string | null | undefined,
  width = 640,
): string | undefined {
  if (!url) return undefined;
  return getCloudinaryImageUrl(url, width) ?? getProxiedImageUrl(url);
}

/** Tiny blurred Cloudinary poster for cards before high-res activation. */
export function getFeedPosterUrl(
  url: string | null | undefined,
): string | undefined {
  if (!url) return undefined;
  return (
    withCloudinaryTransform(url, "f_auto,q_auto,e_blur:1000,c_limit,w_40") ??
    undefined
  );
}

export function getFeedImageSrcSet(
  url: string | null | undefined,
): string | undefined {
  if (!url) return undefined;
  const sources = FEED_IMAGE_WIDTHS.map((width) => {
    const transformed = getCloudinaryImageUrl(url, width);
    return transformed ? `${transformed} ${width}w` : null;
  }).filter((source): source is string => source !== null);

  return sources.length === FEED_IMAGE_WIDTHS.length
    ? sources.join(", ")
    : undefined;
}
