const DEFAULT_API_BASE = "http://localhost:3000";
const OVERLAY_FILE = "overlay.js";

function getApiBase() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["apiBase"], (res) => {
      const value = typeof res.apiBase === "string" ? res.apiBase.trim() : "";
      resolve(value || DEFAULT_API_BASE);
    });
  });
}

function storageGet(keys) {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, resolve);
  });
}

function storageSet(obj) {
  return new Promise((resolve) => {
    chrome.storage.local.set(obj, resolve);
  });
}

function storageRemove(keys) {
  return new Promise((resolve) => {
    chrome.storage.local.remove(keys, resolve);
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

function jobId() {
  return `job_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

const FETCH_TIMEOUT_MS = 20_000;

function withTimeout(promise, ms, label = "Operation") {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`${label} timed out after ${ms / 1000}s`)),
        ms,
      );
    }),
  ]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

async function fetchWithTimeout(url, options = {}, ms = FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (e) {
    if (e && typeof e === "object" && e.name === "AbortError") {
      throw new Error(`Request timed out after ${ms / 1000}s`);
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

async function setBadge(text) {
  try {
    await chrome.action.setBadgeBackgroundColor({ color: "#0c0c0c" });
    await chrome.action.setBadgeText({ text: text || "" });
  } catch {
    // ignore
  }
}

async function setActiveSaveJob(job) {
  await storageSet({ activeSaveJob: job });
  try {
    if (job?.tabId != null) {
      await chrome.tabs.sendMessage(job.tabId, {
        type: "SAVE_JOB_UPDATE",
        job,
      });
    }
  } catch {
    // Overlay may not be injected yet
  }
}

async function extractPageMeta(tabId) {
  try {
    const scriptPromise = chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const text = (sel) => document.querySelector(sel)?.content?.trim() || null;
        const title =
          text('meta[property="og:title"]') ||
          text('meta[name="twitter:title"]') ||
          document.title ||
          null;
        const description =
          text('meta[property="og:description"]') ||
          text('meta[name="twitter:description"]') ||
          text('meta[name="description"]') ||
          null;
        const imageUrl =
          text('meta[property="og:image"]') ||
          text('meta[name="twitter:image"]') ||
          null;
        return { title, description, imageUrl };
      },
    });
    const [{ result }] = await withTimeout(
      scriptPromise,
      5000,
      "Page meta",
    );
    return result ?? { title: null, description: null, imageUrl: null };
  } catch {
    return { title: null, description: null, imageUrl: null };
  }
}

async function saveUrlToApp(url, options = {}) {
  const apiBase = await getApiBase();
  const payload = { url };
  if (options.groupId) payload.groupId = options.groupId;
  if (options.newGroupName) payload.newGroupName = options.newGroupName;
  if (options.title) payload.title = options.title;
  if (options.description != null) payload.description = options.description;
  if (options.imageUrl != null) payload.imageUrl = options.imageUrl;

  const attempt = async () => {
    const res = await fetchWithTimeout(`${apiBase}/api/links`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    return { res, data };
  };

  let { res, data } = await attempt();

  // Batch saves can hit the create rate limit — wait and retry once.
  if (res.status === 429) {
    const retryAfter = Number(res.headers.get("Retry-After") || "2");
    await new Promise((r) =>
      setTimeout(r, Math.min(60, Math.max(1, retryAfter)) * 1000),
    );
    ({ res, data } = await attempt());
  }

  if (res.ok) {
    return { apiBase, link: data?.link };
  }
  if (res.status === 409 && (data.existingId || data.link?.id)) {
    return {
      apiBase,
      link: data.link ?? {
        id: data.existingId,
        groupId: data.link?.groupId ?? options.groupId,
      },
    };
  }
  throw new Error(data?.error || `Save failed (${res.status})`);
}

async function fetchGroupsFromApi() {
  const apiBase = await getApiBase();
  const res = await fetchWithTimeout(`${apiBase}/api/groups`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Failed to load groups");
  const groups = Array.isArray(data.groups) ? data.groups : [];
  await storageSet({ cachedGroups: groups });
  return groups;
}

async function createGroupFromApi(name) {
  const apiBase = await getApiBase();
  const res = await fetchWithTimeout(`${apiBase}/api/groups`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Failed to create group");
  const group = data.group;
  const prev = await storageGet(["cachedGroups"]);
  const currentCache = Array.isArray(prev.cachedGroups) ? prev.cachedGroups : [];
  const updatedCache = [...currentCache, group].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  await storageSet({ cachedGroups: updatedCache });
  return group;
}

async function handleSave(url, openAfterSave, options = {}) {
  if (!url || !isLikelyUrl(url)) return null;
  try {
    const { apiBase, link } = await saveUrlToApp(url, options);
    await storageRemove(["lastExtensionError", "lastExtensionErrorAt"]);
    if (openAfterSave) {
      await chrome.tabs.create({ url: apiBase });
    }
    return link;
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Failed to save from extension";
    const apiBase = await getApiBase();
    const now = Date.now();
    const prev = await storageGet(["lastExtensionErrorAt"]);
    const lastAt =
      typeof prev.lastExtensionErrorAt === "number"
        ? prev.lastExtensionErrorAt
        : 0;
    await storageSet({
      lastExtensionError: { message, at: now },
      lastExtensionErrorAt: now,
    });
    if (openAfterSave || now - lastAt > 2000) {
      await chrome.tabs.create({
        url: `${apiBase}?error=${encodeURIComponent(message)}`,
      });
    }
    return null;
  }
}

async function getLastSavedGroupId() {
  const res = await storageGet(["lastSavedGroupId"]);
  return res.lastSavedGroupId || null;
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

async function getTabContext(tabId) {
  const tab =
    tabId != null ? await chrome.tabs.get(tabId).catch(() => null) : null;
  const windowId = tab?.windowId;
  const highlightedTabs = await chrome.tabs.query(
    windowId != null
      ? { highlighted: true, windowId }
      : { highlighted: true, currentWindow: true },
  );

  let activeTabGroup = null;
  const activeTab =
    highlightedTabs.find((t) => t.id === tabId) ||
    highlightedTabs.find((t) => t.active) ||
    highlightedTabs[0] ||
    tab;

  if (
    chrome.tabGroups &&
    activeTab &&
    activeTab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE
  ) {
    try {
      activeTabGroup = await chrome.tabGroups.get(activeTab.groupId);
    } catch {
      activeTabGroup = null;
    }
  }

  return {
    tabId: activeTab?.id ?? tabId ?? null,
    activeTab: activeTab
      ? {
          id: activeTab.id,
          url: activeTab.url,
          title: activeTab.title,
          active: activeTab.active,
          groupId: activeTab.groupId,
        }
      : null,
    highlightedTabs: highlightedTabs.map((t) => ({
      id: t.id,
      url: t.url,
      title: t.title,
      active: t.active,
      groupId: t.groupId,
    })),
    activeTabGroup: activeTabGroup
      ? { id: activeTabGroup.id, title: activeTabGroup.title }
      : null,
  };
}

async function ensureOverlay(tabId, payload = {}) {
  if (tabId == null) return { ok: false, error: "No tab" };

  const tab = await chrome.tabs.get(tabId).catch(() => null);
  const url = tab?.url || "";
  if (
    !url ||
    url.startsWith("chrome://") ||
    url.startsWith("chrome-extension://") ||
    url.startsWith("https://chrome.google.com/webstore") ||
    url.startsWith("https://chromewebstore.google.com") ||
    url.startsWith("edge://") ||
    url.startsWith("about:")
  ) {
    await setBadge("!");
    return {
      ok: false,
      error: "Can't open on this page. Try a normal http(s) tab.",
    };
  }

  await storageSet({
    overlaySession: {
      tabId,
      open: true,
      at: Date.now(),
      rememberUrl: payload.rememberUrl || null,
    },
  });

  // Opening a fresh UI should not keep a stale completed job around.
  const existing = await storageGet(["activeSaveJob"]);
  const job = existing.activeSaveJob;
  if (
    job &&
    job.status !== "saving" &&
    Date.now() - (job.updatedAt || 0) > 8000
  ) {
    await storageRemove(["activeSaveJob"]);
  } else if (payload.rememberUrl && job && job.status !== "saving") {
    await storageRemove(["activeSaveJob"]);
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: [OVERLAY_FILE],
    });
  } catch (e) {
    console.warn("Overlay inject failed:", e);
    await setBadge("!");
    return {
      ok: false,
      error: "Can't open on this page. Try a normal http(s) tab.",
    };
  }

  // Give the content script a tick to register listeners, then show.
  await new Promise((r) => setTimeout(r, 30));

  try {
    await chrome.tabs.sendMessage(tabId, {
      type: "SHOW_OVERLAY",
      rememberUrl: payload.rememberUrl || null,
    });
  } catch (e) {
    console.warn("SHOW_OVERLAY message failed:", e);
  }

  await setBadge("");
  return { ok: true };
}

async function openSaveUi(tab, options = {}) {
  const target =
    tab ||
    (await chrome.tabs.query({ active: true, currentWindow: true }))[0] ||
    null;
  if (!target?.id) return { ok: false, error: "No active tab" };
  return ensureOverlay(target.id, options);
}

async function runSaveJob(message) {
  const tabId = message.tabId ?? null;
  const items = Array.isArray(message.items) ? message.items : [];
  const groupId = message.groupId || null;
  const newGroupName = message.newGroupName || null;
  const groupName = message.groupName || newGroupName || null;
  const id = message.jobId || jobId();
  const saveMode = message.saveMode || "active";

  if (!items.length) {
    throw new Error("No links to save");
  }

  const job = {
    id,
    tabId,
    status: "saving",
    groupId,
    groupName,
    saveMode,
    linkId: null,
    error: null,
    done: 0,
    total: items.length,
    updatedAt: Date.now(),
  };
  await setActiveSaveJob(job);
  await setBadge("…");

  // When startOnly is set, the message channel is released immediately and
  // executeSaveJob continues in the background (avoids "message channel closed").
  if (message.startOnly) {
    void executeSaveJob(job, {
      items,
      groupId,
      newGroupName,
      groupName,
      resolvedGroupId: groupId,
    }).catch((e) => {
      console.error("executeSaveJob:", e);
    });
    return job;
  }

  return executeSaveJob(job, {
    items,
    groupId,
    newGroupName,
    groupName,
    resolvedGroupId: groupId,
  });
}

async function executeSaveJob(job, opts) {
  const items = opts.items;
  const newGroupName = opts.newGroupName || null;
  const groupName = opts.groupName || null;
  let resolvedGroupId = opts.resolvedGroupId || opts.groupId || null;
  let savedLink = null;
  let failed = 0;
  let skipped = 0;

  // Keep the MV3 service worker alive across long multi-link batches.
  const keepAliveAlarm = `m404-save-${job.id}`;
  try {
    await chrome.alarms.create(keepAliveAlarm, { periodInMinutes: 0.4 });
  } catch {
    // alarms may be unavailable in some contexts
  }

  try {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const url = typeof item.url === "string" ? item.url.trim() : "";

      if (!isLikelyUrl(url)) {
        skipped += 1;
        job.done = i + 1;
        job.failed = failed;
        job.skipped = skipped;
        job.updatedAt = Date.now();
        await setActiveSaveJob({ ...job });
        continue;
      }

      try {
        let meta = {
          title: item.title || null,
          description: item.description ?? null,
          imageUrl: item.imageUrl ?? null,
        };

        if ((!meta.title || !meta.imageUrl) && item.tabId != null) {
          const pageMeta = await extractPageMeta(item.tabId);
          meta = {
            title: meta.title || pageMeta.title,
            description: meta.description ?? pageMeta.description,
            imageUrl: meta.imageUrl ?? pageMeta.imageUrl,
          };
        }

        const options = {
          title: meta.title || item.title || url,
          description: meta.description,
          imageUrl: meta.imageUrl,
        };

        if (i === 0 && newGroupName && !resolvedGroupId) {
          options.newGroupName = newGroupName;
        } else if (resolvedGroupId) {
          options.groupId = resolvedGroupId;
        } else if (newGroupName) {
          options.newGroupName = newGroupName;
        }

        const { link } = await saveUrlToApp(url, options);
        if (link?.groupId) resolvedGroupId = link.groupId;
        if (!savedLink || item.active) savedLink = link;
      } catch (itemErr) {
        failed += 1;
        job.lastItemError =
          itemErr instanceof Error ? itemErr.message : "Failed to save link";
        console.warn("Save item failed:", url, job.lastItemError);
      }

      job.done = i + 1;
      job.failed = failed;
      job.skipped = skipped;
      job.groupId = resolvedGroupId;
      job.updatedAt = Date.now();
      await setActiveSaveJob({ ...job });
    }

    if (resolvedGroupId) {
      await storageSet({ lastSavedGroupId: resolvedGroupId });
    }

    const savedCount = job.total - failed - skipped;
    if (savedCount <= 0 && failed > 0) {
      const failedJob = {
        ...job,
        status: "error",
        error: job.lastItemError || `Failed to save ${failed} link${failed === 1 ? "" : "s"}`,
        updatedAt: Date.now(),
      };
      await setActiveSaveJob(failedJob);
      await setBadge("!");
      return failedJob;
    }

    const doneJob = {
      ...job,
      status: "saved",
      linkId: savedLink?.id || (items.length > 1 ? "multiple" : null),
      groupId: resolvedGroupId,
      groupName,
      failed,
      skipped,
      updatedAt: Date.now(),
    };
    await setActiveSaveJob(doneJob);
    await setBadge("✓");
    setTimeout(() => void setBadge(""), 2500);
    return doneJob;
  } catch (e) {
    const failedJob = {
      ...job,
      status: "error",
      error: e instanceof Error ? e.message : "Failed to save",
      updatedAt: Date.now(),
    };
    await setActiveSaveJob(failedJob);
    await setBadge("!");
    throw e;
  } finally {
    try {
      await chrome.alarms.clear(keepAliveAlarm);
    } catch {
      // ignore
    }
  }
}

chrome.alarms.onAlarm.addListener(() => {
  // No-op: periodic alarms keep the service worker alive during long batch saves.
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
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
});

chrome.action.onClicked.addListener((tab) => {
  void openSaveUi(tab);
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const url = getUrlFromContext(info, tab);

  if (info.menuItemId === "lk-save") {
    if (tab?.id) {
      const opened = await openSaveUi(tab, {
        rememberUrl: url && isLikelyUrl(url) ? url : null,
      });
      if (opened.ok) return;
    }
    if (!url) return;
    const lastSavedGroupId = await getLastSavedGroupId();
    await handleSave(url, false, { groupId: lastSavedGroupId || undefined });
    return;
  }

  if (info.menuItemId === "lk-save-open") {
    if (!url) return;
    const lastSavedGroupId = await getLastSavedGroupId();
    await handleSave(url, true, { groupId: lastSavedGroupId || undefined });
    return;
  }

  if (info.menuItemId === "lk-save-selected") {
    const tabs = await chrome.tabs.query({
      highlighted: true,
      currentWindow: true,
    });
    const urls = tabs.map((t) => t.url).filter(isLikelyUrl);
    if (!urls.length) return;
    const lastSavedGroupId = await getLastSavedGroupId();
    for (const u of urls) {
      await handleSave(u, false, { groupId: lastSavedGroupId || undefined });
    }
    return;
  }

  if (info.menuItemId === "lk-save-group") {
    if (!chrome.tabGroups) return;
    const targetGroupId = tab?.groupId;
    if (
      targetGroupId == null ||
      targetGroupId === chrome.tabGroups.TAB_GROUP_ID_NONE
    ) {
      return;
    }

    let groupName = "";
    try {
      const gInfo = await chrome.tabGroups.get(targetGroupId);
      if (gInfo && gInfo.title) groupName = gInfo.title.trim();
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
        const savedLink = await handleSave(u, false, {
          newGroupName: groupName,
        });
        if (savedLink && savedLink.groupId) {
          activeGroupId = savedLink.groupId;
        }
        isFirst = false;
      } else {
        await handleSave(u, false, { groupId: activeGroupId || undefined });
      }
    }
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
      const { apiBase: base } = await saveUrlToApp(input);
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

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status !== "complete") return;
  void (async () => {
    const { overlaySession, activeSaveJob } = await storageGet([
      "overlaySession",
      "activeSaveJob",
    ]);
    const sessionOpen =
      overlaySession && overlaySession.open && overlaySession.tabId === tabId;
    const jobActive =
      activeSaveJob &&
      activeSaveJob.tabId === tabId &&
      (activeSaveJob.status === "saving" ||
        (activeSaveJob.status === "saved" &&
          Date.now() - (activeSaveJob.updatedAt || 0) < 8000));

    if (!sessionOpen && !jobActive) return;

    await ensureOverlay(tabId, {
      rememberUrl: overlaySession?.rememberUrl || null,
    });
  })();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message.type !== "string") return;

  if (message.type === "REMEMBER_LINK") {
    void (async () => {
      const url = typeof message.url === "string" ? message.url.trim() : "";
      if (!isLikelyUrl(url)) {
        sendResponse({ ok: false, error: "Invalid link" });
        return;
      }

      await storageSet({
        pendingRememberUrl: url,
        pendingRememberAt: Date.now(),
      });

      const tabId = sender.tab?.id;
      if (tabId != null) {
        const opened = await ensureOverlay(tabId, { rememberUrl: url });
        if (opened.ok) {
          sendResponse({ ok: true, mode: "overlay" });
          return;
        }
      }

      const lastSavedGroupId = await getLastSavedGroupId();
      const link = await handleSave(url, false, {
        groupId: lastSavedGroupId || undefined,
      });
      await storageRemove(["pendingRememberUrl", "pendingRememberAt"]);
      sendResponse(
        link
          ? { ok: true, mode: "saved" }
          : { ok: false, error: "Save failed" },
      );
    })();
    return true;
  }

  if (message.type === "OPEN_SAVE_UI") {
    void (async () => {
      const tab =
        sender.tab ||
        (await chrome.tabs.query({ active: true, currentWindow: true }))[0];
      const result = await openSaveUi(tab, {
        rememberUrl: message.rememberUrl || null,
      });
      sendResponse(result);
    })();
    return true;
  }

  if (message.type === "GET_OVERLAY_CONTEXT") {
    void (async () => {
      try {
        const tabId = message.tabId ?? sender.tab?.id ?? null;
        const ctx = await getTabContext(tabId);
        const stored = await storageGet([
          "apiBase",
          "lastSavedGroupId",
          "cachedGroups",
          "pendingRememberUrl",
          "pendingRememberAt",
          "activeSaveJob",
          "lastExtensionError",
        ]);

        let pendingRememberUrl = null;
        const pendingUrl =
          typeof stored.pendingRememberUrl === "string"
            ? stored.pendingRememberUrl.trim()
            : "";
        const pendingAt =
          typeof stored.pendingRememberAt === "number"
            ? stored.pendingRememberAt
            : 0;
        if (pendingUrl && Date.now() - pendingAt < 2 * 60 * 1000) {
          pendingRememberUrl = pendingUrl;
        }
        if (pendingUrl) {
          await storageRemove(["pendingRememberUrl", "pendingRememberAt"]);
        }

        let lastError = null;
        const extErr = stored.lastExtensionError;
        if (
          extErr &&
          typeof extErr.message === "string" &&
          extErr.message.trim() &&
          typeof extErr.at === "number" &&
          Date.now() - extErr.at < 5 * 60 * 1000
        ) {
          lastError = extErr.message.trim();
          await storageRemove(["lastExtensionError", "lastExtensionErrorAt"]);
        }

        sendResponse({
          ok: true,
          apiBase:
            typeof stored.apiBase === "string" && stored.apiBase.trim()
              ? stored.apiBase.trim()
              : DEFAULT_API_BASE,
          lastSavedGroupId: stored.lastSavedGroupId || null,
          cachedGroups: Array.isArray(stored.cachedGroups)
            ? stored.cachedGroups
            : [],
          pendingRememberUrl,
          activeSaveJob: stored.activeSaveJob || null,
          lastError,
          ...ctx,
        });
      } catch (e) {
        sendResponse({
          ok: false,
          error: e instanceof Error ? e.message : "Failed to load context",
        });
      }
    })();
    return true;
  }

  if (message.type === "FETCH_GROUPS") {
    void (async () => {
      try {
        const groups = await fetchGroupsFromApi();
        sendResponse({ ok: true, groups });
      } catch (e) {
        sendResponse({
          ok: false,
          error: e instanceof Error ? e.message : "Failed to load groups",
        });
      }
    })();
    return true;
  }

  if (message.type === "CREATE_GROUP") {
    void (async () => {
      try {
        const name =
          typeof message.name === "string" ? message.name.trim() : "";
        if (!name) {
          sendResponse({ ok: false, error: "Group name required" });
          return;
        }
        const group = await createGroupFromApi(name);
        sendResponse({ ok: true, group });
      } catch (e) {
        sendResponse({
          ok: false,
          error: e instanceof Error ? e.message : "Failed to create group",
        });
      }
    })();
    return true;
  }

  if (message.type === "SET_API_BASE") {
    void (async () => {
      const value =
        typeof message.apiBase === "string" ? message.apiBase.trim() : "";
      await storageSet({ apiBase: value || DEFAULT_API_BASE });
      sendResponse({ ok: true, apiBase: value || DEFAULT_API_BASE });
    })();
    return true;
  }

  if (message.type === "START_SAVE_JOB") {
    void (async () => {
      try {
        const tabId = message.tabId ?? sender.tab?.id ?? null;
        // Ack as soon as the job is queued — don't hold the channel open for the
        // full network save (that triggers "message channel closed").
        const job = await runSaveJob({ ...message, tabId, startOnly: true });
        sendResponse({ ok: true, job });
      } catch (e) {
        sendResponse({
          ok: false,
          error: e instanceof Error ? e.message : "Failed to save",
        });
      }
    })();
    return true;
  }

  if (message.type === "CLOSE_OVERLAY") {
    void (async () => {
      const tabId = message.tabId ?? sender.tab?.id ?? null;
      const stored = await storageGet(["overlaySession", "activeSaveJob"]);
      const saving =
        stored.activeSaveJob?.tabId === tabId &&
        stored.activeSaveJob?.status === "saving";
      // Keep session while a save is in flight so navigation can restore the overlay.
      if (stored.overlaySession?.tabId === tabId && !saving) {
        await storageRemove(["overlaySession"]);
      }
      if (
        stored.activeSaveJob?.tabId === tabId &&
        stored.activeSaveJob?.status !== "saving"
      ) {
        await storageRemove(["activeSaveJob"]);
      }
      sendResponse({ ok: true });
    })();
    return true;
  }

  if (message.type === "GET_GROUP_TABS") {
    void (async () => {
      try {
        const groupId = message.groupId;
        if (groupId == null) {
          sendResponse({ ok: false, error: "No group" });
          return;
        }
        const tabs = await chrome.tabs.query({ groupId });
        sendResponse({
          ok: true,
          tabs: tabs.map((t) => ({
            id: t.id,
            url: t.url,
            title: t.title,
            active: t.active,
          })),
        });
      } catch (e) {
        sendResponse({
          ok: false,
          error: e instanceof Error ? e.message : "Failed to query tabs",
        });
      }
    })();
    return true;
  }

  return undefined;
});
