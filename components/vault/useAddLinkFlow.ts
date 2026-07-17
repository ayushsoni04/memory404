"use client";

import { useCallback, useEffect, useState } from "react";
import type { LinkApiRow } from "@/lib/links";
import { writeLinksCacheToStorage } from "./storage";
import type { GroupRow } from "./types";

type SaveLinkResult =
  | { ok: true; link: LinkApiRow }
  | { ok: false; error: string };

type UseAddLinkFlowDeps = {
  openedGroupId: string | null;
  generalGroup: GroupRow | null;
  links: LinkApiRow[];
  setLinks: React.Dispatch<React.SetStateAction<LinkApiRow[]>>;
  setLinksCache: React.Dispatch<
    React.SetStateAction<Record<string, LinkApiRow[]>>
  >;
  prependLinkToPages: (row: LinkApiRow) => void;
  loadGroups: () => Promise<unknown>;
  loadLinks: () => Promise<unknown>;
  saveLink: (
    url: string,
    groupId: string,
    options?: { newGroupName?: string },
  ) => Promise<SaveLinkResult>;
};

export function useAddLinkFlow({
  openedGroupId,
  generalGroup,
  links,
  setLinks,
  setLinksCache,
  prependLinkToPages,
  loadGroups,
  loadLinks,
  saveLink,
}: UseAddLinkFlowDeps) {
  const [urlInput, setUrlInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [savePhase, setSavePhase] = useState<"paste" | "place">("paste");
  const [placeGroupId, setPlaceGroupId] = useState<string | null>(null);
  const [newGroupNameDraft, setNewGroupNameDraft] = useState("");
  const [creatingNewGroup, setCreatingNewGroup] = useState(false);

  const [sidebarShowNotesForm, setSidebarShowNotesForm] = useState(false);
  const [sidebarNotesText, setSidebarNotesText] = useState("");
  const [sidebarCountdown, setSidebarCountdown] = useState(5);
  const [sidebarTimerActive, setSidebarTimerActive] = useState(false);
  const [sidebarSavedLinkId, setSidebarSavedLinkId] = useState<string | null>(
    null,
  );

  const resetSaveForm = useCallback(() => {
    setUrlInput("");
    setNewGroupNameDraft("");
    setCreatingNewGroup(false);
    setPlaceGroupId(null);
    setSavePhase("paste");
    setSaveError(null);
  }, []);

  const finishSidebarNotesFlow = useCallback(async () => {
    setSidebarTimerActive(false);
    const linkId = sidebarSavedLinkId;
    const txt = sidebarNotesText.trim();
    if (linkId && txt) {
      try {
        const res = await fetch(`/api/links/${linkId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes: txt }),
        });
        const data = await res.json();
        if (res.ok && data.link) {
          const updated = data.link as LinkApiRow;
          setLinks((prev) => prev.map((l) => (l.id === linkId ? updated : l)));
          if (openedGroupId) {
            setLinksCache((prev) => {
              const list = prev[openedGroupId] || [];
              const next = {
                ...prev,
                [openedGroupId]: list.map((l) =>
                  l.id === linkId ? updated : l,
                ),
              };
              writeLinksCacheToStorage(next);
              return next;
            });
          }
        }
      } catch (e) {
        console.error("Failed to save sidebar notes:", e);
      }
    }
    setSidebarShowNotesForm(false);
    setSidebarNotesText("");
    setSidebarSavedLinkId(null);
    resetSaveForm();
    setSaveSuccess(false);
    setSaving(false);
  }, [
    sidebarSavedLinkId,
    sidebarNotesText,
    openedGroupId,
    setLinks,
    setLinksCache,
    resetSaveForm,
  ]);

  useEffect(() => {
    if (!sidebarTimerActive || sidebarCountdown <= 0) {
      if (sidebarTimerActive && sidebarCountdown === 0) {
        void finishSidebarNotesFlow();
      }
      return;
    }
    const timer = setTimeout(() => {
      setSidebarCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sidebarCountdown, sidebarTimerActive]);

  const handlePasteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setSavedFlash(false);
    const url = urlInput.trim();
    if (!url) {
      setSaveError("Enter a URL");
      return;
    }

    if (openedGroupId && openedGroupId !== "all") {
      setPlaceGroupId(openedGroupId);
      setCreatingNewGroup(false);
      setNewGroupNameDraft("");

      let hostname = "";
      try {
        hostname = new URL(url).hostname;
      } catch {
        hostname = url.replace(/^https?:\/\/(www\.)?/, "").split("/")[0];
      }

      const tempId = `optimistic-${Date.now()}`;
      const draftLink: LinkApiRow = {
        id: tempId,
        url,
        title: hostname,
        customTitle: null,
        displayTitle: hostname,
        description: "Saving link...",
        imageUrl: "",
        faviconUrl: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=128`,
        tags: [],
        notes: null,
        groupId: openedGroupId,
        metadataStatus: "pending",
        createdAt: new Date().toISOString(),
        deletedAt: null,
        isPending: true,
      };

      const originalLinks = links;
      setLinks((prev) => [draftLink, ...prev]);

      setSaving(true);
      setSaveSuccess(false);

      try {
        const result = await saveLink(url, openedGroupId);
        if (!result.ok) {
          setSaveError(result.error);
          setLinks(originalLinks);
          setSaving(false);
          return;
        }

        setSaveSuccess(true);
        setSidebarSavedLinkId(result.link.id);

        const row = result.link;
        setLinks((prev) => [
          row,
          ...prev.filter((l) => l.id !== tempId && l.id !== row.id),
        ]);
        prependLinkToPages(row);

        setLinksCache((prev) => {
          const groupLinks = prev[openedGroupId] || [];
          const next = {
            ...prev,
            [openedGroupId]: [
              row,
              ...groupLinks.filter((l) => l.id !== tempId && l.id !== row.id),
            ],
          };
          writeLinksCacheToStorage(next);
          return next;
        });

        void loadGroups();

        await new Promise((resolve) => setTimeout(resolve, 400));

        setSidebarCountdown(5);
        setSidebarTimerActive(true);
        setSidebarShowNotesForm(true);
      } catch {
        setLinks(originalLinks);
        setSaving(false);
      }
      return;
    }

    setPlaceGroupId(null);
    setCreatingNewGroup(false);
    setNewGroupNameDraft("");
    setSavePhase("place");
  };

  const handlePlaceSave = async () => {
    const url = urlInput.trim();
    if (!url) {
      setSaveError("Enter a URL");
      setSavePhase("paste");
      return;
    }

    const trimmedNew = creatingNewGroup ? newGroupNameDraft.trim() : "";
    const rawGroupId = placeGroupId ?? openedGroupId;
    const groupId =
      rawGroupId === "all" ? (generalGroup?.id ?? null) : rawGroupId;

    if (!groupId && !trimmedNew) {
      setSaveError("Pick a group");
      return;
    }

    let hostname = "";
    try {
      hostname = new URL(url).hostname;
    } catch {
      hostname = url.replace(/^https?:\/\/(www\.)?/, "").split("/")[0];
    }

    const tempId = `optimistic-${Date.now()}`;
    const draftLink: LinkApiRow = {
      id: tempId,
      url,
      title: hostname,
      customTitle: null,
      displayTitle: hostname,
      description: "Saving link...",
      imageUrl: "",
      faviconUrl: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=128`,
      tags: [],
      notes: null,
      groupId: groupId ?? "",
      metadataStatus: "pending",
      createdAt: new Date().toISOString(),
      deletedAt: null,
      isPending: true,
    };

    const originalLinks = links;

    if (
      (groupId === openedGroupId || openedGroupId === "all") &&
      !trimmedNew
    ) {
      setLinks((prev) => [draftLink, ...prev]);
    }

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const result = await saveLink(url, groupId ?? "", {
        newGroupName: trimmedNew || undefined,
      });
      if (!result.ok) {
        setSaveError(result.error);
        if (groupId === openedGroupId && !trimmedNew) {
          setLinks(originalLinks);
        }
        setSaving(false);
        return;
      }

      setSaveSuccess(true);
      setSidebarSavedLinkId(result.link.id);

      const row = result.link;

      if (row.groupId === openedGroupId) {
        setLinks((prev) => [
          row,
          ...prev.filter((l) => l.id !== tempId && l.id !== row.id),
        ]);
        prependLinkToPages(row);
      } else {
        setLinks((prev) => prev.filter((l) => l.id !== tempId));
        void loadLinks();
      }

      if (openedGroupId) {
        setLinksCache((prev) => {
          const groupLinks = prev[openedGroupId] || [];
          const updatedGroupLinks = groupLinks.filter((l) => l.id !== tempId);
          const next = {
            ...prev,
            [openedGroupId]: updatedGroupLinks,
          };
          if (row.groupId === openedGroupId) {
            next[openedGroupId] = [
              row,
              ...next[openedGroupId].filter((l) => l.id !== row.id),
            ];
          } else if (row.groupId) {
            next[row.groupId] = [
              row,
              ...(next[row.groupId] || []).filter((l) => l.id !== row.id),
            ];
          }
          writeLinksCacheToStorage(next);
          return next;
        });
      }
      void loadGroups();

      await new Promise((resolve) => setTimeout(resolve, 400));

      setSidebarCountdown(5);
      setSidebarTimerActive(true);
      setSidebarShowNotesForm(true);
    } catch {
      if (groupId === openedGroupId && !trimmedNew) {
        setLinks(originalLinks);
      }
      setSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savePhase === "paste") {
      handlePasteSubmit(e);
      return;
    }
    await handlePlaceSave();
  };

  return {
    urlInput,
    setUrlInput,
    saving,
    saveSuccess,
    saveError,
    setSaveError,
    savedFlash,
    savePhase,
    setSavePhase,
    placeGroupId,
    setPlaceGroupId,
    newGroupNameDraft,
    setNewGroupNameDraft,
    creatingNewGroup,
    setCreatingNewGroup,
    sidebarShowNotesForm,
    sidebarNotesText,
    setSidebarNotesText,
    sidebarCountdown,
    sidebarTimerActive,
    setSidebarTimerActive,
    sidebarSavedLinkId,
    handleSubmit,
    finishSidebarNotesFlow,
    resetSaveForm,
  };
}
