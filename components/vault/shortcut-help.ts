import { isTypingTarget } from "./undo-offer";

export const SHORTCUT_HELP_EVENT = "m404:open-shortcuts";

export type ShortcutRow = {
  id: string;
  label: string;
  keys: string[];
};

/** Keys actually handled in the library. `mod` is Ctrl or ⌘. */
export const SHORTCUT_ROWS: ShortcutRow[] = [
  { id: "search", label: "Search links, groups, and pages", keys: ["mod", "K"] },
  { id: "move", label: "Move through saved links", keys: ["↑", "↓", "←", "→"] },
  { id: "groups", label: "Move through groups", keys: ["←", "→"] },
  { id: "ends", label: "Jump to the first or last link", keys: ["Home", "End"] },
  { id: "open", label: "Open the focused link", keys: ["Enter"] },
  { id: "close", label: "Close a link, a menu, or this list", keys: ["Esc"] },
  { id: "undo", label: "Undo the last delete or move", keys: ["mod", "Z"] },
  { id: "help", label: "Show these shortcuts", keys: ["?"] },
];

export function isMacPlatform(platform: string): boolean {
  return /Mac|iPhone|iPad/i.test(platform);
}

export function formatShortcutKeys(keys: string[], mac: boolean): string[] {
  return keys.map((key) => (key === "mod" ? (mac ? "⌘" : "Ctrl") : key));
}

/** `?` opens the list. Typing, repeats, and modified chords stay with the field. */
export function isShortcutHelpKey(event: {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  repeat: boolean;
  target: EventTarget | null;
}): boolean {
  if (event.key !== "?") return false;
  if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return false;
  return !isTypingTarget(event.target);
}
