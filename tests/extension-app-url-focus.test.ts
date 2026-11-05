import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const overlay = readFileSync("extension/src/overlay.jsx", "utf8");
const css = readFileSync("extension/src/overlay-styles.css", "utf8");

describe("extension App URL", () => {
  it("returns to the App URL when it cannot be saved", () => {
    const guard = overlay.indexOf("if (!apiBaseError || savingApiBase) return;");
    const focus = overlay.indexOf("apiBaseRef.current?.focus()", guard);
    expect(guard).toBeGreaterThan(-1);
    expect(focus).toBeGreaterThan(guard);
    expect(overlay).toContain("rejectApiBase(normalized.error)");
    expect(overlay).toContain("rejectApiBase(res?.error || APP_URL_HINT)");
    expect(overlay).toContain('aria-describedby={apiBaseError ? "m404-app-url-error" : "m404-app-url-hint"}');
    expect(overlay).toContain('aria-invalid={apiBaseError ? true : undefined}');
    expect(overlay).toContain("if (apiBaseLock.current) return;");
    expect(overlay).toContain('{savingApiBase ? "Saving…" : "Save App URL"}');
  });

  it("keeps Settings and Close easy to tap, at 0.2.29", () => {
    const rules = css.slice(css.indexOf(".settings-btn,"));
    expect(rules).toContain("width: 32px;");
    expect(rules).toContain("height: 32px;");
    expect(readFileSync("extension/dist/manifest.json", "utf8")).toContain(
      '"version": "0.2.29"',
    );
    expect(readFileSync("extension/package.json", "utf8")).toContain('"version": "0.2.29"');
    expect(readFileSync("lib/extension-download.ts", "utf8")).toContain(
      'EXTENSION_VERSION = "0.2.29"',
    );
  });
});
