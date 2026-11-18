"use client";

import { useEffect, useRef, type RefObject } from "react";

/**
 * The soft pill behind the selected palette row, after designeer's search: it
 * glides from row to row (keyboard or pointer) instead of jumping, resizing to
 * fit each row. cmdk marks the selection with data-selected; we follow it.
 */
export function PaletteHighlight({ listRef }: { listRef: RefObject<HTMLDivElement | null> }) {
  const pillRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const list = listRef.current;
    const pill = pillRef.current;
    if (!list || !pill) return;
    let shown = false;
    let raf = 0;

    const place = () => {
      raf = 0;
      const item = list.querySelector<HTMLElement>('[cmdk-item][data-selected="true"]');
      if (!item) {
        pill.style.opacity = "0";
        shown = false;
        return;
      }
      const l = list.getBoundingClientRect();
      const r = item.getBoundingClientRect();
      const x = r.left - l.left;
      const y = r.top - l.top + list.scrollTop;
      // First appearance: no glide in from 0,0, just fade.
      pill.dataset.glide = shown ? "true" : "false";
      pill.style.width = `${r.width}px`;
      pill.style.height = `${r.height}px`;
      pill.style.transform = `translate(${x}px, ${y}px)`;
      pill.style.opacity = "1";
      shown = true;
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(place);
    };

    const mo = new MutationObserver(schedule);
    mo.observe(list, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["data-selected"],
    });
    const ro = new ResizeObserver(schedule);
    ro.observe(list);
    schedule();
    return () => {
      mo.disconnect();
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [listRef]);

  return (
    <div aria-hidden className="palette-highlight-layer">
      <div ref={pillRef} className="palette-highlight" data-glide="false" />
    </div>
  );
}
