import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("app/globals.css", "utf8");

describe("card actions on a phone", () => {
  it("keeps copy and open at 44px for touch and compact for a pointer", () => {
    const desktop = css.slice(
      css.indexOf(".mind-card-actions {"),
      css.indexOf(".mind-card-action {"),
    );
    expect(desktop).toContain("--mind-card-action-size: calc(28px * 1.35);");

    const touchStart = css.indexOf("@media (hover: none), (pointer: coarse)");
    const touch = css.slice(touchStart, css.indexOf("@media", touchStart + 1));
    expect(touch).toContain("--mind-card-action-size: 44px;");
    expect(touch).toContain("pointer-events: auto;");
  });
});
