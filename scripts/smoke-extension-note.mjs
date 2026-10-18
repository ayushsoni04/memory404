/**
 * Signs in against a local mock API, saves example.com, and checks the
 * post-save note field. EXPECT_NOTE=0 uses this to capture the previous
 * confirmation, which closed itself after a few seconds.
 */
import { createServer } from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { chromium } from "@playwright/test";

const expectNote = process.env.EXPECT_NOTE !== "0";
const extPath = path.resolve(process.env.EXT_DIR || "extension/dist");
const outDir = process.env.OUT_DIR || "";
const patches = [];

const server = createServer((req, res) => {
  const chunks = [];
  req.on("data", (chunk) => chunks.push(chunk));
  req.on("end", () => {
    const raw = Buffer.concat(chunks).toString();
    const url = req.url || "";
    res.setHeader("content-type", "application/json");
    if (req.method === "POST" && url === "/api/auth/login") {
      res.end(
        JSON.stringify({
          token: "test-token",
          user: { email: "person@example.com" },
        }),
      );
      return;
    }
    if (req.method === "GET" && url.startsWith("/api/groups")) {
      res.end(
        JSON.stringify({
          groups: [
            {
              id: "g1",
              name: "General",
              linksCount: 0,
              createdAt: "2026-10-01T12:00:00.000Z",
              previewTitles: [],
              sortOrder: 0,
            },
          ],
        }),
      );
      return;
    }
    if (req.method === "POST" && url === "/api/links") {
      res.end(
        JSON.stringify({
          link: {
            id: "link-1",
            url: "https://example.com/",
            groupId: "g1",
            notes: null,
            displayTitle: "Example Domain",
          },
        }),
      );
      return;
    }
    if (req.method === "PATCH" && url.startsWith("/api/links/")) {
      const body = raw ? JSON.parse(raw) : {};
      patches.push({ url, body });
      res.end(JSON.stringify({ link: { id: "link-1", notes: body.notes } }));
      return;
    }
    res.statusCode = 404;
    res.end(JSON.stringify({ error: `unhandled ${req.method} ${url}` }));
  });
});

await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(3000, "127.0.0.1", resolve);
});

const userDataDir = await mkdtemp(path.join(tmpdir(), "m404-note-"));
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
  if (!worker) worker = await context.waitForEvent("serviceworker", { timeout: 20_000 });
  const page = await context.newPage();
  await page.goto("https://example.com", { waitUntil: "domcontentloaded" });
  const opened = await worker.evaluate(async () => {
    const [tab] = await chrome.tabs.query({ url: "https://example.com/*" });
    if (!tab?.id) return { ok: false, error: "Example tab was not found" };
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["overlay.js"],
    });
    return { ok: true };
  });
  if (!opened?.ok) throw new Error(opened?.error || "Overlay inject failed");

  const root = page.locator("#m404-save-root");
  await root.waitFor({ state: "visible", timeout: 15_000 });
  await page.getByLabel("Email").fill("person@example.com");
  await page.getByLabel("Password", { exact: true }).fill("not-a-real-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  const saveButton = page.getByRole("button", { name: "Save tab to group" });
  await saveButton.waitFor({ timeout: 15_000 });
  await saveButton.click();
  await page.getByText("Link saved").waitFor({ timeout: 15_000 });

  const panel = page.locator("#m404-save-root .panel");
  if (outDir) await panel.screenshot({ path: path.join(outDir, "saved.png") });

  if (expectNote) {
    await page.getByLabel("Add a note").waitFor({ timeout: 5_000 });
    await page.waitForTimeout(5_000);
    const stillOpen = await root.evaluate((host) => getComputedStyle(host).display !== "none");
    if (!stillOpen) throw new Error("Overlay closed itself before a note could be saved");
    await page.getByLabel("Add a note").fill("Remember the pricing section.");
    if (outDir) await panel.screenshot({ path: path.join(outDir, "note.png") });
    await page.getByRole("button", { name: "Save note" }).click();
    await page.getByText("Note saved").waitFor({ timeout: 10_000 });
    if (outDir) await panel.screenshot({ path: path.join(outDir, "note-saved.png") });
    if (patches.length !== 1 || patches[0].body.notes !== "Remember the pricing section.") {
      throw new Error(`Unexpected note patch: ${JSON.stringify(patches)}`);
    }
    if (!patches[0].url.includes("/api/links/link-1")) {
      throw new Error(`Note was not sent to the saved link: ${patches[0].url}`);
    }
  } else {
    await page.getByText("Add a note").waitFor({ state: "hidden", timeout: 1_000 }).catch(() => {});
    const noteCount = await page.getByText("Add a note").count();
    if (noteCount !== 0) throw new Error("Previous build unexpectedly showed a note field");
  }

  console.log(
    expectNote
      ? "extension note smoke ok"
      : "extension before-save confirmation captured",
  );
} finally {
  await context.close();
  await rm(userDataDir, { recursive: true, force: true });
  await new Promise((resolve) => server.close(resolve));
}
