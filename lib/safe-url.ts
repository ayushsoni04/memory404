import { lookup } from "node:dns/promises";

const MAX_REDIRECTS = 4;
const IMAGE_MAX_BYTES = 8_000_000;

const BLOCKED_HOSTS = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata.google.internal",
  "metadata.google.com",
  "metadata",
]);

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/avif",
]);

export class SafeUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SafeUrlError";
  }
}

function stripBrackets(host: string): string {
  return host.replace(/^\[|\]$/g, "").toLowerCase().replace(/\.$/, "");
}

function isBlockedIpv4(address: string): boolean {
  const parts = address.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return true;
  }
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 192 && b === 0) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a >= 224) return true;
  return false;
}

/** True for addresses that must never be fetched (loopback, private, link-local, metadata). */
export function isBlockedAddress(address: string): boolean {
  const raw = stripBrackets(address.trim());
  if (!raw) return true;

  if (raw.startsWith("::ffff:")) {
    return isBlockedAddress(raw.slice("::ffff:".length));
  }

  if (raw.includes(":")) {
    if (raw === "::" || raw === "::1") return true;
    const first = raw.split(":").find((part) => part.length > 0) ?? "0";
    const firstNum = Number.parseInt(first, 16);
    if (!Number.isFinite(firstNum)) return true;
    if ((firstNum & 0xfe00) === 0xfc00) return true;
    if ((firstNum & 0xffc0) === 0xfe80) return true;
    if ((firstNum & 0xff00) === 0xff00) return true;
    return false;
  }

  if (/^\d+$/.test(raw)) {
    const n = Number(raw);
    if (!Number.isSafeInteger(n) || n < 0 || n > 0xffffffff) return true;
    const a = (n >>> 24) & 255;
    const b = (n >>> 16) & 255;
    const c = (n >>> 8) & 255;
    const d = n & 255;
    return isBlockedIpv4(`${a}.${b}.${c}.${d}`);
  }

  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(raw)) return isBlockedIpv4(raw);
  return false;
}

function isIpLiteral(hostname: string): boolean {
  const host = stripBrackets(hostname);
  return host.includes(":") || /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || /^\d+$/.test(host);
}

/**
 * Sync check for URLs the server is willing to fetch.
 * Blocks non-http(s), credentials, localhost, and private or metadata addresses.
 * DNS rebinding is handled by `isResolvedPublicHttpUrl`.
 */
export function isPublicHttpUrlForFetch(urlString: string): boolean {
  try {
    const url = new URL(urlString.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    if (url.username || url.password) return false;
    const host = stripBrackets(url.hostname);
    if (!host || BLOCKED_HOSTS.has(host)) return false;
    if (
      host.endsWith(".localhost") ||
      host.endsWith(".local") ||
      host.endsWith(".internal")
    ) {
      return false;
    }
    if (isBlockedAddress(host)) return false;
    return true;
  } catch {
    return false;
  }
}

export async function isResolvedPublicHttpUrl(urlString: string): Promise<boolean> {
  if (!isPublicHttpUrlForFetch(urlString)) return false;
  const hostname = stripBrackets(new URL(urlString.trim()).hostname);
  if (isIpLiteral(hostname)) return true;
  try {
    const records = await lookup(hostname, { all: true, verbatim: true });
    if (records.length === 0) return false;
    return records.every((record) => !isBlockedAddress(record.address));
  } catch {
    return false;
  }
}

type FetchPublicInit = Omit<RequestInit, "redirect" | "signal"> & {
  timeoutMs?: number;
};

/** Fetches an http(s) URL, re-checking every redirect against the public-URL policy. */
export async function fetchPublicUrl(
  url: string,
  init: FetchPublicInit = {},
): Promise<Response> {
  const { timeoutMs = 8_000, ...rest } = init;
  let current = url;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (!(await isResolvedPublicHttpUrl(current))) {
      throw new SafeUrlError("URL is not allowed");
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(current, {
        ...rest,
        redirect: "manual",
        signal: controller.signal,
      });
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) throw new SafeUrlError("Redirect missing location");
        current = new URL(location, current).toString();
        continue;
      }
      return response;
    } finally {
      clearTimeout(timer);
    }
  }

  throw new SafeUrlError("Too many redirects");
}

export type PublicImageResult =
  | { ok: true; bytes: Uint8Array; contentType: string }
  | { ok: false; status: number; error: string };

async function readCapped(response: Response, maxBytes: number): Promise<Uint8Array | null> {
  const reader = response.body?.getReader();
  if (!reader) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    return bytes.byteLength > maxBytes ? null : bytes;
  }

  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }

  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

/** Download a remote image only when the URL and response are safe to serve. */
export async function fetchPublicImage(url: string): Promise<PublicImageResult> {
  let response: Response;
  try {
    response = await fetchPublicUrl(url, {
      method: "GET",
      timeoutMs: 8_000,
      headers: {
        Accept: "image/avif,image/webp,image/png,image/jpeg,image/gif",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
      },
    });
  } catch {
    return { ok: false, status: 400, error: "URL is not allowed" };
  }

  if (!response.ok) {
    return { ok: false, status: 502, error: "Could not fetch image" };
  }

  const contentType = (response.headers.get("content-type") || "")
    .split(";")[0]
    .trim()
    .toLowerCase();
  if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
    return { ok: false, status: 415, error: "URL did not return an image" };
  }

  const bytes = await readCapped(response, IMAGE_MAX_BYTES);
  if (!bytes) {
    return { ok: false, status: 413, error: "Image is too large" };
  }

  return { ok: true, bytes, contentType };
}
