type ShortcutEvent = {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
};

/** The library search chord is Ctrl+K or ⌘K. */
export function isPaletteShortcut(event: ShortcutEvent): boolean {
  return event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey);
}

/**
 * Open search, or close it when it is already open.
 * Leave it closed while another dialog, such as a link, is on screen.
 */
export function shouldTogglePalette(
  paletteOpen: boolean,
  otherDialogOpen: boolean,
): boolean {
  if (paletteOpen) return true;
  return !otherDialogOpen;
}

export function anotherDialogIsOpen(root: ParentNode = document): boolean {
  return root.querySelector('[role="dialog"][aria-modal="true"]') != null;
}
