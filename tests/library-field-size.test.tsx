// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import type { ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import PastePrompt from "@/components/vault/PastePrompt";
import VaultSidebar from "@/components/vault/VaultSidebar";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

vi.mock("next/image", () => ({
  default: () => null,
}));

vi.mock("framer-motion", () => ({
  useReducedMotion: () => true,
  motion: {
    g: ({ children }: { children?: ReactNode }) => <g>{children}</g>,
    path: (props: Record<string, unknown>) => <path {...props} />,
  },
}));

vi.mock("thinking-orbs", () => ({
  ThinkingOrb: () => null,
}));

vi.mock("@/components/MorphText", () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/ExtensionInstallCard", () => ({
  ExtensionInstallCard: () => null,
}));

vi.mock("@/components/vault/SidebarDitherBackground", () => ({
  default: () => null,
}));

vi.mock("@/components/GlitchText", () => ({
  default: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function expectPhoneField(element: HTMLElement) {
  expect(element.className).toContain("text-base");
  expect(element.className).toContain("sm:text-sm");
}

describe("library field size", () => {
  it("keeps the paste link at 16px on a phone", () => {
    render(
      <PastePrompt
        variant="empty"
        emptyMode="library"
        groupId="general"
        saveLink={async () => ({ ok: false, error: "unused" })}
        onSaved={() => {}}
      />,
    );

    expectPhoneField(screen.getByRole("textbox", { name: "Link" }));
  });

  it("keeps the sidebar note and new group name at 16px on a phone", () => {
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
        json: async () => ({ user: { name: "Ada", username: "ada", avatarUrl: null } }),
      }),
    );

    const { rerender } = render(
      <VaultSidebar
        gridSize="default"
        setGridSizeAndPersist={() => {}}
        sidebarShowNotesForm
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
        groupSearch=""
        setGroupSearch={() => {}}
        filteredFolders={[]}
        selectGroup={() => {}}
      />,
    );

    expectPhoneField(screen.getByRole("textbox", { name: "Add a note" }));

    rerender(
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
        urlInput="https://example.com"
        handleSubmit={(event) => event.preventDefault()}
        groups={[]}
        creatingNewGroup
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

    expectPhoneField(screen.getByRole("textbox", { name: "Group name" }));
  });
});
