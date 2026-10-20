// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import PastePrompt from "@/components/vault/PastePrompt";
import type { LinkApiRow } from "@/lib/links";

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
  ExtensionInstallCard: () => <p>Download extension</p>,
}));

afterEach(() => {
  cleanup();
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
    notes: null,
    groupId: "general",
    metadataStatus: "ready",
    createdAt: "2026-10-01T12:00:00.000Z",
    deletedAt: null,
  };
}

function renderPrompt(
  saveLink: () => Promise<{ ok: true; link: LinkApiRow } | { ok: false; error: string }>,
) {
  render(
    <PastePrompt
      variant="empty"
      emptyMode="library"
      groupId="general"
      saveLink={saveLink}
      onSaved={() => {}}
    />,
  );
}

async function saveExample() {
  fireEvent.change(screen.getByRole("textbox", { name: "Link" }), {
    target: { value: "https://example.com" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Add link" }));
  return screen.findByRole("textbox", { name: "Add a note" });
}

describe("paste note focus", () => {
  it("moves focus to the note after the link is saved", async () => {
    renderPrompt(async () => ({ ok: true, link: savedLink() }));
    const note = await saveExample();
    await waitFor(() => expect(note).toHaveFocus());
  });

  it("returns to the note when saving it fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        json: async () => ({ error: "Could not save the note" }),
      })),
    );
    renderPrompt(async () => ({ ok: true, link: savedLink() }));
    const note = await saveExample();
    fireEvent.change(note, { target: { value: "Remember this" } });
    note.blur();
    fireEvent.click(screen.getByRole("button", { name: "Save note" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not save the note");
    await waitFor(() => expect(note).toHaveFocus());
  });
});
