"use client";

import { useSyncExternalStore } from "react";
import { Star } from "lucide-react";
import { starredSnapshot, subscribeStarred, toggleStarred } from "@/lib/starred";
import { playUiSound } from "@/lib/ui-sound";

/** Round star in a card's top-right corner. Saved in this browser only. */
export function CardStar({ linkId, title }: { linkId: string; title: string }) {
  const snap = useSyncExternalStore(subscribeStarred, starredSnapshot, () => "");
  const on = snap.split(",").includes(linkId);

  return (
    <button
      type="button"
      className="card-star"
      data-on={on || undefined}
      aria-pressed={on}
      aria-label={on ? `Unstar ${title}` : `Star ${title}`}
      title={on ? "Starred" : "Star"}
      onClick={(e) => {
        e.stopPropagation();
        toggleStarred(linkId);
        playUiSound("tick");
      }}
    >
      <Star className="size-4" strokeWidth={1.8} fill={on ? "currentColor" : "none"} aria-hidden />
    </button>
  );
}
