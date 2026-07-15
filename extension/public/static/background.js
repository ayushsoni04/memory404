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

async function saveUrlToApp(url, options = {}) {
  const apiBase = await getApiBase();
  const payload = { url };
  if (options.groupId) payload.groupId = options.groupId;
  if (options.newGroupName) payload.newGroupName = options.newGroupName;

  const res = await fetch(`${apiBase}/api/links`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || `Save failed (${res.status})`);
  }
  const data = await res.json().catch(() => ({}));
  return { apiBase, link: data?.link };
}

async function handleSave(url, openAfterSave, options = {}) {
  if (!url || !isLikelyUrl(url)) return null;
  try {
    const { apiBase, link } = await saveUrlToApp(url, options);
    if (openAfterSave) {
      await chrome.tabs.create({ url: apiBase });
    }
    return link;
  } catch {
    return null;
  }
}

async function getLastSavedGroupId() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["lastSavedGroupId"], (res) => {
      resolve(res.lastSavedGroupId || null);
    });
  });
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
    contexts: ["page", "link", "selection", "tab"],
  });
  chrome.contextMenus.create({
    id: "lk-save",
    parentId: "lk-parent",
    title: "Just Save",
    contexts: ["page", "link", "selection", "tab"],
  });
  chrome.contextMenus.create({
    id: "lk-save-open",
    parentId: "lk-parent",
    title: "Save & Open",
    contexts: ["page", "link", "selection", "tab"],
  });
  chrome.contextMenus.create({
    id: "lk-save-selected",
    parentId: "lk-parent",
    title: "Save Selected Tabs",
    contexts: ["page", "tab"],
  });
  chrome.contextMenus.create({
    id: "lk-save-group",
    parentId: "lk-parent",
    title: "Save Current Tab Group",
    contexts: ["page", "tab"],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const url = getUrlFromContext(info, tab);

  if (info.menuItemId === "lk-save" || info.menuItemId === "lk-save-open") {
    if (!url) return;
    const lastSavedGroupId = await getLastSavedGroupId();
    if (info.menuItemId === "lk-save") {
      try {
        await chrome.action.openPopup();
      } catch {
        await handleSave(url, false, { groupId: lastSavedGroupId });
      }
    } else {
      await handleSave(url, true, { groupId: lastSavedGroupId });
    }
    return;
  }

  if (info.menuItemId === "lk-save-selected") {
    const tabs = await chrome.tabs.query({ highlighted: true, currentWindow: true });
    const urls = tabs.map((t) => t.url).filter(isLikelyUrl);
    if (!urls.length) return;

    const lastSavedGroupId = await getLastSavedGroupId();
    for (const u of urls) {
      await handleSave(u, false, { groupId: lastSavedGroupId });
    }
    return;
  }

  if (info.menuItemId === "lk-save-group") {
    if (!chrome.tabGroups) return;
    const targetGroupId = tab?.groupId;
    if (targetGroupId == null || targetGroupId === chrome.tabGroups.TAB_GROUP_ID_NONE) return;

    let groupName = "";
    try {
      const gInfo = await chrome.tabGroups.get(targetGroupId);
      if (gInfo && gInfo.title) {
        groupName = gInfo.title.trim();
      }
    } catch (e) {
      console.error("Failed to get tab group info:", e);
    }

    const tabs = await chrome.tabs.query({ groupId: targetGroupId });
    const urls = tabs.map((t) => t.url).filter(isLikelyUrl);
    if (!urls.length) return;

    let activeGroupId = await getLastSavedGroupId();
    let isFirst = true;
    for (const u of urls) {
      if (isFirst && groupName) {
        const savedLink = await handleSave(u, false, { newGroupName: groupName });
        if (savedLink && savedLink.groupId) {
          activeGroupId = savedLink.groupId;
        }
        isFirst = false;
      } else {
        await handleSave(u, false, { groupId: activeGroupId });
      }
    }
    return;
  }
});

chrome.omnibox.onInputStarted.addListener(() => {
  chrome.omnibox.setDefaultSuggestion({
    description:
      "memory404: type URL to <match>save &amp; open</match>, or type <match>open</match>.",
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
        : "Open memory404 app",
    },
    {
      content: "open",
      description: "Open memory404 app only",
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
