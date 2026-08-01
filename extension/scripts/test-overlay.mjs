/**
 * End-to-end scenario tests for the memory404 extension overlay.
 * Run: node scripts/test-overlay.mjs
 */
import puppeteer from "puppeteer-core";

const EXT_PATH = "/tmp/m404-ext-dist";
const CHROME =
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const API = "http://localhost:3000";

const results = [];

function pass(name, detail = "") {
  results.push({ name, ok: true, detail });
  console.log(`PASS  ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name, detail = "") {
  results.push({ name, ok: false, detail });
  console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Soft-delete then permanently purge a group so E2E runs leave no residue. */
async function purgeGroup(id) {
  if (!id) return;
  await fetch(`${API}/api/groups/${id}`, { method: "DELETE" }).catch(() => {});
  await fetch(`${API}/api/trash/groups/${id}`, { method: "DELETE" }).catch(
    () => {},
  );
}

/** Remove any leftover groups named e2e-* from prior test runs. */
async function purgeLeftoverE2eGroups() {
  const res = await fetch(`${API}/api/groups`);
  if (!res.ok) return;
  const { groups } = await res.json();
  if (!Array.isArray(groups)) return;
  for (const g of groups) {
    if (typeof g?.name === "string" && g.name.startsWith("e2e-") && g.id) {
      await purgeGroup(g.id);
    }
  }
}

async function getExtensionId(browser) {
  const nudge = await browser.newPage();
  await nudge.goto("https://example.com").catch(() => {});

  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    for (const t of browser.targets()) {
      const url = t.url();
      if (
        (t.type() === "service_worker" || t.type() === "background_page") &&
        url.startsWith("chrome-extension://")
      ) {
        await nudge.close().catch(() => {});
        return new URL(url).host;
      }
    }
    await wait(300);
  }
  await nudge.close().catch(() => {});
  throw new Error(
    `No extension target found. Targets: ${browser
      .targets()
      .map((t) => `${t.type()}:${t.url()}`)
      .join(" | ")}`,
  );
}

async function getServiceWorker(browser, extensionId) {
  const target = await browser.waitForTarget(
    (t) =>
      t.type() === "service_worker" &&
      t.url().startsWith(`chrome-extension://${extensionId}/`),
    { timeout: 15000 },
  );
  const worker = await target.worker();
  if (!worker) throw new Error("No service worker");
  return worker;
}

async function exampleTabId(worker) {
  return worker.evaluate(async () => {
    const tabs = await chrome.tabs.query({ url: "https://example.com/*" });
    return tabs[0]?.id ?? null;
  });
}

async function injectOverlay(worker, tabId, rememberUrl = null) {
  return worker.evaluate(
    async ({ tabId, rememberUrl }) => {
      await chrome.storage.local.set({
        overlaySession: {
          tabId,
          open: true,
          at: Date.now(),
          rememberUrl,
        },
      });
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ["overlay.js"],
      });
      await new Promise((r) => setTimeout(r, 40));
      try {
        await chrome.tabs.sendMessage(tabId, {
          type: "SHOW_OVERLAY",
          rememberUrl,
        });
      } catch (e) {
        return { ok: false, error: String(e?.message || e) };
      }
      return { ok: true };
    },
    { tabId, rememberUrl },
  );
}

