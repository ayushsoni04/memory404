import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const overlayCss = readFileSync("extension/src/overlay-styles.css", "utf8");
const popupCss = readFileSync("extension/src/styles.css", "utf8");

function block(css: string, selector: string) {
  const start = css.indexOf(selector);
  expect(start).toBeGreaterThan(-1);
  return css.slice(start, css.indexOf("}", start));
}

describe("extension group menu", () => {
  it("keeps the group menu button at 44px, at 0.2.32", () => {
    const overlay = block(overlayCss, "#m404-save-root .chevron-btn {");
    expect(overlay).toContain("width: 44px;");
    expect(overlay).toContain("height: 44px;");
    expect(overlay).not.toContain("width: 32px;");

    const popup = block(popupCss, ".chevron-btn {");
    expect(popup).toContain("min-width: 44px;");
    expect(popup).toContain("min-height: 44px;");

    expect(readFileSync("extension/public/static/manifest.json", "utf8")).toContain(
      '"version": "0.2.32"',
    );
    expect(readFileSync("extension/package.json", "utf8")).toContain('"version": "0.2.32"');
    expect(readFileSync("lib/extension-download.ts", "utf8")).toContain(
      'EXTENSION_VERSION = "0.2.32"',
    );
  });
});
