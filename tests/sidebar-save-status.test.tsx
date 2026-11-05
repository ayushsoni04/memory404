// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import type { ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
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

afterEach(() => {
  cleanup();
});

function renderSaving(saveSuccess: boolean) {
  render(
    <VaultSidebar
      gridSize="default"
      setGridSizeAndPersist={() => {}}
      sidebarShowNotesForm={false}
      sidebarNotesText=""
      setSidebarNotesText={() => {}}
      finishSidebarNotesFlow={() => {}}
      saving
      saveSuccess={saveSuccess}
      savePhase="place"
      setSavePhase={() => {}}
      urlInput="https://example.com"
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
      groupSearch=""
      setGroupSearch={() => {}}
      filteredFolders={[]}
      selectGroup={() => {}}
    />,
  );
}

describe("sidebar save status", () => {
  it("announces that a link is still saving", () => {
    renderSaving(false);
    expect(screen.getByRole("status")).toHaveTextContent("Saving…");
  });

  it("announces when the link has been added", () => {
    renderSaving(true);
    expect(screen.getByRole("status")).toHaveTextContent("Link added!");
  });
});
