// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import VaultSidebar from "@/components/vault/VaultSidebar";
import { NOTE_MAX, NOTE_TOO_LONG } from "@/lib/note-limit";

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

function renderNotes(notes: string, finish = vi.fn()) {
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
  render(
    <VaultSidebar
      gridSize="default"
      setGridSizeAndPersist={() => {}}
      sidebarShowNotesForm
      sidebarNotesText={notes}
      setSidebarNotesText={() => {}}
      finishSidebarNotesFlow={finish}
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
  return finish;
}

describe("sidebar note limit", () => {
  it("explains a note that is too long and does not save it", () => {
    const finish = renderNotes("x".repeat(NOTE_MAX + 1));
    const note = screen.getByLabelText("Notes");
    expect(note).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent(NOTE_TOO_LONG);
    expect(screen.getByText("2,001 of 2,000")).toBeInTheDocument();
    const save = screen.getByRole("button", { name: "Save Notes" });
    expect(save).toBeDisabled();
    fireEvent.click(save);
    expect(finish).not.toHaveBeenCalled();
  });

  it("shows how close a long note is and still lets it be saved", () => {
    const finish = renderNotes("x".repeat(1_600));
    expect(screen.getByText("1,600 of 2,000")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save Notes" }));
    expect(finish).toHaveBeenCalledOnce();
  });
});
