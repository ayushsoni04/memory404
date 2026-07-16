/**
 * Capture a webpage screenshot URL using free providers (no API key required).
 * Order: Microlink (hosted CDN PNG) → WordPress mShots (with warm + retries).
 * thum.io is skipped — free tier often returns solid placeholder frames (e.g. a lone "3").
 */

const FETCH_MS = 12_000;
const MSHOTS_RETRY_WAIT_MS = 2_000;
const MSHOTS_MAX_ATTEMPTS = 2;
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

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isThumIoUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    return new URL(url).hostname.includes("thum.io");
  } catch {
    return /thum\.io/i.test(url);
  }
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

async function tryMshots(pageUrl: string): Promise<string | null> {
  const screenshotUrl = `https://s0.wp.com/mshots/v1/${encodeURIComponent(pageUrl.trim())}?w=1200`;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), FETCH_MS);
  try {
    // Warm the cache, then poll until we get a real image (not the HTML stub).
    await fetch(screenshotUrl, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        Accept: "image/jpeg,image/png,image/*,*/*;q=0.8",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
      },
    }).catch(() => null);

    for (let attempt = 0; attempt < MSHOTS_MAX_ATTEMPTS; attempt += 1) {
      await wait(MSHOTS_RETRY_WAIT_MS);
      const res = await fetch(screenshotUrl, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
        headers: {
          Accept: "image/jpeg,image/png,image/*,*/*;q=0.8",
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        },
      });
      if (!(await responseLooksLikeImage(res))) continue;
      const len = Number(res.headers.get("content-length") || 0);
      if (len > 0 && len < MIN_IMAGE_BYTES) continue;
      const buf = await res.arrayBuffer();
      if (buf.byteLength < MIN_IMAGE_BYTES) continue;
      return screenshotUrl;
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/**
 * Browser-side: ask Microlink for a real screenshot URL.
 * Used when stored preview is missing, broken, or a known-bad thum.io placeholder.
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

/** @deprecated Prefer resolveMicrolinkScreenshotUrl — thum.io free tier is unreliable. */
export function clientScreenshotFallbackUrl(pageUrl: string): string | null {
  if (!isHttpUrl(pageUrl)) return null;
  return `https://s0.wp.com/mshots/v1/${encodeURIComponent(pageUrl.trim())}?w=1200`;
}

/**
 * Returns a validated screenshot URL, or null if all providers fail.
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

  return (await tryMicrolink(pageUrl)) || (await tryMshots(pageUrl)) || null;
}

/**
 * Hostnames that serve images with permissive CORS headers and don't need
 * proxying. Add any CDN you trust here.
 */
const DIRECT_SERVE_HOSTS = new Set([
  "res.cloudinary.com",
  "images.unsplash.com",
  "lh3.googleusercontent.com",
  "www.google.com",        // Google favicons
  "s.gravatar.com",
  "avatars.githubusercontent.com",
  "github.com",
  "raw.githubusercontent.com",
  "cdn.dribbble.com",
  "mir-s3-cdn-cf.behance.net",
  "i.ytimg.com",           // YouTube thumbnails
  "og.figma.com",
  "pbs.twimg.com",
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
const FEED_IMAGE_WIDTHS = [320, 480, 640, 960] as const;

function getCloudinaryImageUrl(url: string, width: number): string | null {
  try {
    const parsed = new URL(url);
    if (
      parsed.hostname !== "res.cloudinary.com" ||
      !parsed.pathname.includes(CLOUDINARY_UPLOAD_MARKER)
    ) {
      return null;
    }

    const transform = `f_auto,q_auto:eco,c_limit,w_${width}/`;
    parsed.pathname = parsed.pathname.replace(
      CLOUDINARY_UPLOAD_MARKER,
      `${CLOUDINARY_UPLOAD_MARKER}${transform}`,
    );
    return parsed.toString();
  } catch {
    return null;
  }
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
