"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useRef, useState } from "react";
import { GENERAL_GROUP_NAME } from "@/lib/group-constants";
import CommandPalette from "@/components/CommandPalette";
import { ExtensionErrorBanner } from "@/components/ExtensionErrorBanner";
import LinkDetailOverlay from "@/components/LinkDetailOverlay";
import { useAddLinkFlow } from "./vault/useAddLinkFlow";
import { useLinkActions } from "./vault/useLinkActions";
import { useVaultGroups } from "./vault/useVaultGroups";
import { useVaultLinks } from "./vault/useVaultLinks";
import { useVaultPreferences } from "./vault/useVaultPreferences";
import GroupTrashConfirm, {
  groupTrashTarget,
} from "./vault/GroupTrashConfirm";
import UndoNotice from "./vault/UndoNotice";
import VaultColumns from "./vault/VaultColumns";
import VaultFeed from "./vault/VaultFeed";
import VaultSidebar from "./vault/VaultSidebar";
import type { InitialVaultData } from "./vault/types";

const VaultGroupToolbar = dynamic(() => import("./vault/VaultGroupToolbar"), {
  ssr: false,
  loading: () => <div className="h-10" aria-hidden />,
});

export default function VaultInbox({
  initialData,
  isOwner = false,
}: {
  initialData: InitialVaultData;
  isOwner?: boolean;
}) {
  const pageRef = useRef<HTMLDivElement | null>(null);
  const [newCardId, setNewCardId] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [groupPendingTrashId, setGroupPendingTrashId] = useState<string | null>(
    null,
  );

  const {
    sortBy,
    setSortByAndPersist,
    gridSize,
    setGridSizeAndPersist,
    groupSearch,
    setGroupSearch,
    feedImageSizes,
    canReorderPills: canReorderPillsBase,
  } = useVaultPreferences();

  const groupsState = useVaultGroups(
    groupSearch,
    canReorderPillsBase,
    initialData.groups,
    initialData.openedGroupId,
  );

  const {
    groups,
    openedGroupId,
    openedGroup,
    selectGroup,
    createGroupName,
    setCreateGroupName,
    creatingGroup,
    addingAt,
    groupsError,
    draggingGroupId,
    setDraggingGroupId,
    groupInputRef,
    groupSizerRef,
    groupInputWidth,
    generalGroup,
    filteredFolders,
    allLinksCount,
    loadGroups,
    createGroup,
    openAddGroup,
    cancelAddGroup,
    persistFolderOrder,
    handleDeleteGroup,
    canReorderPills,
  } = groupsState;

  const {
    links,
    setLinks,
    loadingLinks,
    fetchError,
    hasMoreLinks,
    sentinelRef,
    scrollRootRef,
    setLinksCache,
    sortedLinks,
    loadLinks,
    prependLinkToPages,
    removeLinkFromPages,
    replaceLinkInPages,
    saveLink,
  } = useVaultLinks(openedGroupId, sortBy, initialData);

  const addLinkFlow = useAddLinkFlow({
    openedGroupId,
    generalGroup,
    links,
    setLinks,
    setLinksCache,
    prependLinkToPages,
    loadGroups,
    loadLinks,
    saveLink,
  });

  const {
    urlInput,
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
  } = addLinkFlow;

  const {
    openedLink,
    openedLinkIndex,
    overlayOrigin,
    openLinkDetail,
    updateSavedLink,
    closeLinkDetail,
    goPrevLink,
    goNextLink,
    handleDelete,
    moveLinkToGroup,
    deleteErrors,
    patchErrors,
    undoNotice,
    runUndo,
    dismissUndo,
  } = useLinkActions({
    links,
    setLinks,
    openedGroupId,
    setLinksCache,
    removeLinkFromPages,
    replaceLinkInPages,
    prependLinkToPages,
    loadGroups,
    sortedLinks,
    groupLabel: (id) => {
      const group = groups.find((item) => item.id === id);
      if (!group) return "that group";
      return group.name.trim().toLowerCase() === GENERAL_GROUP_NAME.toLowerCase()
        ? "All"
        : group.name;
    },
  });

  const overlayGroups = useMemo(
    () =>
      groups.map((g) => ({
        id: g.id,
        name:
          g.name.trim().toLowerCase() === GENERAL_GROUP_NAME.toLowerCase()
            ? "All"
            : g.name,
      })),
    [groups],
  );

  const paletteGroups = useMemo(
    () => [{ id: "all", name: "All" }, ...groups],
    [groups],
  );

  const askDeleteGroup = useCallback(
    (groupId: string) => {
      const target = groupTrashTarget(groups, groupId);
      if (!target) return;
      setGroupPendingTrashId(target.id);
    },
    [groups],
  );

  const groupPendingTrash = groupPendingTrashId
    ? groupTrashTarget(groups, groupPendingTrashId)
    : null;

  const handleFeedLinkSaved = useCallback(
    (row: (typeof sortedLinks)[number]) => {
      setNewCardId(row.id);
      window.setTimeout(() => {
        setNewCardId((id) => (id === row.id ? null : id));
      }, 250);
      setLinks((prev) => [row, ...prev.filter((link) => link.id !== row.id)]);
      prependLinkToPages(row);
      void loadGroups();
    },
    [loadGroups, prependLinkToPages, setLinks],
  );

  return (
    <>
      <ExtensionErrorBanner />
      <a
        href="#vault-feed"
        inert={openedLink ? true : undefined}
        className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:left-4 focus-visible:top-4 focus-visible:z-[260] focus-visible:inline-flex focus-visible:h-8 focus-visible:items-center focus-visible:rounded-full focus-visible:bg-pill-active focus-visible:px-3 focus-visible:text-[13px] focus-visible:font-medium focus-visible:text-pill-active-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklch,var(--focus)_70%,transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        Skip to links
      </a>
      <div
        ref={pageRef}
        inert={openedLink ? true : undefined}
        className="vault-shell mx-auto grid min-h-dvh w-full max-w-[var(--content-max)] grid-cols-1 gap-[var(--layout-gap-section)] px-[max(var(--layout-pad),env(safe-area-inset-left))] pe-[max(var(--layout-pad),env(safe-area-inset-right))] pt-[max(var(--layout-pad),env(safe-area-inset-top))] pb-[max(var(--layout-pad),env(safe-area-inset-bottom))] lg:h-dvh lg:max-h-dvh lg:grid-cols-[var(--sidebar-w)_minmax(0,1fr)] lg:gap-x-0 lg:gap-y-0 lg:overflow-hidden lg:ps-0 lg:pe-[max(var(--layout-pad),env(safe-area-inset-right))] lg:pt-0 lg:pb-0 min-[1712px]:border-x min-[1712px]:border-border"
      >
      <VaultColumns
        sidebar={
      <VaultSidebar
        gridSize={gridSize}
        setGridSizeAndPersist={setGridSizeAndPersist}
        sidebarShowNotesForm={sidebarShowNotesForm}
        sidebarNotesText={sidebarNotesText}
        setSidebarNotesText={setSidebarNotesText}
        finishSidebarNotesFlow={() => void finishSidebarNotesFlow()}
        saving={saving}
        saveSuccess={saveSuccess}
        savePhase={savePhase}
        setSavePhase={setSavePhase}
        urlInput={urlInput}
        handleSubmit={(e) => void handleSubmit(e)}
        groups={groups}
        creatingNewGroup={creatingNewGroup}
        setCreatingNewGroup={setCreatingNewGroup}
        placeGroupId={placeGroupId}
        setPlaceGroupId={setPlaceGroupId}
        newGroupNameDraft={newGroupNameDraft}
        setNewGroupNameDraft={setNewGroupNameDraft}
        saveError={saveError}
        setSaveError={setSaveError}
        savedFlash={savedFlash}
        groupsError={groupsError}
        loadGroups={loadGroups}
        onDeleteLink={handleDelete}
        onDeleteGroup={askDeleteGroup}
        isOwner={isOwner}
        groupSearch={groupSearch}
        setGroupSearch={setGroupSearch}
        filteredFolders={filteredFolders}
        selectGroup={selectGroup}
      />
        }
        feed={
        <VaultFeed
          groupToolbar={
            <VaultGroupToolbar
              openedGroupId={openedGroupId}
              selectGroup={selectGroup}
              generalGroup={generalGroup}
              filteredFolders={filteredFolders}
              draggingGroupId={draggingGroupId}
              setDraggingGroupId={setDraggingGroupId}
              persistFolderOrder={persistFolderOrder}
              canReorderPills={canReorderPills}
              handleDeleteGroup={askDeleteGroup}
              addingAt={addingAt}
              createGroupName={createGroupName}
              setCreateGroupName={setCreateGroupName}
              creatingGroup={creatingGroup}
              createGroup={createGroup}
              openAddGroup={openAddGroup}
              cancelAddGroup={cancelAddGroup}
              groupInputRef={groupInputRef}
              groupSizerRef={groupSizerRef}
              groupInputWidth={groupInputWidth}
              sortBy={sortBy}
              setSortByAndPersist={setSortByAndPersist}
              loadGroups={loadGroups}
              loadLinks={loadLinks}
              onOpenSearch={() => setPaletteOpen(true)}
              onDropLink={(linkId, groupId) => {
                const link = links.find((item) => item.id === linkId);
                if (!link) return;
                void moveLinkToGroup(link, groupId);
              }}
            />
          }
          openedGroupId={openedGroupId}
          openedGroup={openedGroup}
          allLinksCount={allLinksCount}
          groupsError={groupsError}
          loadGroups={loadGroups}
          loadingLinks={loadingLinks}
          fetchError={fetchError}
          loadLinks={loadLinks}
          gridSize={gridSize}
          generalGroup={generalGroup}
          saveLink={saveLink}
          onLinkSaved={handleFeedLinkSaved}
          enteringLinkId={newCardId ?? sidebarSavedLinkId}
          sortedLinks={sortedLinks}
          openLinkDetail={openLinkDetail}
          feedImageSizes={feedImageSizes}
          hasMoreLinks={hasMoreLinks}
          sentinelRef={sentinelRef}
          scrollRootRef={scrollRootRef}
        />
        }
        footer={
          <p className="mt-[var(--layout-gap-section)] shrink-0 text-[13px] text-subtle lg:hidden">
            © {new Date().getFullYear()} memory404
          </p>
        }
      />
      </div>

      {openedLink ? (
        <LinkDetailOverlay
          link={openedLink}
          groupName={(() => {
            const raw =
              groups.find((group) => group.id === openedLink.groupId)?.name ??
              openedGroup?.name ??
              null;
            if (!raw) return null;
            return raw.trim().toLowerCase() === GENERAL_GROUP_NAME.toLowerCase()
              ? "All"
              : raw;
          })()}
          groups={overlayGroups}
          originRect={overlayOrigin}
          onClose={closeLinkDetail}
          onPrev={goPrevLink}
          onNext={goNextLink}
          onDelete={(id) => void handleDelete(id)}
          onMove={(link, groupId) => void moveLinkToGroup(link, groupId)}
          hasPrev={openedLinkIndex > 0}
          hasNext={
            openedLinkIndex >= 0 && openedLinkIndex < sortedLinks.length - 1
          }
          actionError={
            openedLink
              ? (deleteErrors[openedLink.id] ?? patchErrors[openedLink.id] ?? null)
              : null
          }
          onNotesSaved={updateSavedLink}
        />
      ) : null}

      {groupPendingTrash ? (
        <GroupTrashConfirm
          name={groupPendingTrash.name}
          linksCount={groupPendingTrash.linksCount}
          onCancel={() => setGroupPendingTrashId(null)}
          onConfirm={() => {
            const id = groupPendingTrash.id;
            setGroupPendingTrashId(null);
            void handleDeleteGroup(id);
          }}
        />
      ) : null}

      <UndoNotice
        notice={undoNotice}
        onUndo={() => void runUndo()}
        onDismiss={dismissUndo}
      />

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        groups={paletteGroups}
        onSelectGroup={selectGroup}
        onOpenLink={openLinkDetail}
        onSaveUrl={async (url) => {
          const groupId =
            !openedGroupId || openedGroupId === "all"
              ? (generalGroup?.id ?? null)
              : openedGroupId;
          if (!groupId) {
            return { ok: false, error: "Create a group before saving this link." };
          }
          const result = await saveLink(url, groupId);
          if (result.ok) handleFeedLinkSaved(result.link);
          return result.ok
            ? { ok: true, link: result.link }
            : { ok: false, error: result.error };
        }}
        onNoteSaved={updateSavedLink}
        isOwner={isOwner}
      />
    </>
  );
}
