// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
  containPanelTab,
  focusOverlayPanel,
  panelEscapeAction,
} from "../extension/src/panel-keys.js";

describe("panelEscapeAction", () => {
  it("closes the group list before the panel", () => {
    expect(
      panelEscapeAction({ key: "Escape", groupListOpen: true, settingsOpen: false }),
    ).toBe("close-list");
    expect(
      panelEscapeAction({ key: "Escape", groupListOpen: false, settingsOpen: true }),
    ).toBe("close-settings");
    expect(
      panelEscapeAction({ key: "Escape", groupListOpen: false, settingsOpen: false }),
    ).toBe("close-panel");
    expect(
      panelEscapeAction({ key: "Enter", groupListOpen: true, settingsOpen: false }),
    ).toBe("ignore");
  });
});

describe("focusOverlayPanel", () => {
  it("focuses the group field, and leaves a field that is already in use", () => {
    document.body.innerHTML = `
      <div id="panel">
        <button type="button" id="settings">Settings</button>
        <input class="group-input" id="group" />
        <button type="button" id="save">Save</button>
      </div>
    `;
    const panel = document.getElementById("panel")!;
    const group = document.getElementById("group") as HTMLInputElement;
    expect(focusOverlayPanel(panel)).toBe(true);
    expect(document.activeElement).toBe(group);

    (document.getElementById("settings") as HTMLButtonElement).focus();
    expect(focusOverlayPanel(panel)).toBe(true);
    expect(document.activeElement).toBe(group);

    expect(focusOverlayPanel(panel)).toBe(false);
    expect(document.activeElement).toBe(group);
  });
});

describe("containPanelTab", () => {
  it("wraps Tab from the last control back to the first", () => {
    document.body.innerHTML = `
      <div id="panel">
        <button type="button" id="first">Close</button>
        <input id="middle" />
        <button type="button" id="last">Save</button>
      </div>
      <button type="button" id="outside">Page</button>
    `;
    const panel = document.getElementById("panel")!;
    const first = document.getElementById("first") as HTMLButtonElement;
    const last = document.getElementById("last") as HTMLButtonElement;
    last.focus();
    const event = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
    expect(containPanelTab(event, panel)).toBe(true);
    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(first);

    const back = new KeyboardEvent("keydown", {
      key: "Tab",
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    expect(containPanelTab(back, panel)).toBe(true);
    expect(document.activeElement).toBe(last);
  });

  it("leaves Tab alone between controls inside the panel", () => {
    const panel = document.getElementById("panel")!;
    const middle = document.getElementById("middle") as HTMLInputElement;
    middle.focus();
    const event = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
    expect(containPanelTab(event, panel)).toBe(false);
    expect(event.defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(middle);
  });
});
