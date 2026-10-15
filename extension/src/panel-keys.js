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
 * Escape closes the group list, then settings, then the panel.
 * Arrow keys and Enter stay with the group picker.
 */
export function panelEscapeAction({ key, groupListOpen, settingsOpen }) {
  if (key !== "Escape") return "ignore";
  if (groupListOpen) return "close-list";
  if (settingsOpen) return "close-settings";
  return "close-panel";
}
