/**
 * YouTube videos and X posts people paste from share sheets.
 * A youtu.be link, an embed, and a watch page are one video.
 * twitter.com and x.com are one post. Other links are left alone.
 */

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const STATUS_ID = /^\d{5,25}$/;
const X_HANDLE = /^[A-Za-z0-9_]{1,15}$/;

/** Path segments that are X pages, not profiles. */
const X_RESERVED = new Set([
  "compose",
  "explore",
  "home",
  "i",
  "intent",
  "login",
  "messages",
  "notifications",
  "privacy",
  "search",
  "settings",
  "share",
  "signup",
  "tos",
]);

function bareHost(hostname: string): string {
  return hostname
    .replace(/\.$/, "")
    .replace(/^(?:www|m|mobile)\./i, "")
    .toLowerCase();
}

function youtubeStartSeconds(url: URL): number | null {
  const raw = (url.searchParams.get("t") ?? url.searchParams.get("start") ?? "")
    .trim()
    .toLowerCase();
  if (!raw) return null;
  if (/^\d+s?$/.test(raw)) {
    const seconds = Number(raw.replace(/s$/, ""));
    return seconds > 0 ? seconds : null;
  }
  const match = raw.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  if (!match || match[0] === "") return null;
  const total =
    Number(match[1] ?? 0) * 3600 +
    Number(match[2] ?? 0) * 60 +
    Number(match[3] ?? 0);
  return total > 0 ? total : null;
}

function youtubeVideoId(url: URL): string | null {
  const host = bareHost(url.hostname);
  if (host === "music.youtube.com") return null;
  let id = "";
  if (host === "youtu.be") {
    id = url.pathname.split("/").filter(Boolean)[0] ?? "";
  } else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    const parts = url.pathname.split("/").filter(Boolean);
    if (url.pathname === "/watch" || parts[0] === "watch") {
      id = url.searchParams.get("v") ?? "";
    } else if (
      parts[1] &&
      (parts[0] === "embed" || parts[0] === "shorts" || parts[0] === "live" || parts[0] === "v")
    ) {
      id = parts[1];
    }
  } else {
    return null;
  }
  try {
    id = decodeURIComponent(id);
  } catch {
    return null;
  }
  if (!VIDEO_ID.test(id) || id === "videoseries") return null;
  return id;
}

function xStatusId(url: URL): string | null {
  const host = bareHost(url.hostname);
  if (host !== "x.com" && host !== "twitter.com") return null;
  const parts = url.pathname.split("/").filter(Boolean);
  const at = parts.findIndex((part) => part.toLowerCase() === "status");
  const id = at >= 0 ? parts[at + 1] ?? "" : "";
  return STATUS_ID.test(id) ? id : null;
}

function xProfile(url: URL): string | null {
  const host = bareHost(url.hostname);
  if (host !== "x.com" && host !== "twitter.com") return null;
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length !== 1) return null;
  const handle = parts[0] ?? "";
  if (!X_HANDLE.test(handle) || X_RESERVED.has(handle.toLowerCase())) return null;
  return handle.toLowerCase();
}

/**
 * A stable page for a YouTube video or an X post.
 * Returns null for every other link.
 */
export function sharePageUrl(url: URL): URL | null {
  const videoId = youtubeVideoId(url);
  if (videoId) {
    const next = new URL(`https://youtube.com/watch?v=${videoId}`);
    const start = youtubeStartSeconds(url);
    if (start) next.searchParams.set("t", String(start));
    return next;
  }
  const statusId = xStatusId(url);
  if (statusId) return new URL(`https://x.com/status/${statusId}`);
  const profile = xProfile(url);
  if (profile) return new URL(`https://x.com/${profile}`);
  return null;
}

/** Hosts that can hold the same video or post as this one. */
export function shareHostAliases(hostname: string): string[] | null {
  const host = bareHost(hostname);
  if (
    host === "youtube.com" ||
    host === "youtu.be" ||
    host === "youtube-nocookie.com"
  ) {
    return ["youtube.com", "youtu.be", "youtube-nocookie.com"];
  }
  if (host === "x.com" || host === "twitter.com") return ["x.com", "twitter.com"];
  return null;
}
