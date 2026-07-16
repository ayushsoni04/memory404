"use client";

import { useMemo, useState } from "react";
import { GRID_SIZE_KEY, type GridSize, type SortBy } from "./types";
import { readStoredGridSize } from "./storage";

export function useVaultPreferences() {
  const [sortBy, setSortBy] = useState<SortBy>(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem("memory404-sort-by");
      if (
        stored === "newest" ||
        stored === "oldest" ||
        stored === "domain" ||
        stored === "details" ||
        stored === "type"
      ) {
        return stored;
      }
    }
    return "newest";
  });

  const setSortByAndPersist = (val: SortBy) => {
    setSortBy(val);
    try {
      window.localStorage.setItem("memory404-sort-by", val);
    } catch {}
  };

  const [groupSearch, setGroupSearch] = useState("");

  // Lazy-init from localStorage — eliminates guaranteed layout shift on every page load
  const [gridSize, setGridSize] = useState<GridSize>(readStoredGridSize);

  const setGridSizeAndPersist = (next: GridSize) => {
    setGridSize(next);
    try {
      window.localStorage.setItem(GRID_SIZE_KEY, next);
    } catch {
      /* ignore */
    }
  };

  const feedImageSizes =
    gridSize === "compact"
      ? "(min-width: 1536px) 14vw, (min-width: 1280px) 16vw, (min-width: 1024px) 20vw, (min-width: 640px) 33vw, 100vw"
      : gridSize === "default"
        ? "(min-width: 1536px) 16vw, (min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 768px) 33vw, (min-width: 640px) 50vw, 100vw"
        : "(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw";

  const canReorderPills = useMemo(
    () => !groupSearch.trim(),
    [groupSearch],
  );

  return {
    sortBy,
    setSortByAndPersist,
    gridSize,
    setGridSizeAndPersist,
    groupSearch,
    setGroupSearch,
    feedImageSizes,
    canReorderPills,
  };
}
