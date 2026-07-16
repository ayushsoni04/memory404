"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import LinkDetailOverlay from "@/components/LinkDetailOverlay";
import { GENERAL_GROUP_NAME } from "@/lib/group-constants";
import { useAddLinkFlow } from "./vault/useAddLinkFlow";
import { useLinkActions } from "./vault/useLinkActions";
import { useVaultGroups } from "./vault/useVaultGroups";
import { useVaultLinks } from "./vault/useVaultLinks";
import { useVaultPreferences } from "./vault/useVaultPreferences";
import VaultFeed from "./vault/VaultFeed";
import VaultGroupToolbar from "./vault/VaultGroupToolbar";
import VaultSidebar from "./vault/VaultSidebar";

export default function VaultInbox() {
  const router = useRouter();
  const pageRef = useRef<HTMLDivElement | null>(null);
  const [newCardId, setNewCardId] = useState<string | null>(null);

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

  const groupsState = useVaultGroups(router, groupSearch, canReorderPillsBase);

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
    setLinksCache,
    sortedLinks,
    loadLinks,
    prependLinkToPages,
    removeLinkFromPages,
    saveLink,
  } = useVaultLinks(openedGroupId, sortBy);

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
  } = addLinkFlow;

  const {
    openedLink,
    openedLinkIndex,
    overlayOrigin,
    openLinkDetail,
    closeLinkDetail,
    goPrevLink,
    goNextLink,
    handleDelete,
    copyLinkUrl,
    moveLinkToGroup,
  } = useLinkActions({
    router,
    links,
    setLinks,
    openedGroupId,
    setLinksCache,
    removeLinkFromPages,
    sortedLinks,
  });

  return (
    <div
      ref={pageRef}
      className="mx-auto flex min-h-screen w-full max-w-[var(--content-max)] flex-col gap-8 p-4 min-[1712px]:border-x min-[1712px]:border-border"
    >
      <VaultSidebar
        gridSize={gridSize}
        setGridSizeAndPersist={setGridSizeAndPersist}
        sidebarShowNotesForm={sidebarShowNotesForm}
        sidebarNotesText={sidebarNotesText}
        setSidebarNotesText={setSidebarNotesText}
        sidebarCountdown={sidebarCountdown}
        sidebarTimerActive={sidebarTimerActive}
        setSidebarTimerActive={setSidebarTimerActive}
        finishSidebarNotesFlow={() => void finishSidebarNotesFlow()}
        saving={saving}
        saveSuccess={saveSuccess}
        savePhase={savePhase}
        setSavePhase={setSavePhase}
        urlInput={urlInput}
        setUrlInput={setUrlInput}
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
        onDeleteGroup={handleDeleteGroup}
      />

      <div className="flex min-w-0 flex-1 flex-col lg:ml-[252px]">
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
              handleDeleteGroup={handleDeleteGroup}
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
              groupSearch={groupSearch}
              setGroupSearch={setGroupSearch}
              loadGroups={loadGroups}
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
          onLinkSaved={(row) => {
            setNewCardId(row.id);
            window.setTimeout(() => {
              setNewCardId((id) => (id === row.id ? null : id));
            }, 250);
            setLinks((prev) => [row, ...prev.filter((l) => l.id !== row.id)]);
            prependLinkToPages(row);
            void loadGroups();
          }}
          enteringLinkId={newCardId ?? sidebarSavedLinkId}
          sortedLinks={sortedLinks}
          openLinkDetail={openLinkDetail}
          feedImageSizes={feedImageSizes}
          hasMoreLinks={hasMoreLinks}
          sentinelRef={sentinelRef}
        />

        <p className="mt-8 shrink-0 text-[13px] text-subtle lg:hidden">
          © {new Date().getFullYear()} memory404
        </p>
      </div>

      {openedLink ? (
        <LinkDetailOverlay
          link={openedLink}
          groupName={openedGroup?.name ?? null}
          groups={groups.map((g) => ({
            id: g.id,
            name:
              g.name.trim().toLowerCase() === GENERAL_GROUP_NAME.toLowerCase()
                ? "All"
                : g.name,
          }))}
          originRect={overlayOrigin}
          onClose={closeLinkDetail}
          onPrev={goPrevLink}
          onNext={goNextLink}
          onDelete={(id) => void handleDelete(id)}
          onMove={(link, groupId) => void moveLinkToGroup(link, groupId)}
          onCopy={(link) => void copyLinkUrl(link)}
          hasPrev={openedLinkIndex > 0}
          hasNext={
            openedLinkIndex >= 0 && openedLinkIndex < links.length - 1
          }
        />
      ) : null}
    </div>
  );
}
