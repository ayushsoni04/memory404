const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function isVisible(el) {
  if (el.getAttribute("aria-hidden") === "true") return false;
  let node = el;
  while (node && node.nodeType === 1) {
    const style = window.getComputedStyle(node);
    if (style.display === "none" || style.visibility === "hidden") return false;
    node = node.parentElement;
  }
  return true;
}

/** Tab stops inside the save panel, skipping hidden controls. */
export function listPanelFocusable(root) {
  if (!root) return [];
  return Array.from(root.querySelectorAll(FOCUSABLE)).filter((el) => isVisible(el));
}

/**
 * Keep Tab and Shift+Tab inside the save panel.
 * Returns true when it moved focus.
 */
export function containPanelTab(event, root) {
  if (event.key !== "Tab" || !root) return false;
  const focusable = listPanelFocusable(root);
  if (focusable.length === 0) {
    event.preventDefault();
    return true;
  }
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement;
  const inside = active instanceof Node && root.contains(active);
  if (event.shiftKey && (!inside || active === first)) {
    event.preventDefault();
    last.focus();
    return true;
  }
  if (!event.shiftKey && (!inside || active === last)) {
    event.preventDefault();
    first.focus();
    return true;
  }
  return false;
}

/**
 * Move focus into the save panel.
 * A text field the person is already using is left alone.
 * Otherwise the group field, the sign-in field, the note, Cancel, or the library link.
 * @param {ParentNode | null} root
 */
export function focusOverlayPanel(root) {
  if (!root || typeof document === "undefined") return false;
  const preferred = root.querySelector(
    "input.group-input:not([disabled]), input.settings-input:not([disabled]), textarea:not([disabled]), button.cancel-save-btn, a.library-link",
  );
  const active = document.activeElement;
  const inside = active instanceof Node && root.contains(active);
  if (
    inside &&
    active instanceof HTMLElement &&
    /^(INPUT|TEXTAREA)$/.test(active.tagName) &&
    !active.disabled
  ) {
    return false;
  }
  const target = preferred || listPanelFocusable(root)[0];
  if (!target || typeof target.focus !== "function") return false;
  if (active === target) return false;
  target.focus();
  return document.activeElement === target;
}

/**
 * Escape closes the group list, then settings, then the panel.
 * Arrow keys and Enter stay with the group picker.
 */
export function panelEscapeAction({ key, groupListOpen, settingsOpen }) {
  if (key !== "Escape") return "ignore";
  if (groupListOpen) return "close-list";
  if (settingsOpen) return "close-settings";
  return "close-panel";
}

const pageFocus = new WeakMap();

/**
 * Remember the page control that had focus before the save panel opened.
 * A control already inside the panel is left out, so a later open does not
 * replace the page target.
 */
export function rememberPageFocus(host, active = typeof document === "undefined" ? null : document.activeElement) {
  if (!host) return false;
  if (!(active instanceof HTMLElement) || host.contains(active)) return false;
  pageFocus.set(host, active);
  return true;
}

/**
 * Give keyboard focus back to the page when the save panel closes.
 * A missing page control is blurred so focus is not left inside the panel.
 */
export function releasePanelFocus(host) {
  if (!host || typeof document === "undefined") return false;
  const remembered = pageFocus.get(host) ?? null;
  pageFocus.delete(host);
  const active = document.activeElement;
  const inside = active instanceof HTMLElement && host.contains(active) ? active : null;

  if (
    remembered instanceof HTMLElement &&
    remembered.isConnected &&
    !host.contains(remembered)
  ) {
    remembered.focus();
    if (document.activeElement === remembered) return true;
  }

  if (inside && document.activeElement === inside) inside.blur();
  return !(document.activeElement instanceof Node && host.contains(document.activeElement));
}
