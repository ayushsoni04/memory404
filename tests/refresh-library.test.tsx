// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, renderHook, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import VaultGroupToolbar from "@/components/vault/VaultGroupToolbar";
import {
  LIBRARY_REFRESH_MS,
  useLibraryAutoRefresh,
} from "@/components/vault/useLibraryAutoRefresh";
import type { GroupRow } from "@/components/vault/types";

vi.mock("@/lib/ui-sound", () => ({
  playUiSound: vi.fn(),
}));

const folders: GroupRow[] = [
  {
    id: "reading",
    name: "Reading",
    createdAt: "2026-01-01T00:00:00.000Z",
    linksCount: 1,
    previewTitles: [],
  },
];

function setVisibility(state: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => state,
  });
}

function setOnline(online: boolean) {
  Object.defineProperty(navigator, "onLine", {
    configurable: true,
    get: () => online,
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  setVisibility("visible");
  setOnline(true);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  document.body.innerHTML = "";
});

function setup(paused = false) {
  const loadGroups = vi.fn(async () => undefined);
  const loadLinks = vi.fn(async () => undefined);
  const view = renderHook(
    (props: { paused: boolean }) =>
      useLibraryAutoRefresh({ loadGroups, loadLinks, paused: props.paused }),
    { initialProps: { paused } },
  );
  return { loadGroups, loadLinks, ...view };
}

describe("library auto refresh", () => {
  it("has no Refresh button in the group bar", () => {
    render(
      <VaultGroupToolbar
        openedGroupId="all"
        selectGroup={() => {}}
        generalGroup={{ ...folders[0], id: "general", name: "General" }}
        filteredFolders={folders}
        draggingGroupId={null}
        setDraggingGroupId={() => {}}
        persistFolderOrder={() => {}}
        canReorderPills={false}
        handleDeleteGroup={() => {}}
        addingAt={null}
        createGroupName=""
        setCreateGroupName={() => {}}
        creatingGroup={false}
        createGroupError={null}
        setCreateGroupError={() => {}}
        createGroup={async () => undefined}
        openAddGroup={() => {}}
        cancelAddGroup={() => {}}
        groupInputRef={{ current: null }}
        groupSizerRef={{ current: null }}
        groupInputWidth={96}
        sortBy="newest"
        setSortByAndPersist={() => {}}
        onDropLink={() => {}}
      />,
    );
    expect(screen.queryByRole("button", { name: "Refresh" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sort links/ })).toBeInTheDocument();
  });

  it("reloads groups and links on every interval", async () => {
    const { loadGroups, loadLinks } = setup();
    expect(loadLinks).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(LIBRARY_REFRESH_MS);
    expect(loadGroups).toHaveBeenCalledTimes(1);
    expect(loadLinks).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(LIBRARY_REFRESH_MS);
    expect(loadGroups).toHaveBeenCalledTimes(2);
    expect(loadLinks).toHaveBeenCalledTimes(2);
  });

  it("waits while the tab is hidden, then catches up when it returns", async () => {
    const { loadLinks } = setup();
    setVisibility("hidden");
    await vi.advanceTimersByTimeAsync(LIBRARY_REFRESH_MS * 3);
    expect(loadLinks).not.toHaveBeenCalled();

    setVisibility("visible");
    document.dispatchEvent(new Event("visibilitychange"));
    expect(loadLinks).toHaveBeenCalledTimes(1);
  });

  it("does not reload again when the tab returns after a short glance away", async () => {
    const { loadLinks } = setup();
    await vi.advanceTimersByTimeAsync(LIBRARY_REFRESH_MS);
    expect(loadLinks).toHaveBeenCalledTimes(1);

    setVisibility("hidden");
    await vi.advanceTimersByTimeAsync(5_000);
    setVisibility("visible");
    document.dispatchEvent(new Event("visibilitychange"));
    expect(loadLinks).toHaveBeenCalledTimes(1);
  });

  it("skips while offline and catches up when the connection returns", async () => {
    const { loadLinks } = setup();
    setOnline(false);
    await vi.advanceTimersByTimeAsync(LIBRARY_REFRESH_MS * 2);
    expect(loadLinks).not.toHaveBeenCalled();

    setOnline(true);
    window.dispatchEvent(new Event("online"));
    expect(loadLinks).toHaveBeenCalledTimes(1);
  });

  it("holds off while paused or while you are typing", async () => {
    const { loadLinks, rerender } = setup(true);
    await vi.advanceTimersByTimeAsync(LIBRARY_REFRESH_MS);
    expect(loadLinks).not.toHaveBeenCalled();

    rerender({ paused: false });
    const field = document.createElement("input");
    document.body.append(field);
    field.focus();
    await vi.advanceTimersByTimeAsync(LIBRARY_REFRESH_MS);
    expect(loadLinks).not.toHaveBeenCalled();

    field.blur();
    await vi.advanceTimersByTimeAsync(LIBRARY_REFRESH_MS);
    expect(loadLinks).toHaveBeenCalledTimes(1);
  });

  it("runs one reload at a time, and keeps going after a failed one", async () => {
    let release: () => void = () => {};
    const loadGroups = vi.fn(async () => undefined);
    const loadLinks = vi
      .fn<() => Promise<void>>()
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            release = resolve;
          }),
      )
      .mockRejectedValueOnce(new Error("Failed to load links"))
      .mockResolvedValue(undefined);
    renderHook(() => useLibraryAutoRefresh({ loadGroups, loadLinks }));

    await vi.advanceTimersByTimeAsync(LIBRARY_REFRESH_MS);
    await vi.advanceTimersByTimeAsync(LIBRARY_REFRESH_MS);
    expect(loadLinks).toHaveBeenCalledTimes(1);

    release();
    await vi.advanceTimersByTimeAsync(LIBRARY_REFRESH_MS);
    expect(loadLinks).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(LIBRARY_REFRESH_MS);
    expect(loadLinks).toHaveBeenCalledTimes(3);
  });

  it("stops when the library unmounts", async () => {
    const { loadLinks, unmount } = setup();
    unmount();
    await vi.advanceTimersByTimeAsync(LIBRARY_REFRESH_MS * 2);
    expect(loadLinks).not.toHaveBeenCalled();
  });
});
