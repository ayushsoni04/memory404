import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { apiBaseChanged, APP_URL_HINT, normalizeApiBase } from "../extension/src/api-base.js";

describe("normalizeApiBase", () => {
  it("keeps an http origin and fills in a missing scheme", () => {
    expect(normalizeApiBase("http://localhost:3000")).toEqual({
      ok: true,
      apiBase: "http://localhost:3000",
    });
    expect(normalizeApiBase("localhost:3000/settings")).toEqual({
      ok: true,
      apiBase: "http://localhost:3000",
    });
    expect(normalizeApiBase("memory404.vercel.app/library")).toEqual({
      ok: true,
      apiBase: "https://memory404.vercel.app",
    });
    expect(normalizeApiBase("  ")).toEqual({
      ok: true,
      apiBase: "http://localhost:3000",
    });
  });

  it("rejects a value the extension cannot call", () => {
    expect(normalizeApiBase("not a url")).toEqual({ ok: false, error: APP_URL_HINT });
    expect(normalizeApiBase("javascript:alert(1)")).toEqual({
      ok: false,
      error: APP_URL_HINT,
    });
    expect(normalizeApiBase("https://user:pass@memory404.vercel.app")).toEqual({
      ok: false,
      error: APP_URL_HINT,
    });
  });

  it("treats a path or a trailing slash as the same server", () => {
    expect(apiBaseChanged("http://localhost:3000/", "http://localhost:3000")).toBe(false);
    expect(
      apiBaseChanged("http://localhost:3000", "https://memory404.vercel.app"),
    ).toBe(true);
  });

  it("is what the save worker uses when the App URL changes", () => {
    const worker = readFileSync("extension/public/static/background.js", "utf8");
    const overlay = readFileSync("extension/src/overlay.jsx", "utf8");
    const build = readFileSync("extension/webpack.config.js", "utf8");
    expect(worker).toContain("normalizeApiBase");
    expect(worker).toContain("apiBaseChanged");
    expect(worker).toContain('storageRemove(["cachedGroups", "lastSavedGroupId"])');
    expect(overlay).toContain("groupChevronLabel");
    expect(overlay).toContain("m404-app-url-error");
    expect(build).toContain("api-base.js");
  });
});