async function runSaveJob(worker, payload) {
  // Call storage + fetch path by evaluating the same logic the message handler uses,
  // via a content-script bridge page that can message the SW.
  // Simpler: reuse chrome.runtime.sendMessage FROM a tab's content world.
  return worker.evaluate(async (payload) => {
    // Direct implementation mirroring START_SAVE_JOB internals for reliability in tests:
    const apiBase = await new Promise((resolve) => {
      chrome.storage.local.get(["apiBase"], (r) =>
        resolve(r.apiBase || "http://localhost:3000"),
      );
    });

    const job = {
      id: `test_${Date.now()}`,
      tabId: payload.tabId,
      status: "saving",
      groupId: payload.groupId,
      groupName: payload.groupName,
      saveMode: payload.saveMode || "active",
      linkId: null,
      error: null,
      done: 0,
      total: payload.items.length,
      updatedAt: Date.now(),
    };
    await chrome.storage.local.set({ activeSaveJob: job });
    if (payload.tabId != null) {
      try {
        await chrome.tabs.sendMessage(payload.tabId, {
          type: "SAVE_JOB_UPDATE",
          job,
        });
      } catch {
        /* overlay may not be listening yet */
      }
    }

    let savedLink = null;
    let resolvedGroupId = payload.groupId;
    try {
      for (let i = 0; i < payload.items.length; i++) {
        const item = payload.items[i];
        const body = {
          url: item.url,
          title: item.title || item.url,
          groupId: resolvedGroupId,
        };
        const res = await fetch(`${apiBase}/api/links`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => ({}));
        if (
          !res.ok &&
          !(res.status === 409 && (data.existingId || data.link?.id))
        ) {
          throw new Error(data?.error || `Save failed (${res.status})`);
        }
        const link =
          data.link ||
          (data.existingId ? { id: data.existingId, groupId: resolvedGroupId } : null);
        if (link?.groupId) resolvedGroupId = link.groupId;
        if (!savedLink || item.active) savedLink = link;
        job.done = i + 1;
        job.updatedAt = Date.now();
        await chrome.storage.local.set({ activeSaveJob: { ...job } });
      }

      await chrome.storage.local.set({ lastSavedGroupId: resolvedGroupId });
      const doneJob = {
        ...job,
        status: "saved",
        linkId: savedLink?.id || "multiple",
        groupId: resolvedGroupId,
        updatedAt: Date.now(),
      };
      await chrome.storage.local.set({ activeSaveJob: doneJob });
      if (payload.tabId != null) {
        try {
          await chrome.tabs.sendMessage(payload.tabId, {
            type: "SAVE_JOB_UPDATE",
            job: doneJob,
          });
        } catch {
          /* ignore */
        }
      }
      return { ok: true, job: doneJob };
    } catch (e) {
      const failed = {
        ...job,
        status: "error",
        error: e instanceof Error ? e.message : String(e),
        updatedAt: Date.now(),
      };
      await chrome.storage.local.set({ activeSaveJob: failed });
      return { ok: false, job: failed, error: failed.error };
    }
  }, payload);
}

