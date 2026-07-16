"use client";

import { forwardRef, useState } from "react";
import Link from "next/link";

type Props = {
  onDropLink?: (linkId: string) => void;
  onDropGroup?: (groupId: string) => void;
};

const TrashBin = forwardRef<HTMLDivElement, Props>(function TrashBin(
  { onDropLink, onDropGroup },
  ref,
) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [justReceived, setJustReceived] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const linkId = e.dataTransfer.getData("linkId");
    const groupId = e.dataTransfer.getData("groupId");

    if (linkId) onDropLink?.(linkId);
    if (groupId) onDropGroup?.(groupId);

    // Trigger receive animation
    setJustReceived(true);
    setTimeout(() => setJustReceived(false), 500);
  };

  return (
    <div ref={ref} className="mt-auto pt-4 border-t border-border/40">
      <Link
        href="/trash"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`group/bin flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition-all duration-200
          ${isDragOver
            ? "bg-red-500/15 border border-red-500/40 text-red-400 scale-105"
            : "text-muted hover:text-foreground hover:bg-surface"
          }
          ${justReceived ? "animate-bin-receive" : ""}
        `}
      >
        {/* Trash SVG icon */}
        <svg
          viewBox="0 0 20 20"
          fill="none"
          className={`size-4 shrink-0 transition-all duration-200 ${isDragOver ? "text-red-400 scale-110" : "text-muted group-hover/bin:text-foreground"} ${justReceived ? "scale-125" : ""}`}
        >
          <path
            d="M8.5 4h3a1.5 1.5 0 0 0-3 0ZM7 4a2.5 2.5 0 0 1 5 0h4.25a.75.75 0 0 1 0 1.5h-.465l-.818 9.793A2.75 2.75 0 0 1 12.23 18H7.77a2.75 2.75 0 0 1-2.737-2.707L4.214 5.5H3.75a.75.75 0 0 1 0-1.5H7Zm2.5 4.25a.75.75 0 0 0-1.5 0v5.5a.75.75 0 0 0 1.5 0v-5.5Zm2.5 0a.75.75 0 0 0-1.5 0v5.5a.75.75 0 0 0 1.5 0v-5.5Z"
            fill="currentColor"
          />
        </svg>
        <span className="truncate text-[13px]">Trash</span>
        {isDragOver && (
          <span className="ml-auto text-[11px] font-medium text-red-400 animate-pulse">
            Drop to delete
          </span>
        )}
      </Link>
    </div>
  );
});

export default TrashBin;
