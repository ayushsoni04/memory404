// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import type { ReactNode } from "react";
import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import VaultSidebar from "@/components/vault/VaultSidebar";
import type { GroupRow } from "@/components/vault/types";

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

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const groups: GroupRow[] = [
  {
    id: "general",
    name: "General",
    createdAt: "2026-10-01T00:00:00.000Z",
    linksCount: 1,
    previewTitles: [],
  },
  {
    id: "reading",
    name: "Reading",
    createdAt: "2026-10-01T00:00:00.000Z",
    linksCount: 2,
    previewTitles: [],
  },
];

function PlaceHarness() {
  const [placeGroupId, setPlaceGroupId] = useState<string | null>("reading");
  const [creatingNewGroup, setCreatingNewGroup] = useState(false);
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
      savePhase="place"
      setSavePhase={() => {}}
      urlInput="https://example.com/pricing"
      handleSubmit={(event) => event.preventDefault()}
      groups={groups}
      creatingNewGroup={creatingNewGroup}
      setCreatingNewGroup={setCreatingNewGroup}
      placeGroupId={placeGroupId}
      setPlaceGroupId={setPlaceGroupId}
      newGroupNameDraft=""
      setNewGroupNameDraft={() => {}}
      saveError={null}
      setSaveError={() => {}}
      savedFlash={false}
      groupsError={null}
      loadGroups={async () => undefined}
      onDeleteLink={() => {}}
      onDeleteGroup={() => {}}
      groupSearch=""
      setGroupSearch={() => {}}
      filteredFolders={groups}
      selectGroup={() => {}}
    />
  );
}

describe("where a link is saved", () => {
  it("says which group is selected, including a new group", () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: () => ({
        matches: false,
        media: "",
        addEventListener: () => {},
        removeEventListener: () => {},
      }),
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          user: { name: "Ada", username: "ada", avatarUrl: null },
        }),
      }),
    );

    render(<PlaceHarness />);

    const reading = screen.getByRole("button", { name: "Reading" });
    const all = screen.getByRole("button", { name: "All" });
    const created = screen.getByRole("button", { name: "New group…" });
    expect(reading).toHaveAttribute("aria-pressed", "true");
    expect(all).toHaveAttribute("aria-pressed", "false");
    expect(created).toHaveAttribute("aria-pressed", "false");
    expect(reading.className).toContain("min-h-6");
    expect(
      screen.getByRole("group", { name: "Where do you want to save it?" }),
    ).toBeInTheDocument();

    fireEvent.click(all);
    expect(all).toHaveAttribute("aria-pressed", "true");
    expect(reading).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(created);
    expect(created).toHaveAttribute("aria-pressed", "true");
    expect(all).toHaveAttribute("aria-pressed", "false");
    expect(reading).toHaveAttribute("aria-pressed", "false");
  });
});
