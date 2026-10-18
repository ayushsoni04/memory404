import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CONTEXT_MENUS } from "../extension/src/context-menus.js";

describe("extension context menu", () => {
  it("names the menu for memory404", () => {
    expect(CONTEXT_MENUS.map((item) => item.title)).toEqual([
      "Save to memory404",
      "Save this page",
      "Save and open memory404",
      "Save selected tabs",
      "Save this tab group",
    ]);
    expect(CONTEXT_MENUS.map((item) => item.id)).toEqual([
      "lk-parent",
      "lk-save",
      "lk-save-open",
      "lk-save-selected",
      "lk-save-group",
    ]);
    expect(CONTEXT_MENUS.some((item) => /LK|Just Save/i.test(item.title))).toBe(false);
  });

  it("is what the right-click menu installs", () => {
    const worker = readFileSync("extension/public/static/background.js", "utf8");
    const build = readFileSync("extension/webpack.config.js", "utf8");
    expect(worker).toContain("CONTEXT_MENUS");
    expect(worker).not.toContain("Add to LK");
    expect(worker).not.toContain("Just Save");
    expect(build).toContain("context-menus.js");
  });
});
