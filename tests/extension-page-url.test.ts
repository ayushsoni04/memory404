import { describe, expect, it } from "vitest";
import {
  BLOCKED_PAGE_MESSAGE,
  blockedPageMessage,
} from "../extension/src/page-url.js";

describe("blockedPageMessage", () => {
  it("explains browser pages the save panel cannot open", () => {
    expect(blockedPageMessage("")).toBe(BLOCKED_PAGE_MESSAGE);
    expect(blockedPageMessage("chrome://settings")).toBe(BLOCKED_PAGE_MESSAGE);
    expect(blockedPageMessage("chrome://newtab/")).toBe(BLOCKED_PAGE_MESSAGE);
    expect(blockedPageMessage("edge://newtab")).toBe(BLOCKED_PAGE_MESSAGE);
    expect(blockedPageMessage("about:blank")).toBe(BLOCKED_PAGE_MESSAGE);
    expect(blockedPageMessage("view-source:https://example.com")).toBe(
      BLOCKED_PAGE_MESSAGE,
    );
    expect(
      blockedPageMessage("https://chromewebstore.google.com/detail/memory404"),
    ).toBe(BLOCKED_PAGE_MESSAGE);
  });

  it("leaves ordinary websites alone", () => {
    expect(blockedPageMessage("https://linear.app/docs")).toBeNull();
    expect(blockedPageMessage("http://localhost:3000/")).toBeNull();
  });
});
