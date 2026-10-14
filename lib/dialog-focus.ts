"use client";

import { useEffect, type RefObject } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Tab stops inside a dialog, skipping disabled controls. */
export function listFocusable(root: ParentNode): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true",
  );
}

/**
 * Keep Tab and Shift+Tab inside `root`. Returns true when it moved focus.
 * A dialog with one control keeps that control focused.
 */
export function containTab(event: KeyboardEvent, root: HTMLElement): boolean {
  if (event.key !== "Tab") return false;
  const focusable = listFocusable(root);
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
 * Move focus into a dialog, hold Tab there, and return focus when it closes.
 * Marks the rest of the page inert so background controls can't be reached.
 */
export function useDialogContainment(
  active: boolean,
  portalRef: RefObject<HTMLElement | null>,
  dialogRef: RefObject<HTMLElement | null>,
  initialFocusRef?: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!active) return;
    const previous =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const portal = portalRef.current;
    const inerted: Element[] = [];
    const parent = portal?.parentElement;
    if (portal && parent) {
      for (const child of parent.children) {
        if (child !== portal && !child.hasAttribute("inert")) {
          child.setAttribute("inert", "");
          inerted.push(child);
        }
      }
    }
    const focusTarget =
      initialFocusRef?.current ??
      (dialogRef.current ? listFocusable(dialogRef.current)[0] : undefined);
    focusTarget?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (event: KeyboardEvent) => {
      if (dialogRef.current) containTab(event, dialogRef.current);
    };
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      for (const el of inerted) el.removeAttribute("inert");
      if (previous && document.contains(previous)) previous.focus();
    };
  }, [active, dialogRef, initialFocusRef, portalRef]);
}
