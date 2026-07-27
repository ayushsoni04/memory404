"use client";

import { useMemo, useState } from "react";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { GRID_SIZE_KEY, type GridSize, type SortBy } from "./types";
import { readStoredGridSize } from "./storage";

const SORT_VALUES: SortBy[] = ["newest", "oldest", "domain", "details", "type"];
const GRID_VALUES: GridSize[] = ["compact", "default", "large"];

function readStoredSortBy(): SortBy {
  if (typeof window === "undefined") return "newest";
  const stored = window.localStorage.getItem("memory404-sort-by");
  return (SORT_VALUES as string[]).includes(stored ?? "")
    ? (stored as SortBy)
    : "newest";
}

export function useVaultPreferences() {
  const [initialSortBy] = useState(readStoredSortBy);
  const [initialGridSize] = useState(readStoredGridSize);

  const [sortBy, setSortBy] = useQueryState(
    "sort",
    parseAsStringLiteral(SORT_VALUES)
      .withDefault(initialSortBy)
      .withOptions({ history: "replace" }),
  );

  const setSortByAndPersist = (val: SortBy) => {
    void setSortBy(val);
    try {
      window.localStorage.setItem("memory404-sort-by", val);
    } catch {}
  };

  const [groupSearch, setGroupSearchState] = useQueryState(
    "q",
    { defaultValue: "", history: "replace" as const },
  );
  const setGroupSearch = (value: string) => void setGroupSearchState(value || null);

  const [gridSize, setGridSize] = useQueryState(
    "grid",
    parseAsStringLiteral(GRID_VALUES)
      .withDefault(initialGridSize)
      .withOptions({ history: "replace" }),
  );

  const setGridSizeAndPersist = (next: GridSize) => {
    void setGridSize(next);
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
