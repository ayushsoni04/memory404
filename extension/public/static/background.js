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

async function getAuthToken() {
  const res = await storageGet(["authToken"]);
  return typeof res.authToken === "string" && res.authToken.trim()
    ? res.authToken.trim()
    : null;
}

async function clearAuthToken() {
  await storageRemove(["authToken", "authEmail"]);
}

async function authHeaders(extra = {}) {
  const token = await getAuthToken();
  const headers = { ...extra };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function handleAuthFailure(status) {
  if (status === 401) {
    await clearAuthToken();
  }
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

function hostnameOfUrl(input) {
  try {
    return new URL(input).hostname.replace(/^www\./, "");
  } catch {
    return null;
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

const FETCH_TIMEOUT_MS = 12_000;
const STALE_SAVE_MS = 15_000;
const DEAD_SAVE_MS = 3 * 60_000;

/** Job id currently being executed in this service-worker instance. */
let activeRunnerId = null;

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
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
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

async function saveUrlToApp(url, options = {}) {
  const apiBase = await getApiBase();
  const payload = { url };
  if (options.groupId) payload.groupId = options.groupId;
  if (options.newGroupName) payload.newGroupName = options.newGroupName;
  if (options.title) payload.title = options.title;
  if (options.description != null) payload.description = options.description;
  // Skip client imageUrl on batch saves — uploading it server-side can hang;
  // enrichLinkMetadataInBackground fills previews after create.

  const token = await getAuthToken();
  if (!token) {
    throw new Error("Sign in to memory404 to save links");
  }

  const attempt = async () => {
    const res = await fetchWithTimeout(`${apiBase}/api/links`, {
      method: "POST",
      headers: await authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    });
    // Guard against a hung body read as well.
    const data = await withTimeout(
      res.json().catch(() => ({})),
      5_000,
      "Response parse",
    );
    return { res, data };
  };

  let { res, data } = await withTimeout(attempt(), FETCH_TIMEOUT_MS + 6_000, "Save");

  // Batch saves can hit the create rate limit — wait and retry once.
  if (res.status === 429) {
    const retryAfter = Number(res.headers.get("Retry-After") || "2");
    await new Promise((r) =>
      setTimeout(r, Math.min(60, Math.max(1, retryAfter)) * 1000),
    );
    ({ res, data } = await withTimeout(attempt(), FETCH_TIMEOUT_MS + 6_000, "Save retry"));
  }

  if (res.status === 401) {
    await handleAuthFailure(401);
    throw new Error("Your session expired. Sign in again.");
  }

  // classifyLinkSave is prepended from extension/src/save-outcome.js at build time.
  const outcome = classifyLinkSave(res.status, data);
  if (outcome.kind === "error") {
    throw new Error(outcome.message);
  }
  const link = outcome.link
    ? {
        ...outcome.link,
        groupId: outcome.link.groupId ?? options.groupId,
      }
    : null;
  return {
    apiBase,
    link,
    outcome: outcome.kind,
    message: outcome.message,
  };
}

async function fetchGroupsFromApi() {
  const apiBase = await getApiBase();
  const token = await getAuthToken();
  if (!token) {
    throw new Error("Sign in to memory404 to load groups");
  }
  const res = await fetchWithTimeout(`${apiBase}/api/groups`, {
    headers: await authHeaders(),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    await handleAuthFailure(401);
    throw new Error("Your session expired. Sign in again.");
  }
  if (!res.ok) throw new Error(data?.error || "Failed to load groups");
  const groups = Array.isArray(data.groups) ? data.groups : [];
  await storageSet({ cachedGroups: groups });
  return groups;
}

async function createGroupFromApi(name) {
  const apiBase = await getApiBase();
  const token = await getAuthToken();
  if (!token) {
    throw new Error("Sign in to memory404 to create groups");
  }
  const res = await fetchWithTimeout(`${apiBase}/api/groups`, {
    method: "POST",
    headers: await authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ name }),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    await handleAuthFailure(401);
    throw new Error("Your session expired. Sign in again.");
  }
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
    const message = explainSaveFailure(
      e instanceof Error ? e.message : "Failed to save from extension",
    );
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

async function openBlockedPage() {
  const pageUrl = chrome.runtime.getURL("blocked.html");
  try {
    const existing = await chrome.tabs.query({ url: pageUrl });
    const tab = existing.find((item) => item.id != null);
    if (tab?.id != null) {
      await chrome.tabs.update(tab.id, { active: true });
      if (tab.windowId != null) {
        await chrome.windows.update(tab.windowId, { focused: true });
      }
      return;
    }
    await chrome.tabs.create({ url: pageUrl });
  } catch (e) {
    console.warn("Could not open the blocked-page explanation:", e);
  }
}

async function ensureOverlay(tabId, payload = {}) {
  if (tabId == null) return { ok: false, error: "No tab" };

  const tab = await chrome.tabs.get(tabId).catch(() => null);
  const url = tab?.url || "";
  const blocked = blockedPageMessage(url);
  if (blocked) {
    await setBadge("!");
    await chrome.action.setTitle({ title: blocked });
    await openBlockedPage();
    return { ok: false, error: blocked };
  }

  await storageSet({
    overlaySession: {
      tabId,
      open: true,
      at: Date.now(),
      rememberUrl: payload.rememberUrl || null,
    },
  });

  // Drop interrupted / zombie batch jobs so opening the overlay always shows
  // a fresh picker instead of a stuck "Saving 21 of 31…" screen.
  await discardInterruptedSaveJobs();

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

  await chrome.action.setTitle({ title: "Save Link" });
  await setBadge("");
  return { ok: true };
}

async function openSaveUi(tab, options = {}) {
  const target =
    tab ||
    (await chrome.tabs.query({ active: true, currentWindow: true }))[0] ||
    null;
  if (!target?.id) return { ok: false, error: "No active tab" };
  // User opened the extension on purpose — never keep a zombie progress UI.
  await discardInterruptedSaveJobs({ force: true });
  return ensureOverlay(target.id, options);
}

/**
 * Remove zombie save jobs that would otherwise resurrect as a stuck progress UI.
 * Keeps a job only if this worker is actively running it and it updated recently.
 */
async function discardInterruptedSaveJobs({ force = false } = {}) {
  const { activeSaveJob } = await storageGet(["activeSaveJob"]);
  if (!activeSaveJob) return;

  const age = Date.now() - (activeSaveJob.updatedAt || 0);
  const isLive =
    activeSaveJob.status === "saving" &&
    activeRunnerId === activeSaveJob.id &&
    age < STALE_SAVE_MS;

  if (isLive && !force) return;

  // Force-open (toolbar click) always clears unless updated in the last 2s.
  if (force && activeSaveJob.status === "saving" && age < 2_000 && isLive) {
    return;
  }

  activeRunnerId = null;
  await storageRemove(["activeSaveJob"]);
  await setBadge("");
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

  // New batch always wins over a previous stuck runner.
  activeRunnerId = null;

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
    failed: 0,
    skipped: 0,
    // Persist the snapshot so the worker can finish even if tabs (or the
    // overlay page) are closed mid-batch.
    items,
    itemResults: items.map((item) => ({
      url: typeof item?.url === "string" ? item.url.trim() : "",
      title:
        (typeof item?.title === "string" && item.title.trim()) ||
        hostnameOfUrl(typeof item?.url === "string" ? item.url : "") ||
        "Link",
      status: "pending",
      error: null,
    })),
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
      startIndex: 0,
      failed: 0,
      skipped: 0,
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
    startIndex: 0,
    failed: 0,
    skipped: 0,
  });
}

async function executeSaveJob(job, opts) {
  const items = opts.items;
  const newGroupName = opts.newGroupName || null;
  const groupName = opts.groupName || null;
  let resolvedGroupId = opts.resolvedGroupId || opts.groupId || null;
  let savedLink = null;
  let failed = opts.failed || 0;
  let skipped = opts.skipped || 0;
  let saved = 0;
  let already = 0;
  const startIndex = Math.max(0, Math.min(items.length, opts.startIndex || 0));
  const prior = Array.isArray(job.itemResults)
    ? job.itemResults.slice(0, startIndex)
    : [];
  for (const row of prior) {
    if (row?.status === "saved") saved += 1;
    else if (row?.status === "already") already += 1;
  }

  if (activeRunnerId && activeRunnerId !== job.id) {
    // Another job is in flight in this worker.
    return job;
  }
  activeRunnerId = job.id;

  // Keep the MV3 service worker alive across long multi-link batches.
  const keepAliveAlarm = `m404-save-${job.id}`;
  try {
    await chrome.alarms.create(keepAliveAlarm, { periodInMinutes: 0.4 });
  } catch {
    // alarms may be unavailable in some contexts
  }

  try {
    for (let i = startIndex; i < items.length; i++) {
      // saveLoopShouldStop is prepended from extension/src/save-cancel.js.
      if (saveLoopShouldStop(activeRunnerId, job.id)) return job;
      const item = items[i];
      const url = typeof item.url === "string" ? item.url.trim() : "";
      const results = Array.isArray(job.itemResults)
        ? [...job.itemResults]
        : items.map((it) => ({
            url: typeof it?.url === "string" ? it.url.trim() : "",
            title:
              (typeof it?.title === "string" && it.title.trim()) ||
              hostnameOfUrl(typeof it?.url === "string" ? it.url : "") ||
              "Link",
            status: "pending",
            error: null,
          }));

      if (!isLikelyUrl(url)) {
        skipped += 1;
        if (results[i]) {
          results[i] = {
            ...results[i],
            status: "skipped",
            // skipSaveReason is prepended from extension/src/page-url.js at build time.
            error: skipSaveReason(url),
          };
        }
        job.itemResults = results;
        job.done = i + 1;
        job.failed = failed;
        job.skipped = skipped;
        job.updatedAt = Date.now();
        await setActiveSaveJob({ ...job });
        continue;
      }

      if (results[i]) {
        results[i] = { ...results[i], status: "saving", error: null };
        job.itemResults = results;
        job.updatedAt = Date.now();
        await setActiveSaveJob({ ...job });
      }

      try {
        // Snapshot-only save: never touch the live tab.
        const title =
          (typeof item.title === "string" && item.title.trim()) ||
          hostnameOfUrl(url) ||
          url;

        const options = {
          title,
          description:
            typeof item.description === "string" ? item.description : null,
        };

        if (i === 0 && newGroupName && !resolvedGroupId) {
          options.newGroupName = newGroupName;
        } else if (resolvedGroupId) {
          options.groupId = resolvedGroupId;
        } else if (newGroupName) {
          options.newGroupName = newGroupName;
        }

        const result = await saveUrlToApp(url, options);
        if (saveLoopShouldStop(activeRunnerId, job.id)) return job;
        const link = result.link;
        if (link?.groupId) resolvedGroupId = link.groupId;
        if (!savedLink || item.active) savedLink = link;
        if (result.outcome === "duplicate") {
          already += 1;
          job.duplicateMessage = result.message;
          if (results[i]) {
            results[i] = {
              ...results[i],
              title: title || results[i].title,
              status: "already",
              error: result.message,
            };
          }
        } else if (results[i]) {
          saved += 1;
          results[i] = {
            ...results[i],
            title: title || results[i].title,
            status: "saved",
            error: null,
          };
        } else {
          saved += 1;
        }
      } catch (itemErr) {
        if (saveLoopShouldStop(activeRunnerId, job.id)) return job;
        failed += 1;
        job.lastItemError = explainSaveFailure(
          itemErr instanceof Error ? itemErr.message : "Failed to save link",
        );
        console.warn("Save item failed:", url, job.lastItemError);
        if (results[i]) {
          results[i] = {
            ...results[i],
            status: "failed",
            error: job.lastItemError,
          };
        }
      }

      job.itemResults = results;
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

    job.saved = saved;
    job.already = already;
    // saveJobSettled is prepended from extension/src/save-outcome.js at build time.
    const settled = saveJobSettled({ saved, already, failed, skipped });
    if (settled.status === "error") {
      const failedJob = {
        ...job,
        status: "error",
        error: job.lastItemError || `Failed to save ${failed} link${failed === 1 ? "" : "s"}`,
        updatedAt: Date.now(),
      };
      await setActiveSaveJob(failedJob);
      await setBadge(settled.badge);
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
      saved,
      already,
      duplicateMessage:
        saved === 0 && already > 0 ? job.duplicateMessage : null,
      updatedAt: Date.now(),
    };
    await setActiveSaveJob(doneJob);
    if (settled.badge) {
      await setBadge(settled.badge);
      setTimeout(() => void setBadge(""), 2500);
    } else {
      await setBadge("");
    }
    return doneJob;
  } catch (e) {
    const failedJob = {
      ...job,
      status: "error",
      error: explainSaveFailure(e instanceof Error ? e.message : "Failed to save"),
      updatedAt: Date.now(),
    };
    await setActiveSaveJob(failedJob);
    await setBadge("!");
    throw e;
  } finally {
    if (activeRunnerId === job.id) activeRunnerId = null;
    try {
      await chrome.alarms.clear(keepAliveAlarm);
    } catch {
      // ignore
    }
  }
}

/**
 * If a batch save was interrupted (SW slept / hung), continue from job.done
 * using the persisted URL snapshot.
 */
async function resumeSaveJobIfNeeded() {
  const { activeSaveJob } = await storageGet(["activeSaveJob"]);
  if (!activeSaveJob || activeSaveJob.status !== "saving") return null;

  const age = Date.now() - (activeSaveJob.updatedAt || 0);
  const items = Array.isArray(activeSaveJob.items) ? activeSaveJob.items : [];

  if (!items.length) {
    await setActiveSaveJob({
      ...activeSaveJob,
      status: "error",
      error: "Save interrupted — no links to resume",
      updatedAt: Date.now(),
    });
    return null;
  }

  if (age > DEAD_SAVE_MS) {
    await setActiveSaveJob({
      ...activeSaveJob,
      status: "error",
      error: "Save interrupted — try again",
      updatedAt: Date.now(),
    });
    await setBadge("!");
    return null;
  }

  // Already running and still making progress.
  if (activeRunnerId === activeSaveJob.id && age < STALE_SAVE_MS) return null;

  // Stale progress → previous runner is probably wedged; take over.
  if (age >= STALE_SAVE_MS) {
    activeRunnerId = null;
  } else if (activeRunnerId != null) {
    return null;
  }

  // Continue from the next unfinished index.
  const startIndex = Math.max(0, activeSaveJob.done || 0);
  if (startIndex >= items.length) {
    await setActiveSaveJob({
      ...activeSaveJob,
      status: "saved",
      linkId: activeSaveJob.linkId || "multiple",
      updatedAt: Date.now(),
    });
    return null;
  }

  console.info("Resuming save job", activeSaveJob.id, "from", startIndex);
  void executeSaveJob(activeSaveJob, {
    items,
    groupId: activeSaveJob.groupId || null,
    groupName: activeSaveJob.groupName || null,
    resolvedGroupId: activeSaveJob.groupId || null,
    startIndex,
    failed: activeSaveJob.failed || 0,
    skipped: activeSaveJob.skipped || 0,
  }).catch((e) => console.error("resumeSaveJob:", e));

  return activeSaveJob;
}

chrome.alarms.onAlarm.addListener((alarm) => {
  // Keepalive + resume interrupted batch saves after the SW wakes.
  if (typeof alarm?.name === "string" && alarm.name.startsWith("m404-save-")) {
    void resumeSaveJobIfNeeded();
  }
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
        // If a previous SW died mid-batch, continue from the snapshot.
        await resumeSaveJobIfNeeded();

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
          error: explainSaveFailure(
            e instanceof Error ? e.message : "Failed to load groups",
          ),
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
          error: explainSaveFailure(
            e instanceof Error ? e.message : "Failed to create group",
          ),
        });
      }
    })();
    return true;
  }

  if (message.type === "SIGN_IN") {
    void (async () => {
      try {
        const apiBase = await getApiBase();
        const email = typeof message.email === "string" ? message.email.trim() : "";
        const password = typeof message.password === "string" ? message.password : "";
        if (!email || !password) {
          sendResponse({ ok: false, error: "Email and password are required" });
          return;
        }
        const res = await fetchWithTimeout(`${apiBase}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await withTimeout(
          res.json().catch(() => ({})),
          5_000,
          "Sign-in response",
        );
        if (!res.ok) {
          sendResponse({ ok: false, error: data?.error || "Failed to sign in" });
          return;
        }
        if (typeof data.token !== "string" || !data.token) {
          sendResponse({ ok: false, error: "Server did not return an auth token" });
          return;
        }
        await storageSet({
          authToken: data.token,
          authEmail: typeof data.user?.email === "string" ? data.user.email : email,
        });
        sendResponse({ ok: true, email: data.user?.email || email });
      } catch (e) {
        sendResponse({
          ok: false,
          error: explainSaveFailure(e instanceof Error ? e.message : "Failed to sign in"),
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
          error: explainSaveFailure(e instanceof Error ? e.message : "Failed to save"),
        });
      }
    })();
    return true;
  }

  if (message.type === "RESUME_SAVE_JOB") {
    void (async () => {
      try {
        const job = await resumeSaveJobIfNeeded();
        const stored = await storageGet(["activeSaveJob"]);
        sendResponse({ ok: true, job: stored.activeSaveJob || job });
      } catch (e) {
        sendResponse({
          ok: false,
          error: explainSaveFailure(e instanceof Error ? e.message : "Failed to resume"),
        });
      }
    })();
    return true;
  }

  if (message.type === "CANCEL_SAVE_JOB") {
    void (async () => {
      try {
        const stored = await storageGet(["activeSaveJob"]);
        const job = stored.activeSaveJob;
        if (job && job.status === "saving") {
          activeRunnerId = null;
          // cancelledSaveJob is prepended from extension/src/save-cancel.js.
          await setActiveSaveJob(cancelledSaveJob(job));
          await setBadge("");
        } else {
          await storageRemove(["activeSaveJob"]);
        }
        sendResponse({ ok: true });
      } catch (e) {
        sendResponse({
          ok: false,
          error: e instanceof Error ? e.message : "Failed to cancel",
        });
      }
    })();
    return true;
  }

  if (message.type === "SAVE_LINK_NOTE") {
    void (async () => {
      try {
        const linkId =
          typeof message.linkId === "string" ? message.linkId.trim() : "";
        const notes =
          typeof message.notes === "string" ? message.notes.trim() : "";
        if (!linkId || linkId === "multiple") {
          sendResponse({ ok: false, error: "Save one link before adding a note" });
          return;
        }
        if (!notes) {
          sendResponse({ ok: true });
          return;
        }
        const apiBase = await getApiBase();
        const token = await getAuthToken();
        if (!token) {
          sendResponse({ ok: false, error: "Sign in to memory404 to save links" });
          return;
        }
        const res = await fetchWithTimeout(
          `${apiBase}/api/links/${encodeURIComponent(linkId)}`,
          {
            method: "PATCH",
            headers: await authHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify({ notes }),
          },
        );
        const data = await withTimeout(
          res.json().catch(() => ({})),
          5_000,
          "Note response",
        );
        if (res.status === 401) {
          await handleAuthFailure(401);
          sendResponse({ ok: false, error: "Your session expired. Sign in again." });
          return;
        }
        if (!res.ok) {
          sendResponse({
            ok: false,
            error: data?.error || "Could not save the note",
          });
          return;
        }
        sendResponse({ ok: true });
      } catch (e) {
        sendResponse({
          ok: false,
          error: explainSaveFailure(
            e instanceof Error ? e.message : "Could not save the note",
          ),
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
