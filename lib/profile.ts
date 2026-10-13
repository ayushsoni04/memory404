export const USERNAME_MIN = 3;
export const USERNAME_MAX = 30;
export const AVATAR_DATA_URL_MAX_BYTES = 200 * 1024; // 200KB

const USERNAME_RE = /^[a-zA-Z0-9_]+$/;
/** Keep in sync with BANNER_GRADIENTS in app/settings/_components/constants.ts */
export const VALID_BANNER_STYLES = [
  "midnight",
  "aurora",
  "twilight",
  "ocean",
] as const;
const BANNER_IDS = new Set<string>(VALID_BANNER_STYLES);

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export function getUsernameIssues(username: string): string[] {
  const issues: string[] = [];
  if (username.length < USERNAME_MIN || username.length > USERNAME_MAX) {
    issues.push(`between ${USERNAME_MIN} and ${USERNAME_MAX} characters`);
  }
  if (!USERNAME_RE.test(username)) {
    issues.push("only letters, numbers, and underscores");
  }
  return issues;
}

export function isValidBannerStyle(value: string): boolean {
  return BANNER_IDS.has(value);
}

/** Rejects oversized data URLs; allows http(s) URLs of any reasonable length. */
export function getAvatarUrlIssues(avatarUrl: string): string[] {
  if (avatarUrl.startsWith("data:")) {
    if (avatarUrl.length > AVATAR_DATA_URL_MAX_BYTES) {
      return ["Avatar image is too large (max 200KB)"];
    }
    if (!/^data:image\/(png|jpeg|jpg|webp|gif);base64,/i.test(avatarUrl)) {
      return ["Avatar must be a PNG, JPEG, WebP, or GIF image"];
    }
  } else if (avatarUrl.startsWith("http://") || avatarUrl.startsWith("https://")) {
    if (avatarUrl.length > 2048) {
      return ["Avatar URL is too long"];
    }
  } else {
    return ["Avatar must be an image URL or data URL"];
  }
  return [];
}

export type PublicUserProfile = {
  id: string;
  email: string;
  name: string | null;
  username: string | null;
  avatarUrl: string | null;
  bannerStyle: string;
  plan: string;
  createdAt: string;
};

export function toPublicProfile(user: {
  id: string;
  email: string;
  name: string | null;
  username?: string | null;
  avatarUrl: string | null;
  bannerStyle?: string | null;
  plan: string;
  createdAt: Date;
}): PublicUserProfile {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    username: user.username ?? null,
    avatarUrl: user.avatarUrl,
    bannerStyle: user.bannerStyle ?? "midnight",
    plan: user.plan,
    createdAt: user.createdAt.toISOString(),
  };
}
