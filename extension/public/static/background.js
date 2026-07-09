const DEFAULT_API_BASE = "http://localhost:3000";

function getApiBase() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["apiBase"], (res) => {
      const value = typeof res.apiBase === "string" ? res.apiBase.trim() : "";
      resolve(value || DEFAULT_API_BASE);
    });
  });
}

function isLikelyUrl(input) {
  try {
    const u = new URL(input);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function escapeOmniboxXml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

async function saveUrlToApp(url) {
  const apiBase = await getApiBase();
  const res = await fetch(`${apiBase}/api/links`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || `Save failed (${res.status})`);
  }
  return apiBase;
}

async function handleSave(url, openAfterSave) {
  if (!url || !isLikelyUrl(url)) return;
  try {
    const apiBase = await saveUrlToApp(url);
    if (openAfterSave) {
      await chrome.tabs.create({ url: apiBase });
    }
  } catch {
    // ignore for MVP
  }
}

function getUrlFromContext(info, tab) {
  if (info.linkUrl && isLikelyUrl(info.linkUrl)) return info.linkUrl;
  if (info.pageUrl && isLikelyUrl(info.pageUrl)) return info.pageUrl;
  if (tab?.url && isLikelyUrl(tab.url)) return tab.url;
  if (typeof info.selectionText === "string") {
    const t = info.selectionText.trim();
    if (isLikelyUrl(t)) return t;
  }
  return null;
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "lk-parent",
    title: "Add to LK",
    contexts: ["page", "link", "selection"],
  });
  chrome.contextMenus.create({
    id: "lk-save",
    parentId: "lk-parent",
    title: "Just Save",
    contexts: ["page", "link", "selection"],
  });
  chrome.contextMenus.create({
    id: "lk-save-open",
    parentId: "lk-parent",
    title: "Save & Open",
    contexts: ["page", "link", "selection"],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const url = getUrlFromContext(info, tab);
  if (!url) return;
  if (info.menuItemId === "lk-save") {
    try {
      await chrome.action.openPopup();
    } catch {
      await handleSave(url, false);
    }
    return;
  }
  if (info.menuItemId === "lk-save-open") {
    await handleSave(url, true);
  }
});

chrome.omnibox.onInputStarted.addListener(() => {
  chrome.omnibox.setDefaultSuggestion({
    description:
      "Not a Bookmark: type URL to <match>save &amp; open</match>, or type <match>open</match>.",
  });
});

chrome.omnibox.onInputChanged.addListener((text, suggest) => {
  const input = text.trim();
  const safe = escapeOmniboxXml(input);
  suggest([
    {
      content: input || "open",
      description: input
        ? `Save and open: <match>${safe}</match>`
        : "Open Not a Bookmark app",
    },
    {
      content: "open",
      description: "Open Not a Bookmark app only",
    },
  ]);
});

chrome.omnibox.onInputEntered.addListener(async (text) => {
  const input = text.trim();
  const apiBase = await getApiBase();
  if (!input || input.toLowerCase() === "open") {
    await chrome.tabs.create({ url: apiBase });
    return;
  }
  if (isLikelyUrl(input)) {
    try {
      const base = await saveUrlToApp(input);
      await chrome.tabs.create({ url: base });
    } catch (e) {
      const msg =
        e instanceof Error ? encodeURIComponent(e.message) : "save_failed";
      await chrome.tabs.create({ url: `${apiBase}?error=${msg}` });
    }
    return;
  }
  await chrome.tabs.create({ url: apiBase });
});
