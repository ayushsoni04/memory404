// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import VaultSidebar from "@/components/vault/VaultSidebar";

vi.mock("next/image", () => ({
  default: () => null,
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("thinking-orbs", () => ({
  ThinkingOrb: () => null,
}));

vi.mock("@/components/vault/SidebarDitherBackground", () => ({
  default: () => null,
}));

vi.mock("@/components/GlitchText", () => ({
  default: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/components/MorphText", () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const selectGroup = vi.fn();

function SearchSidebar() {
  const [query, setQuery] = useState("");
  return (
    <VaultSidebar
      gridSize="default"
      setGridSizeAndPersist={() => {}}
      sidebarShowNotesForm={false}
      sidebarNotesText=""
      setSidebarNotesText={() => {}}
      finishSidebarNotesFlow={() => {}}
      saving={false}
      saveSuccess={false}
      savePhase="paste"
      setSavePhase={() => {}}
      urlInput=""
      handleSubmit={(event) => event.preventDefault()}
      groups={[]}
      creatingNewGroup={false}
      setCreatingNewGroup={() => {}}
      placeGroupId={null}
      setPlaceGroupId={() => {}}
      newGroupNameDraft=""
      setNewGroupNameDraft={() => {}}
      saveError={null}
      setSaveError={() => {}}
      savedFlash={false}
      groupsError={null}
      loadGroups={async () => undefined}
      onDeleteLink={() => {}}
      onDeleteGroup={() => {}}
      groupSearch={query}
      setGroupSearch={setQuery}
      filteredFolders={query.trim() ? [] : [{ id: "reading", name: "Reading", createdAt: "", linksCount: 1, previewTitles: [] }]}
      selectGroup={selectGroup}
    />
  );
}

describe("sidebar group search", () => {
  it("jumps to All when that is what was typed", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          user: { name: "Ada", username: "ada", avatarUrl: null },
        }),
      }),
    );
    selectGroup.mockClear();
    vi.stubGlobal("ResizeObserver", ResizeObserverStub);
    render(<SearchSidebar />);

    const input = screen.getByRole("combobox", { name: "Search groups" });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "all" } });

    const all = screen.getByRole("option", { name: "All" });
    fireEvent.click(all);
    expect(selectGroup).toHaveBeenCalledWith("all");
  });
});
