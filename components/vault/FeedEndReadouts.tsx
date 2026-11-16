"use client";

import { useRef } from "react";
import { ReadoutRow, useReadoutScramble } from "./SidebarReadoutField";

/** The same faint spec-sheet lines as the sidebar, signing off the feed. */
const BLOCKS: { rows: string[][]; width: string }[] = [
  { rows: [["END", "OF", "FEED"], ["/", "LINKS", "HELD"]], width: "74%" },
  { rows: [["IDX", "///", "0404"]], width: "52%" },
  { rows: [["SYS", "///", "OK"], [">", "M.404", "LAB"]], width: "100%" },
];

/** Faint readouts in the bottom-right corner under the feed. Wide screens only. */
export function FeedEndReadouts() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  useReadoutScramble(rootRef, 2);

  return (
    <div ref={rootRef} className="feed-end-readouts" aria-hidden>
      {BLOCKS.map((block, b) => (
        <div key={b} className="sidebar-readout-block" style={{ width: block.width }}>
          {block.rows.map((words, r) => (
            <ReadoutRow key={r} words={words} />
          ))}
        </div>
      ))}
    </div>
  );
}
