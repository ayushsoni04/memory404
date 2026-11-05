import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { groupListEmptyCopy } from "../extension/src/group-picker.js";

const overlay = readFileSync("extension/src/overlay.jsx", "utf8");
const css = readFileSync("extension/src/overlay-styles.css", "utf8");

describe("extension group picker", () => {
  it("announces what to do, and hides the decorative orb", () => {
    expect(overlay).toContain('className="orb-visual" aria-hidden="true"');
    expect(overlay).toContain('className="orb-status-text" role="status"');
    expect(overlay).toContain("Choose a group, then save");
    expect(overlay).toContain("Type a name to create a group, then save");
  });

  it("announces when no group matches", () => {
    expect(groupListEmptyCopy("")).toBe("No groups yet");
    expect(groupListEmptyCopy("  zines  ")).toBe("No groups match “zines”");
    expect(overlay).toContain('className="group-empty" role="status"');
  });

  it("gives the group list button a 44px target", () => {
    const rules = css.slice(css.indexOf(".chevron-btn {"));
    expect(rules).toContain("width: 44px;");
    expect(rules).toContain("height: 44px;");
    expect(rules).toContain("flex: 0 0 44px;");
  });
});
