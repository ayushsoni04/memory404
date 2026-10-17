// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import VaultSidebar from "@/components/vault/VaultSidebar";
import { GROUP_NAME_MAX, GROUP_NAME_TAKEN } from "@/lib/group-name";
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

const reading: GroupRow = {
  id: "reading",
  name: "Reading",
  createdAt: "2026-10-01T00:00:00.000Z",
  linksCount: 2,
  previewTitles: [],
};

function PlaceSave({ groups = [] }: { groups?: GroupRow[] }) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: () => ({
      matches: false,
      media: "",
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
  });
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
      urlInput="https://example.com/docs"
      handleSubmit={(event) => event.preventDefault()}
      groups={groups}
      creatingNewGroup
      setCreatingNewGroup={() => {}}
      placeGroupId={null}
      setPlaceGroupId={() => {}}
      newGroupNameDraft={name}
      setNewGroupNameDraft={setName}
      saveError={error}
      setSaveError={setError}
      savedFlash={false}
      groupsError={null}
      loadGroups={async () => undefined}
      onDeleteLink={() => {}}
      onDeleteGroup={() => {}}
      groupSearch=""
      setGroupSearch={() => {}}
      filteredFolders={[]}
      selectGroup={() => {}}
    />
  );
}

describe("sidebar new group name", () => {
  it("says the name is too long before save, and keeps Save off", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          user: { name: "Ada", username: "ada", avatarUrl: null },
        }),
      }),
    );
    render(<PlaceSave />);
    const input = screen.getByRole("textbox", { name: "Group name" });
    fireEvent.change(input, { target: { value: "R".repeat(GROUP_NAME_MAX + 1) } });

    expect(screen.getByRole("alert")).toHaveTextContent(/60 characters or fewer/);
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();

    fireEvent.change(input, { target: { value: "Reading" } });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
  });

  it("says the name is already used before save, and keeps Save off", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          user: { name: "Ada", username: "ada", avatarUrl: null },
        }),
      }),
    );
    render(<PlaceSave groups={[reading]} />);
    const input = screen.getByRole("textbox", { name: "Group name" });
    fireEvent.change(input, { target: { value: "reading" } });

    expect(screen.getByRole("alert")).toHaveTextContent(GROUP_NAME_TAKEN);
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });
});
