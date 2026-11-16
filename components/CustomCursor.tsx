"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import {
  getCustomCursorEnabled,
  subscribeCustomCursor,
} from "@/lib/cursor-pref";
import "./custom-cursor.css";

const INTERACTIVE =
  'a, button, [role="button"], [role="radio"], [role="switch"], [role="slider"], [role="menuitemradio"], label, select, summary, [data-cursor="pointer"]';
const TEXT_ENTRY = 'input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]), textarea, [contenteditable="true"]';

/**
 * Arrow cursor drawn by the app. Only for mouse/trackpad users; touch and
 * text fields keep the system cursor. Grows over anything clickable and
 * squashes while pressed.
 */
export function CustomCursor() {
  const enabled = useSyncExternalStore(subscribeCustomCursor, getCustomCursorEnabled, () => false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (!enabled || !fine.matches) {
      delete root.dataset.cursor;
      return;
    }
    root.dataset.cursor = "custom";
    const el = ref.current;
    if (!el) return;

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      el.style.translate = `${e.clientX}px ${e.clientY}px`;
      el.dataset.visible = "true";
      const target = e.target instanceof Element ? e.target : null;
      const overText = !!target?.closest(TEXT_ENTRY);
      el.dataset.hidden = overText ? "true" : "false";
      el.dataset.hover = !overText && target?.closest(INTERACTIVE) ? "true" : "false";
    };
    const onDown = () => (el.dataset.down = "true");
    const onUp = () => (el.dataset.down = "false");
    const onLeave = () => (el.dataset.visible = "false");

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      delete root.dataset.cursor;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, [enabled]);

  if (!enabled) return null;
  return (
    <div ref={ref} className="m404-cursor" aria-hidden data-visible="false">
      <svg viewBox="0 0 24 24" width="22" height="22">
        <path
          d="M5.6 3.4 19.3 9.1c1.7.7 1.6 3.1-.1 3.6l-4.9 1.5c-.6.2-1 .6-1.2 1.2l-1.5 4.9c-.5 1.7-2.9 1.8-3.6.1L2.3 6.7C1.6 4.9 3.8 2.7 5.6 3.4Z"
          fill="#fff"
          stroke="#0b0b0c"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
