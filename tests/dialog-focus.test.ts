// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { containTab, listFocusable } from "@/lib/dialog-focus";

function tabEvent(shiftKey = false) {
  return new KeyboardEvent("keydown", { key: "Tab", shiftKey, bubbles: true, cancelable: true });
}

describe("containTab", () => {
  it("lists enabled controls and skips disabled ones", () => {
    document.body.innerHTML = `
      <div id="dialog">
        <button id="cancel">Cancel</button>
        <button id="go" disabled>Go</button>
        <a id="link" href="/trash">Trash</a>
      </div>
    `;
    const dialog = document.getElementById("dialog")!;
    expect(listFocusable(dialog).map((el) => el.id)).toEqual(["cancel", "link"]);
  });

  it("wraps Tab from the last control back to the first", () => {
    document.body.innerHTML = `
      <button id="outside">Outside</button>
      <div id="dialog">
        <button id="cancel">Cancel</button>
        <button id="confirm">Confirm</button>
      </div>
    `;
    const dialog = document.getElementById("dialog")!;
    document.getElementById("confirm")!.focus();
    const event = tabEvent();
    expect(containTab(event, dialog)).toBe(true);
    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement?.id).toBe("cancel");
  });

  it("wraps Shift+Tab from the first control to the last", () => {
    document.body.innerHTML = `
      <div id="dialog">
        <button id="cancel">Cancel</button>
        <button id="confirm">Confirm</button>
      </div>
    `;
    const dialog = document.getElementById("dialog")!;
    document.getElementById("cancel")!.focus();
    const event = tabEvent(true);
    expect(containTab(event, dialog)).toBe(true);
    expect(document.activeElement?.id).toBe("confirm");
  });

  it("leaves Tab alone when focus is between the ends", () => {
    document.body.innerHTML = `
      <div id="dialog">
        <button id="a">A</button>
        <button id="b">B</button>
        <button id="c">C</button>
      </div>
    `;
    const dialog = document.getElementById("dialog")!;
    document.getElementById("b")!.focus();
    const event = tabEvent();
    expect(containTab(event, dialog)).toBe(false);
    expect(event.defaultPrevented).toBe(false);
    expect(document.activeElement?.id).toBe("b");
  });
});
