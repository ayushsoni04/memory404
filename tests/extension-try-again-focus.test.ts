import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const overlay = readFileSync("extension/src/overlay.jsx", "utf8");
const css = readFileSync("extension/src/overlay-styles.css", "utf8");
const keys = readFileSync("extension/src/panel-keys.js", "utf8");

describe("extension save failure focus", () => {
  it("returns to Try again, and keeps Cancel easy to tap, at 0.2.31", () => {
    expect(overlay).toContain('className="save-btn try-again"');
    expect(keys).toContain("button.try-again");
    expect(keys.indexOf("button.try-again")).toBeLessThan(keys.indexOf("button.cancel-save-btn"));
    const cancel = css.slice(css.indexOf(".cancel-save-btn {"));
    expect(cancel).toContain("min-height: 44px;");
    const save = css.slice(css.indexOf(".save-btn {"));
    expect(save).toContain("min-height: 44px;");
    expect(readFileSync("extension/public/static/manifest.json", "utf8")).toContain(
      '"version": "0.2.31"',
    );
    expect(readFileSync("lib/extension-download.ts", "utf8")).toContain(
      'EXTENSION_VERSION = "0.2.31"',
    );
  });
});
