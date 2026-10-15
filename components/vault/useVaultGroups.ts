"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { useQueryState } from "nuqs";
import { apiUrl } from "@/lib/api-base";
import { GENERAL_GROUP_NAME } from "@/lib/group-constants";
import { groupNameIssue } from "@/lib/group-name";
import { createGroupErrorMessage } from "./create-group";
import { groupTrashFailureMessage } from "./GroupTrashConfirm";
import { MISSING_GROUP_NOTICE, resolveOpenedGroup } from "./opened-group";
import {
  GROUP_PILL_MIN_PX,
  OPENED_GROUP_COOKIE,
  type GroupRow,
} from "./types";

function persistOpenedGroup(id: string) {
  try {
    window.localStorage.setItem(OPENED_GROUP_COOKIE, id);
    document.cookie = `${OPENED_GROUP_COOKIE}=${encodeURIComponent(id)}; Path=/; Max-Age=31536000; SameSite=Lax`;
  } catch {}
}

export function useVaultGroups(
  groupSearch: string,
  canReorderPillsBase: boolean,
  initialGroups: GroupRow[],
  initialOpenedGroupId: string,
) {
  const [groups, setGroups] = useState<GroupRow[]>(initialGroups);
  const [openedGroupId, setOpenedGroupId] = useQueryState("group", {
    defaultValue: initialOpenedGroupId,
    history: "push" as const,
  });

  useEffect(() => {
    persistOpenedGroup(openedGroupId);
  }, [openedGroupId]);

  const [createGroupName, setCreateGroupName] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [createGroupError, setCreateGroupError] = useState<string | null>(null);
  const [addingAt, setAddingAt] = useState<number | null>(null);
  const [groupsError, setGroupsError] = useState<string | null>(null);
  const [missingGroupNotice, setMissingGroupNotice] = useState<string | null>(
    null,
  );
  const [draggingGroupId, setDraggingGroupId] = useState<string | null>(null);

  const groupInputRef = useRef<HTMLInputElement | null>(null);
  const groupSizerRef = useRef<HTMLSpanElement | null>(null);
  const [groupInputWidth, setGroupInputWidth] = useState(GROUP_PILL_MIN_PX);

  const {
    data: swrGroups,
    mutate: mutateGroups,
    isLoading: groupsLoading,
    isValidating: groupsValidating,
  } = useSWR(
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
    {
      fallbackData: initialGroups,
      revalidateOnMount: initialGroups.length === 0,
      revalidateIfStale: false,
      revalidateOnFocus: false,
      dedupingInterval: 30_000,
    },
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
    }
  }, [swrGroups]);

  const loadGroups = useCallback(() => {
    return mutateGroups();
  }, [mutateGroups]);

  const groupsReady =
    Boolean(swrGroups) &&
    !groupsLoading &&
    !(groupsValidating && swrGroups.length === 0) &&
    !groupsError;

  const selectGroup = useCallback(
    (id: string) => {
      setMissingGroupNotice(null);
      void setOpenedGroupId(id);
    },
    [setOpenedGroupId],
  );

  useEffect(() => {
    const next = resolveOpenedGroup({
      openedGroupId,
      groupIds: groups.map((group) => group.id),
      groupsReady,
      creatingGroup,
    });
    if (next === "all" && openedGroupId !== "all") {
      setMissingGroupNotice(MISSING_GROUP_NOTICE);
      void setOpenedGroupId("all", { history: "replace" });
      return;
    }
    if (
      openedGroupId &&
      openedGroupId !== "all" &&
      groups.some((group) => group.id === openedGroupId)
    ) {
      setMissingGroupNotice((current) => (current ? null : current));
    }
  }, [creatingGroup, groups, groupsReady, openedGroupId, setOpenedGroupId]);

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
    const matched = folderGroups.filter((group) =>
      group.name.toLowerCase().includes(q),
    );
    if (!openedGroupId || openedGroupId === "all") return matched;
    const open = folderGroups.find((group) => group.id === openedGroupId);
    if (open && !matched.some((group) => group.id === open.id)) {
      return [open, ...matched];
    }
    return matched;
  }, [folderGroups, groupSearch, openedGroupId]);

  const createGroup = async () => {
    const name = createGroupName.trim();
    const issue = groupNameIssue(name);
    if (issue) {
      setCreateGroupError(issue);
      return;
    }
    const insertAt =
      (addingAt ?? folderGroups.length) + (generalGroup ? 1 : 0);
    setCreatingGroup(true);
    setCreateGroupError(null);
    try {
      const res = await fetch(apiUrl("/api/groups"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, insertAt }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCreateGroupError(createGroupErrorMessage(data));
        return;
      }
      const created = data.group as GroupRow | undefined;
      setCreateGroupName("");
      setAddingAt(null);
      await loadGroups();
      if (created?.id) {
        void setOpenedGroupId(created.id);
      }
    } catch {
      setCreateGroupError(createGroupErrorMessage(null, true));
    } finally {
      setCreatingGroup(false);
    }
  };

  const openAddGroup = (at: number) => {
    setAddingAt(at);
    setCreateGroupName("");
    setCreateGroupError(null);
    window.setTimeout(() => groupInputRef.current?.focus(), 30);
  };

  const cancelAddGroup = () => {
    setAddingAt(null);
    setCreateGroupName("");
    setCreateGroupError(null);
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

  const handleDeleteGroup = async (
    groupId: string,
  ): Promise<{ ok: true } | { ok: false; error: string }> => {
    try {
      const res = await fetch(apiUrl(`/api/groups/${groupId}`), {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { ok: false, error: groupTrashFailureMessage(data) };
      }
      setGroups((prev) => prev.filter((group) => group.id !== groupId));
      if (openedGroupId === groupId) selectGroup("all");
      return { ok: true };
    } catch {
      return { ok: false, error: groupTrashFailureMessage(null, true) };
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
    createGroupError,
    setCreateGroupError,
    addingAt,
    groupsError,
    setGroupsError,
    missingGroupNotice,
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