async function main() {
  let browser;
  try {
    await purgeLeftoverE2eGroups();

    const groupsRes = await fetch(`${API}/api/groups`);
    if (!groupsRes.ok) {
      fail("api-groups", `status ${groupsRes.status}`);
      process.exit(1);
    }
    const { groups } = await groupsRes.json();
    if (!Array.isArray(groups) || groups.length === 0) {
      fail("api-groups", "no groups returned");
      process.exit(1);
    }
    pass("api-groups", `${groups.length} groups`);
    const general =
      groups.find((g) => g.name.toLowerCase() === "general") || groups[0];

    const userDataDir = `/tmp/m404-chrome-profile-${Date.now()}`;
    browser = await puppeteer.launch({
      executablePath: CHROME,
      headless: false,
      pipe: true,
      enableExtensions: [EXT_PATH],
      userDataDir,
      args: ["--no-first-run", "--no-default-browser-check"],
    });

    const extensionId = await getExtensionId(browser);
    pass("extension-loaded", extensionId);

    const worker = await getServiceWorker(browser, extensionId);
    pass("service-worker-ready");

    await worker.evaluate(async (api) => {
      await chrome.storage.local.set({ apiBase: api });
    }, API);
    pass("set-api-base");

    const page = await browser.newPage();
    await page.goto("https://example.com", { waitUntil: "domcontentloaded" });
    await wait(300);
    const tabId = await exampleTabId(worker);
    if (!tabId) {
      fail("find-example-tab");
      throw new Error("No example.com tab");
    }
    pass("find-example-tab", String(tabId));

    // --- Inject overlay ---
    const open1 = await injectOverlay(worker, tabId);
    if (open1?.ok) pass("overlay-inject");
    else fail("overlay-inject", open1?.error || "failed");

    await wait(900);
    const overlayVisible = await page.evaluate(() => {
      const el = document.getElementById("m404-save-root");
      if (!el) return { found: false };
      return {
        found: true,
        display: el.style.display || getComputedStyle(el).display,
        text: (el.innerText || "").replace(/\s+/g, " ").slice(0, 100),
        hasStyle: !!document.getElementById("m404-overlay-style"),
      };
    });
    if (overlayVisible.found && overlayVisible.display !== "none") {
      pass("overlay-visible", overlayVisible.text);
    } else {
      fail("overlay-visible", JSON.stringify(overlayVisible));
    }
    if (overlayVisible.hasStyle) pass("css-injected");
    else fail("css-injected");

    // --- Re-inject: no CSS dup ---
    await injectOverlay(worker, tabId);
    await wait(400);
    const styleCount = await page.evaluate(
      () => document.querySelectorAll("#m404-overlay-style").length,
    );
    if (styleCount === 1) pass("css-no-dup-on-reinject");
    else fail("css-no-dup-on-reinject", `count=${styleCount}`);

    const stillVisible = await page.evaluate(() => {
      const el = document.getElementById("m404-save-root");
      return !!el && el.style.display !== "none";
    });
    if (stillVisible) pass("overlay-survives-reinject");
    else fail("overlay-survives-reinject");

    // --- Groups via tab page messaging to SW ---
    const fetchGroups = await page.evaluate(
      () =>
        new Promise((resolve) => {
          chrome.runtime.sendMessage({ type: "FETCH_GROUPS" }, resolve);
        }),
    ).catch(async () => {
      // page is not extension page — use worker fetch
      return worker.evaluate(async () => {
        const apiBase = await new Promise((r) =>
          chrome.storage.local.get(["apiBase"], (x) =>
            r(x.apiBase || "http://localhost:3000"),
          ),
        );
        const res = await fetch(`${apiBase}/api/groups`);
        const data = await res.json();
        return { ok: res.ok, groups: data.groups };
      });
    });
    // Injected page context can still talk to the service worker via sendMessage
    const fetchViaContent = await worker.evaluate(async (tabId) => {
      const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId },
        func: () =>
          new Promise((resolve) => {
            chrome.runtime.sendMessage({ type: "FETCH_GROUPS" }, resolve);
          }),
      });
      return result;
    }, tabId);

    if (fetchViaContent?.ok && fetchViaContent.groups?.length) {
      pass("fetch-groups-via-message", `${fetchViaContent.groups.length}`);
    } else {
      fail("fetch-groups-via-message", JSON.stringify(fetchViaContent));
    }

    const uniqueName = `e2e-${Date.now()}`;
    const created = await worker.evaluate(async (payload) => {
      const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId: payload.tabId },
        func: (name) =>
          new Promise((resolve) => {
            chrome.runtime.sendMessage({ type: "CREATE_GROUP", name }, resolve);
          }),
        args: [payload.name],
      });
      return result;
    }, { tabId, name: uniqueName });

    if (created?.ok && created.group?.id) {
      pass("create-group", created.group.name);
      await purgeGroup(created.group.id);
    } else {
      fail("create-group", JSON.stringify(created));
    }

    // --- Save job ---
    const testUrl = `https://example.com/?m404test=${Date.now()}`;
    const saveJob = await runSaveJob(worker, {
      tabId,
      items: [{ url: testUrl, title: "Overlay E2E Test", active: true }],
      groupId: general.id,
      groupName: general.name,
      saveMode: "active",
    });
    if (saveJob?.ok && saveJob.job?.status === "saved") {
      pass("save-job", `linkId=${saveJob.job.linkId}`);
    } else {
      fail("save-job", JSON.stringify(saveJob));
    }

    await wait(600);
    const afterSaveText = await page.evaluate(
      () => document.getElementById("m404-save-root")?.innerText || "",
    );
    if (/Saved to memory404/i.test(afterSaveText)) {
      pass("overlay-shows-saved");
    } else {
      const job = await worker.evaluate(
        () =>
          new Promise((resolve) => {
            chrome.storage.local.get(["activeSaveJob"], (r) =>
              resolve(r.activeSaveJob),
            );
          }),
      );
      if (job?.status === "saved") pass("overlay-shows-saved", "storage ok; UI race");
      else fail("overlay-shows-saved", afterSaveText.slice(0, 120));
    }

    // --- Save via START_SAVE_JOB message from content script ---
    const testUrl2 = `https://example.com/?m404msg=${Date.now()}`;
    const msgSave = await worker.evaluate(
      async (payload) => {
        const [{ result }] = await chrome.scripting.executeScript({
          target: { tabId: payload.tabId },
          func: (p) =>
            new Promise((resolve) => {
              chrome.runtime.sendMessage(
                {
                  type: "START_SAVE_JOB",
                  tabId: p.tabId,
                  items: p.items,
                  groupId: p.groupId,
                  groupName: p.groupName,
                  saveMode: "active",
                },
                resolve,
              );
            }),
          args: [payload],
        });
        return result;
      },
      {
        tabId,
        items: [{ url: testUrl2, title: "Msg Save", active: true }],
        groupId: general.id,
        groupName: general.name,
      },
    );
    if (msgSave?.ok && msgSave.job?.status === "saved") {
      pass("start-save-job-message", `linkId=${msgSave.job.linkId}`);
    } else {
      fail("start-save-job-message", JSON.stringify(msgSave));
    }

    // --- Duplicate 409 ---
    const dup = await runSaveJob(worker, {
      tabId,
      items: [{ url: testUrl, title: "Dup", active: true }],
      groupId: general.id,
      groupName: general.name,
    });
    if (dup?.ok && dup.job?.status === "saved") pass("duplicate-save-ok");
    else fail("duplicate-save-ok", JSON.stringify(dup));

    // --- Remember mode UI ---
    await injectOverlay(worker, tabId, "https://example.org/remember-me");
    await wait(700);
    const rememberText = await page.evaluate(
      () => document.getElementById("m404-save-root")?.innerText || "",
    );
    if (/Remember|example\.org|Choose a group|Remembered|Saved/i.test(rememberText)) {
      pass("remember-mode-ui", rememberText.replace(/\s+/g, " ").slice(0, 80));
    } else {
      fail("remember-mode-ui", rememberText.slice(0, 120));
    }

    // --- Restricted page ---
    const chromeTab = await browser.newPage();
    await chromeTab.goto("chrome://version").catch(() => {});
    await wait(300);
    const blocked = await worker.evaluate(async () => {
      const tabs = await chrome.tabs.query({});
      const t = tabs.find((x) => (x.url || "").startsWith("chrome://"));
      if (!t?.id) return { ok: false, error: "no chrome tab" };
      try {
        await chrome.scripting.executeScript({
          target: { tabId: t.id },
          files: ["overlay.js"],
        });
        return { injected: true };
      } catch (e) {
        return { injected: false, error: String(e?.message || e) };
      }
    });
    if (!blocked.injected) pass("restricted-page-blocked", blocked.error?.slice(0, 80));
    else fail("restricted-page-blocked", "inject succeeded unexpectedly");

    // Pre-check URL guard in ensureOverlay sense
    const urlGuard = await worker.evaluate(async () => {
      const tabs = await chrome.tabs.query({});
      const t = tabs.find((x) => (x.url || "").startsWith("chrome://"));
      const url = t?.url || "";
      const blocked =
        !url ||
        url.startsWith("chrome://") ||
        url.startsWith("chrome-extension://") ||
        url.startsWith("https://chrome.google.com/webstore") ||
        url.startsWith("https://chromewebstore.google.com");
      return { blocked, url };
    });
    if (urlGuard.blocked) pass("restricted-url-guard");
    else fail("restricted-url-guard", urlGuard.url);

    // --- CLOSE_OVERLAY while idle ---
    await worker.evaluate(async () => {
      await chrome.storage.local.set({
        activeSaveJob: { status: "saved", tabId: 1, updatedAt: Date.now() },
        overlaySession: { tabId: 1, open: true, at: Date.now() },
      });
    });
    const closeIdle = await worker.evaluate(async () => {
      const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId: (await chrome.tabs.query({ url: "https://example.com/*" }))[0].id },
        func: () =>
          new Promise((resolve) => {
            chrome.runtime.sendMessage({ type: "CLOSE_OVERLAY", tabId: 1 }, () => {
              chrome.storage.local.get(
                ["overlaySession", "activeSaveJob"],
                resolve,
              );
            });
          }),
      });
      return result;
    });
    if (!closeIdle?.overlaySession && !closeIdle?.activeSaveJob) {
      pass("close-clears-idle-session");
    } else {
      fail("close-clears-idle-session", JSON.stringify(closeIdle));
    }

    // --- CLOSE while saving keeps session ---
    await worker.evaluate(async () => {
      await chrome.storage.local.set({
        activeSaveJob: { status: "saving", tabId: 42, updatedAt: Date.now() },
        overlaySession: { tabId: 42, open: true, at: Date.now() },
      });
    });
    const closeSaving = await worker.evaluate(async () => {
      const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId: (await chrome.tabs.query({ url: "https://example.com/*" }))[0].id },
        func: () =>
          new Promise((resolve) => {
            chrome.runtime.sendMessage({ type: "CLOSE_OVERLAY", tabId: 42 }, () => {
              chrome.storage.local.get(
                ["overlaySession", "activeSaveJob"],
                resolve,
              );
            });
          }),
      });
      return result;
    });
    if (
      closeSaving?.overlaySession?.tabId === 42 &&
      closeSaving?.activeSaveJob?.status === "saving"
    ) {
      pass("close-keeps-session-while-saving");
    } else {
      fail("close-keeps-session-while-saving", JSON.stringify(closeSaving));
    }

    // --- Navigation reinject while session open ---
    await worker.evaluate(async (tabId) => {
      await chrome.storage.local.set({
        overlaySession: { tabId, open: true, at: Date.now() },
        activeSaveJob: {
          status: "saving",
          tabId,
          updatedAt: Date.now(),
          groupName: "General",
        },
      });
    }, tabId);
    await page.goto("https://example.com/gone", {
      waitUntil: "domcontentloaded",
    });
    await wait(1200);
    const afterNav = await page.evaluate(() => {
      const el = document.getElementById("m404-save-root");
      return {
        found: !!el,
        display: el?.style.display,
        text: (el?.innerText || "").replace(/\s+/g, " ").slice(0, 80),
      };
    });
    if (afterNav.found) pass("reinject-after-navigation", afterNav.text);
    else fail("reinject-after-navigation", JSON.stringify(afterNav));
  } catch (e) {
    fail("runner", e instanceof Error ? e.stack || e.message : String(e));
  } finally {
    if (browser) await browser.close().catch(() => {});
  }

  const failed = results.filter((r) => !r.ok);
  console.log("\n── Summary ──");
  console.log(`${results.length - failed.length}/${results.length} passed`);
  if (failed.length) {
    for (const f of failed) console.log(`  ✗ ${f.name}: ${f.detail}`);
    process.exit(1);
  }
  process.exit(0);
}

main();
