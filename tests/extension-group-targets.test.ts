import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const overlayCss = readFileSync("extension/src/overlay-styles.css", "utf8");
const popupCss = readFileSync("extension/src/styles.css", "utf8");

function expectTarget(css: string, selector: string) {
  const start = css.indexOf(selector);
  expect(start).toBeGreaterThan(-1);
  const block = css.slice(start, css.indexOf("}", start));
  expect(block).toContain("min-height: 44px;");
}

describe("extension group choices", () => {
  it("keeps group rows, Back, and the save mode at 44px, at 0.2.32", () => {
    expectTarget(overlayCss, "#m404-save-root .group-option {");
    expectTarget(overlayCss, "#m404-save-root .create-option {");
    expectTarget(overlayCss, "#m404-save-root .save-mode-btn {");
    expectTarget(overlayCss, "#m404-save-root .ghost-btn {");
    expectTarget(overlayCss, "#m404-save-root .error-settings-link {");
    expectTarget(popupCss, ".group-option {");
    expectTarget(popupCss, ".create-option {");
    expectTarget(popupCss, ".save-mode-btn {");
    expectTarget(popupCss, ".ghost-btn {");
    expect(readFileSync("extension/public/static/manifest.json", "utf8")).toContain(
      '"version": "0.2.32"',
    );
    expect(readFileSync("extension/package.json", "utf8")).toContain('"version": "0.2.32"');
    expect(readFileSync("lib/extension-download.ts", "utf8")).toContain(
      'EXTENSION_VERSION = "0.2.32"',
    );
  });
});
