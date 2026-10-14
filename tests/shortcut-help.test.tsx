// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import ShortcutHelp from "@/components/vault/ShortcutHelp";
import {
  SHORTCUT_HELP_EVENT,
  formatShortcutKeys,
  isShortcutHelpKey,
} from "@/components/vault/shortcut-help";

afterEach(() => {
  cleanup();
});

function key(partial: Partial<KeyboardEvent> & { key: string }): KeyboardEvent {
  return {
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    repeat: false,
    target: document.body,
    ...partial,
  } as KeyboardEvent;
}

describe("isShortcutHelpKey", () => {
  it("accepts ? outside a text field", () => {
    expect(isShortcutHelpKey(key({ key: "?" }))).toBe(true);
  });

  it("ignores typing, repeats, and modified chords", () => {
    const input = document.createElement("textarea");
    expect(isShortcutHelpKey(key({ key: "?", target: input }))).toBe(false);
    expect(isShortcutHelpKey(key({ key: "?", repeat: true }))).toBe(false);
    expect(isShortcutHelpKey(key({ key: "?", metaKey: true }))).toBe(false);
    expect(isShortcutHelpKey(key({ key: "k" }))).toBe(false);
  });
});

describe("formatShortcutKeys", () => {
  it("uses the platform modifier", () => {
    expect(formatShortcutKeys(["mod", "K"], false)).toEqual(["Ctrl", "K"]);
    expect(formatShortcutKeys(["mod", "K"], true)).toEqual(["⌘", "K"]);
  });
});

describe("ShortcutHelp", () => {
  it("opens from ? and closes with Escape", () => {
    render(<ShortcutHelp />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.keyDown(window, { key: "?" });
    expect(
      screen.getByRole("dialog", { name: "Keyboard shortcuts" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Undo the last delete or move")).toBeInTheDocument();
    expect(screen.getByText("Search links, groups, and pages")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("stays closed while a note is focused", () => {
    render(
      <>
        <textarea aria-label="Notes" />
        <ShortcutHelp />
      </>,
    );
    fireEvent.keyDown(screen.getByLabelText("Notes"), { key: "?" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("keeps Tab on Close and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    render(
      <>
        <button type="button">Library</button>
        <ShortcutHelp />
      </>,
    );
    const library = screen.getByRole("button", { name: "Library" });
    library.focus();
    fireEvent.keyDown(window, { key: "?" });
    const close = screen.getByRole("button", { name: "Close" });
    expect(close).toHaveFocus();
    await user.tab();
    expect(close).toHaveFocus();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(library).toHaveFocus();
  });

  it("opens from the shortcuts event", () => {
    render(<ShortcutHelp />);
    fireEvent(window, new Event(SHORTCUT_HELP_EVENT));
    expect(screen.getByRole("dialog", { name: "Keyboard shortcuts" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
