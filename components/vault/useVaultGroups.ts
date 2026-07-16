"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { apiUrl } from "@/lib/api-base";
import { GENERAL_GROUP_NAME } from "@/lib/group-constants";
import { GROUP_PILL_MIN_PX, type GroupRow } from "./types";
import { readJsonStorage, readStorageItem } from "./storage";

export function useVaultGroups(
  router: AppRouterInstance,
  groupSearch: string,
  canReorderPillsBase: boolean,
) {
  const [groups, setGroups] = useState<GroupRow[]>(() =>
    readJsonStorage<GroupRow[]>("memory404-groups-cache", []),
  );
  const [openedGroupId, setOpenedGroupId] = useState<string | null>(
    () => readStorageItem("memory404-opened-group-id") ?? "all",
  );

  const [createGroupName, setCreateGroupName] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [addingAt, setAddingAt] = useState<number | null>(null);
  const [groupsError, setGroupsError] = useState<string | null>(null);
  const [draggingGroupId, setDraggingGroupId] = useState<string | null>(null);

  const groupInputRef = useRef<HTMLInputElement | null>(null);
  const groupSizerRef = useRef<HTMLSpanElement | null>(null);
  const [groupInputWidth, setGroupInputWidth] = useState(GROUP_PILL_MIN_PX);

  const { data: swrGroups, mutate: mutateGroups } = useSWR(
    apiUrl("/api/groups"),
    async (url) => {
      setGroupsError(null);
      try {
        const res = await fetch(url);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const msg =
            typeof data.error === "string" ? data.error : "Failed to load groups";
          setGroupsError(msg);
          throw new Error(msg);
        }
        return Array.isArray(data.groups) ? (data.groups as GroupRow[]) : [];
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to load groups";
        setGroupsError(message);
        throw err;
      }
    },
    { revalidateOnFocus: false, dedupingInterval: 30_000 },
  );

  useEffect(() => {
    if (swrGroups) {
      setGroups(swrGroups);
      try {
        window.localStorage.setItem(
          "memory404-groups-cache",
          JSON.stringify(swrGroups),
        );
      } catch {}

      const general =
        swrGroups.find(
          (g) =>
            g.name.trim().toLowerCase() === GENERAL_GROUP_NAME.toLowerCase(),
        ) ?? swrGroups[0];
      if (general) {
        setOpenedGroupId((prev) => {
          const next = prev ?? "all";
          try {
            window.localStorage.setItem("memory404-opened-group-id", next);
          } catch {}
          return next;
        });
      }
    }
  }, [swrGroups]);

  const loadGroups = useCallback(() => {
    return mutateGroups();
  }, [mutateGroups]);

  const selectGroup = useCallback((id: string) => {
    setOpenedGroupId(id);
    try {
      window.localStorage.setItem("memory404-opened-group-id", id);
    } catch {}
  }, []);

  const openedGroup = groups.find((g) => g.id === openedGroupId) ?? null;
  const allLinksCount = useMemo(
    () => groups.reduce((sum, g) => sum + (g.linksCount || 0), 0),
    [groups],
  );

  const generalGroup =
    groups.find(
      (group) =>
        group.name.trim().toLowerCase() === GENERAL_GROUP_NAME.toLowerCase(),
    ) ?? null;
  const folderGroups = groups.filter((group) => group.id !== generalGroup?.id);
  const filteredFolders = useMemo(() => {
    const q = groupSearch.trim().toLowerCase();
    if (!q) return folderGroups;
    return folderGroups.filter((group) =>
      group.name.toLowerCase().includes(q),
    );
  }, [folderGroups, groupSearch]);

  const createGroup = async () => {
    const name = createGroupName.trim();
    if (!name) {
      setGroupsError("Group name cannot be empty");
      return;
    }
    const insertAt =
      (addingAt ?? folderGroups.length) + (generalGroup ? 1 : 0);
    setCreatingGroup(true);
    setGroupsError(null);
    try {
      const res = await fetch(apiUrl("/api/groups"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, insertAt }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setGroupsError(
          typeof data.error === "string" ? data.error : "Failed to create group",
        );
        return;
      }
      const created = data.group as GroupRow | undefined;
      setCreateGroupName("");
      setAddingAt(null);
      await loadGroups();
      if (created?.id) {
        setOpenedGroupId(created.id);
      }
    } catch {
      setGroupsError("Failed to create group");
    } finally {
      setCreatingGroup(false);
    }
  };

  const openAddGroup = (at: number) => {
    setAddingAt(at);
    setCreateGroupName("");
    setGroupsError(null);
    window.setTimeout(() => groupInputRef.current?.focus(), 30);
  };

  const cancelAddGroup = () => {
    setAddingAt(null);
    setCreateGroupName("");
  };

  useEffect(() => {
    if (addingAt == null) return;
    const el = groupSizerRef.current;
    if (!el) return;
    setGroupInputWidth(Math.max(GROUP_PILL_MIN_PX, el.offsetWidth + 4));
  }, [addingAt, createGroupName]);

  const groupsRef = useRef(groups);
  useEffect(() => {
    groupsRef.current = groups;
  }, [groups]);
  const generalGroupRef = useRef(generalGroup);
  useEffect(() => {
    generalGroupRef.current = generalGroup;
  }, [generalGroup]);

  const persistFolderOrderTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const latestOrderedRef = useRef<GroupRow[]>([]);
  const latestPreviousRef = useRef<GroupRow[]>([]);

  const persistFolderOrder = useCallback((orderedFolders: GroupRow[]) => {
    const generalGroup = generalGroupRef.current;
    const previous = groupsRef.current;
    const ordered = generalGroup
      ? [generalGroup, ...orderedFolders]
      : orderedFolders;

    setGroups(ordered);

    latestOrderedRef.current = ordered;
    latestPreviousRef.current = previous;

    if (persistFolderOrderTimerRef.current !== null) {
      clearTimeout(persistFolderOrderTimerRef.current);
    }
    persistFolderOrderTimerRef.current = setTimeout(async () => {
      persistFolderOrderTimerRef.current = null;
      const ordered = latestOrderedRef.current;
      const previous = latestPreviousRef.current;
      try {
        const res = await fetch(apiUrl("/api/groups"), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderedIds: ordered.map((g) => g.id) }),
        });
        if (!res.ok) {
          setGroups(previous);
          const data = await res.json().catch(() => ({}));
          setGroupsError(
            typeof data.error === "string"
              ? data.error
              : "Failed to save group order",
          );
        }
      } catch {
        setGroups(previous);
        setGroupsError("Failed to save group order");
      }
    }, 400);
  }, []);

  const handleDeleteGroup = async (groupId: string) => {
    setGroups((prev) => prev.filter((g) => g.id !== groupId));
    if (openedGroupId === groupId) selectGroup("all");
    try {
      const res = await fetch(apiUrl(`/api/groups/${groupId}`), {
        method: "DELETE",
      });
      if (!res.ok) {
        void loadGroups();
      } else {
        setTimeout(() => {
          router.push("/trash");
        }, 400);
      }
    } catch {
      void loadGroups();
    }
  };

  const canReorderPills = canReorderPillsBase && addingAt == null;

  return {
    groups,
    setGroups,
    openedGroupId,
    setOpenedGroupId,
    openedGroup,
    selectGroup,
    createGroupName,
    setCreateGroupName,
    creatingGroup,
    addingAt,
    groupsError,
    setGroupsError,
    draggingGroupId,
    setDraggingGroupId,
    groupInputRef,
    groupSizerRef,
    groupInputWidth,
    generalGroup,
    folderGroups,
    filteredFolders,
    allLinksCount,
    loadGroups,
    createGroup,
    openAddGroup,
    cancelAddGroup,
    persistFolderOrder,
    handleDeleteGroup,
    canReorderPills,
  };
}
