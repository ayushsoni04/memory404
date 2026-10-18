import { describe, expect, it } from "vitest";
import { signInSaveHint } from "../extension/src/sign-in-hint.js";

describe("signInSaveHint", () => {
  it("names the tabs that will be saved after sign-in", () => {
    expect(signInSaveHint()).toMatch(/current tab/);
    expect(signInSaveHint({ saveMode: "remember" })).toMatch(/asked to remember/);
    expect(signInSaveHint({ saveMode: "selected", selectedCount: 4 })).toMatch(
      /4 tabs you selected/,
    );
    expect(signInSaveHint({ saveMode: "selected", selectedCount: 1 })).toMatch(
      /current tab/,
    );
    expect(signInSaveHint({ saveMode: "group", groupTitle: "Research" })).toMatch(
      /“Research” tab group/,
    );
    expect(signInSaveHint({ saveMode: "group", groupTitle: "  " })).toMatch(
      /the tab group/,
    );
  });
});
