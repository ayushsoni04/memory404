/** Home page for the app URL stored in the save panel. */
export function libraryHomeUrl(apiBase) {
  const raw = typeof apiBase === "string" ? apiBase.trim() : "";
  if (!raw) return null;
  let url;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (url.username || url.password) return null;
  return `${url.origin}/`;
}
