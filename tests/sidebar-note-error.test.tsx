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
];

function NotesHarness({
  initialError = "Couldn't save the note. Try again.",
}: {
  initialError?: string | null;
}) {
  const [notes, setNotes] = useState("Remember the pricing section.");
  const [saveError, setSaveError] = useState<string | null>(initialError ?? null);
  return (
    <VaultSidebar
      gridSize="default"
      setGridSizeAndPersist={() => {}}
      sidebarShowNotesForm
      sidebarNotesText={notes}
      setSidebarNotesText={setNotes}
      finishSidebarNotesFlow={() => {}}
      saving={false}
      saveSuccess={false}
      savePhase="paste"
      setSavePhase={() => {}}
      urlInput="https://example.com/pricing"
      handleSubmit={(event) => event.preventDefault()}
      groups={groups}
      creatingNewGroup={false}
      setCreatingNewGroup={() => {}}
      placeGroupId={null}
      setPlaceGroupId={() => {}}
      newGroupNameDraft=""
      setNewGroupNameDraft={() => {}}
      saveError={saveError}
      setSaveError={setSaveError}
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

describe("sidebar note errors", () => {
  it("puts a failed note on the note field and clears it when the note changes", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          user: { name: "Ada", username: "ada", avatarUrl: null },
        }),
      }),
    );

    render(<NotesHarness />);

    const note = screen.getByRole("textbox", { name: "Add a note" });
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Couldn't save the note. Try again.");
    expect(note).toHaveAttribute("aria-invalid", "true");
    expect(note).toHaveAccessibleDescription("Couldn't save the note. Try again.");
    expect(note).toHaveFocus();

    fireEvent.change(note, { target: { value: "Remember the new price." } });

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(note).not.toHaveAttribute("aria-invalid", "true");
    expect(note).toHaveValue("Remember the new price.");
  });
});
