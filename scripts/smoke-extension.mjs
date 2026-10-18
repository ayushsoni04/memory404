/**
 * Loads the unpacked extension in Chromium and runs the save overlay.
 * Run after `npm run build` inside extension/.
 */
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { chromium } from "playwright";

const extPath = path.resolve("extension/dist");
const userDataDir = await mkdtemp(path.join(tmpdir(), "m404-ext-"));

const context = await chromium.launchPersistentContext(userDataDir, {
  headless: false,
  args: [
    `--disable-extensions-except=${extPath}`,
    `--load-extension=${extPath}`,
    "--no-sandbox",
    "--disable-dev-shm-usage",
  ],
});

try {
  let [worker] = context.serviceWorkers();
  if (!worker) {
    worker = await context.waitForEvent("serviceworker", { timeout: 20_000 });
  }

  const manifest = await worker.evaluate(() => chrome.runtime.getManifest());
  if (manifest.name !== "memory404") {
    throw new Error(`Unexpected extension name: ${manifest.name}`);
  }
  if (manifest.manifest_version !== 3) {
    throw new Error("Expected manifest v3");
  }

  const page = await context.newPage();
  await page.goto("https://example.com", { waitUntil: "domcontentloaded" });
  const title = await page.title();
  if (!title) throw new Error("Example page did not load");

  const opened = await worker.evaluate(async () => {
    const [tab] = await chrome.tabs.query({ url: "https://example.com/*" });
    if (!tab?.id) return { ok: false, error: "Example tab was not found" };
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["overlay.js"],
    });
    return { ok: true };
  });
  if (!opened?.ok) {
    throw new Error(opened?.error || "Overlay inject failed");
  }

  const root = page.locator("#m404-save-root");
  await root.waitFor({ state: "visible", timeout: 15_000 });
  await page.getByText("Sign in to memory404 to load groups").waitFor({ timeout: 15_000 });
  await page.getByLabel("Email").fill("person@example.com");
  await page.getByLabel("Password", { exact: true }).fill("not-a-real-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByRole("button", { name: "Check App URL" }).waitFor({ timeout: 20_000 });
  await page.getByRole("button", { name: "Check App URL" }).click();

  const apiField = page.locator("input.settings-input");
  await apiField.waitFor({ state: "visible", timeout: 10_000 });
  await apiField.fill("http://127.0.0.1:3999");
  await page.getByRole("button", { name: "Save App URL" }).click();
  await page.getByText("App URL", { exact: true }).waitFor({ state: "hidden", timeout: 10_000 });
  await page.getByRole("button", { name: "Close" }).click();
  await page.waitForFunction(
    () => {
      const host = document.getElementById("m404-save-root");
      return !host || getComputedStyle(host).display === "none";
    },
    null,
    { timeout: 5_000 },
  );

  console.log(
    `extension smoke ok: ${manifest.name} ${manifest.version} @ ${worker.url()}`,
  );
} finally {
  await context.close();
  await rm(userDataDir, { recursive: true, force: true });
}
