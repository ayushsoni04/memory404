// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AddLinkCard from "@/components/AddLinkCard";
import PastePrompt from "@/components/vault/PastePrompt";
import VaultSidebar from "@/components/vault/VaultSidebar";
import type { LinkApiRow } from "@/lib/links";
import { saveLinkNote } from "@/lib/save-link-note";

vi.mock("@/lib/save-link-note", () => ({
  saveLinkNote: vi.fn(),
}));

vi.mock("thinking-orbs", () => ({
  ThinkingOrb: () => null,
}));

vi.mock("@/components/MorphText", () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("framer-motion", () => ({
  useReducedMotion: () => true,
  motion: {
    g: ({ children }: { children?: ReactNode }) => <g>{children}</g>,
    path: (props: Record<string, unknown>) => <path {...props} />,
  },
}));

vi.mock("@/components/ExtensionInstallCard", () => ({
  ExtensionInstallCard: () => null,
}));

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

vi.mock("@/components/vault/SidebarDitherBackground", () => ({
  default: () => null,
}));

vi.mock("@/components/GlitchText", () => ({
  default: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

function savedLink(): LinkApiRow {
  return {
    id: "link-1",
    url: "https://example.com",
    title: "Example",
    customTitle: null,
    displayTitle: "Example",
    description: null,
    imageUrl: "",
    faviconUrl: "",
    tags: [],
    notes: "Remember the pricing section.",
    groupId: "reading",
    metadataStatus: "ready",
    createdAt: "2026-10-01T12:00:00.000Z",
    deletedAt: null,
  };
}

function deferredNote() {
  let resolve: (value: Awaited<ReturnType<typeof saveLinkNote>>) => void = () => {};
  const promise = new Promise<Awaited<ReturnType<typeof saveLinkNote>>>((res) => {
    resolve = res;
  });
  vi.mocked(saveLinkNote).mockImplementation(() => promise);
  return {
    resolve: () => resolve({ ok: true, link: savedLink() }),
  };
}

async function openAddLinkNote() {
  fireEvent.click(screen.getByRole("button", { name: "Add link" }));
  fireEvent.change(screen.getByRole("textbox", { name: "Link" }), {
    target: { value: "https://example.com" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  return screen.findByRole("textbox", { name: "Add a note" }, { timeout: 1500 });
}

describe("saving a note once", () => {
  it("saves the add-link note once and shows Saving… until it finishes", async () => {
    const pending = deferredNote();
    const onSaved = vi.fn();
    render(
      <AddLinkCard
        groupId="reading"
        onSaved={onSaved}
        saveLink={async () => ({ ok: true, link: savedLink() })}
      />,
    );

    const note = await openAddLinkNote();
    fireEvent.change(note, { target: { value: "Remember the pricing section." } });
    const save = screen.getByRole("button", { name: "Save note" });
    fireEvent.click(save);
    fireEvent.click(screen.getByRole("button", { name: "Saving…" }));

    expect(saveLinkNote).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Saving…" })).toHaveAttribute("aria-busy", "true");

    pending.resolve();
    await waitFor(() => {
      expect(onSaved).toHaveBeenCalledOnce();
    });
    expect(screen.queryByRole("button", { name: "Saving…" })).not.toBeInTheDocument();
  });

  it("lets the add-link note be saved again after a failure", async () => {
    vi.mocked(saveLinkNote)
      .mockResolvedValueOnce({ ok: false, error: "Could not save the note" })
      .mockResolvedValueOnce({ ok: true, link: savedLink() });
    const onSaved = vi.fn();
    render(
      <AddLinkCard
        groupId="reading"
        onSaved={onSaved}
        saveLink={async () => ({ ok: true, link: savedLink() })}
      />,
    );

    const note = await openAddLinkNote();
    fireEvent.change(note, { target: { value: "Remember the pricing section." } });
    fireEvent.click(screen.getByRole("button", { name: "Save note" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not save the note");
    expect(screen.getByRole("button", { name: "Save note" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Save note" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
    expect(saveLinkNote).toHaveBeenCalledTimes(2);
  });

  it("saves the paste-prompt note once and shows Saving… until it finishes", async () => {
    const pending = deferredNote();
    const onSaved = vi.fn();
    render(
      <PastePrompt
        variant="empty"
        emptyMode="group"
        groupName="Reading"
        groupId="reading"
        onSaved={onSaved}
        saveLink={async () => ({ ok: true, link: savedLink() })}
      />,
    );

    fireEvent.change(screen.getByRole("textbox", { name: "Link" }), {
      target: { value: "https://example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add link" }));
    const note = await screen.findByRole("textbox", { name: "Add a note" }, { timeout: 1500 });
    fireEvent.change(note, { target: { value: "Remember the pricing section." } });
    fireEvent.click(screen.getByRole("button", { name: "Save note" }));
    fireEvent.click(screen.getByRole("button", { name: "Saving…" }));

    expect(saveLinkNote).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();

    pending.resolve();
    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
  });

  it("saves the sidebar note once and shows Saving… until it finishes", async () => {
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

    let release: () => void = () => {};
    const finish = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    render(
      <VaultSidebar
        gridSize="default"
        setGridSizeAndPersist={() => {}}
        sidebarShowNotesForm
        sidebarNotesText="Remember the pricing section."
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

    fireEvent.click(screen.getByRole("button", { name: "Save note" }));
    fireEvent.click(screen.getByRole("button", { name: "Saving…" }));
    expect(finish).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();

    release();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Save note" })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole("button", { name: "Save note" }));
    await waitFor(() => expect(finish).toHaveBeenCalledTimes(2));
  });
});
