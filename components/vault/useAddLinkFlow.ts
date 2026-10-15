"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { coerceHttpUrl, type LinkApiRow } from "@/lib/links";
import { saveLinkNote } from "@/lib/save-link-note";
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
  const urlRef = useRef("");
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
  const [sidebarSavedLinkId, setSidebarSavedLinkId] = useState<string | null>(
    null,
  );

  const resetSaveForm = useCallback(() => {
    urlRef.current = "";
    setUrlInput("");
    setNewGroupNameDraft("");
    setCreatingNewGroup(false);
    setPlaceGroupId(null);
    setSavePhase("paste");
    setSaveError(null);
  }, []);

  const finishSidebarNotesFlow = useCallback(async () => {
    const linkId = sidebarSavedLinkId;
    const txt = sidebarNotesText.trim();
    if (linkId && txt) {
      const result = await saveLinkNote(linkId, txt);
      if (!result.ok) {
        setSaveError(result.error);
        return;
      }
      const updated = result.link;
      setLinks((prev) => prev.map((l) => (l.id === linkId ? updated : l)));
      if (openedGroupId) {
        setLinksCache((prev) => {
          const list = prev[openedGroupId] || [];
          const next = {
            ...prev,
            [openedGroupId]: list.map((l) => (l.id === linkId ? updated : l)),
          };
          writeLinksCacheToStorage(next);
          return next;
        });
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
    setSaveError,
  ]);

  const handlePasteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setSavedFlash(false);
    const url = urlRef.current.trim();
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
          setSavePhase("place");
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

        setSidebarShowNotesForm(true);
      } catch {
        setSaveError("Network error — try again");
        setLinks(originalLinks);
        setSaving(false);
        setSavePhase("place");
      }
      return;
    }

    setPlaceGroupId(null);
    setCreatingNewGroup(false);
    setNewGroupNameDraft("");
    setSavePhase("place");
  };

  const handlePlaceSave = async () => {
    const url = urlRef.current.trim();
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
    const insertedDraft =
      (groupId === openedGroupId || openedGroupId === "all") && !trimmedNew;

    if (insertedDraft) {
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
        if (insertedDraft) setLinks(originalLinks);
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

      setSidebarShowNotesForm(true);
    } catch {
      setSaveError("Network error — try again");
      if (insertedDraft) setLinks(originalLinks);
      setSaving(false);
    }
  };

  const pasteActionRef = useRef<(url: string) => void>(() => {});
  useEffect(() => {
    pasteActionRef.current = (url: string) => {
      urlRef.current = url;
      setUrlInput(url);
      setSaveError(null);
      if (!openedGroupId || openedGroupId === "all") {
        setPlaceGroupId(null);
        setCreatingNewGroup(false);
        setNewGroupNameDraft("");
        setSavePhase("place");
        return;
      }
      void handlePasteSubmit({ preventDefault() {} } as React.FormEvent);
    };
  });

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        target.closest("input, textarea, select, [contenteditable='true']")
      ) {
        return;
      }
      const text = event.clipboardData?.getData("text/plain")?.trim() ?? "";
      const link = coerceHttpUrl(text);
      if (!link) return;
      event.preventDefault();
      pasteActionRef.current(link);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

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
    sidebarSavedLinkId,
    handleSubmit,
    finishSidebarNotesFlow,
    resetSaveForm,
  };
}
