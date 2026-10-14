// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import PastePrompt from "@/components/vault/PastePrompt";

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
});

const saveLink = vi.fn();

describe("PastePrompt empty states", () => {
  it("teaches the first save when the library is empty", () => {
    render(
      <PastePrompt
        variant="empty"
        emptyMode="library"
        groupId="general"
        saveLink={saveLink}
        onSaved={() => {}}
      />,
    );
    expect(screen.getByText(/Save webpages/)).toBeInTheDocument();
    expect(screen.getByText(/Paste a URL/)).toBeInTheDocument();
    expect(screen.getByText("Download extension")).toBeInTheDocument();
  });

  it("names the group when other links already exist", () => {
    render(
      <PastePrompt
        variant="empty"
        emptyMode="group"
        groupName="References"
        groupId="group-1"
        saveLink={saveLink}
        onSaved={() => {}}
      />,
    );
    expect(screen.getByText("Nothing in References yet")).toBeInTheDocument();
    expect(screen.queryByText("Download extension")).not.toBeInTheDocument();
  });

  it("says the URL is already saved instead of asking for a note", async () => {
    const onSaved = vi.fn();
    saveLink.mockResolvedValueOnce({
      ok: false,
      error: "This URL is in Trash. Restore it to save it again.",
    });

    render(
      <PastePrompt
        variant="empty"
        emptyMode="group"
        groupName="References"
        groupId="group-1"
        saveLink={saveLink}
        onSaved={onSaved}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("Paste a URL to save"), {
      target: { value: "https://example.com/pricing" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add link" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/Trash/);
    expect(screen.queryByText("Link added!")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Notes")).not.toBeInTheDocument();
    expect(onSaved).not.toHaveBeenCalled();
    saveLink.mockReset();
  });

  it("keeps the typed note when saving it fails", async () => {
    const onSaved = vi.fn();
    saveLink.mockResolvedValue({
      ok: true,
      link: {
        id: "link-1",
        url: "https://example.com/pricing",
        title: "Pricing page",
        customTitle: null,
        displayTitle: "Pricing page",
        description: null,
        imageUrl: "",
        faviconUrl: "",
        tags: [],
        notes: null,
        groupId: "general",
        metadataStatus: "ready",
        createdAt: "2026-10-01T12:00:00.000Z",
        deletedAt: null,
      },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: "Could not save the note" }),
      }),
    );

    render(
      <PastePrompt
        variant="empty"
        emptyMode="group"
        groupName="References"
        groupId="group-1"
        saveLink={saveLink}
        onSaved={onSaved}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("Paste a URL to save"), {
      target: { value: "https://example.com/pricing" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add link" }));

    const notes = await screen.findByLabelText("Notes");
    fireEvent.change(notes, { target: { value: "Remember the pricing section." } });
    fireEvent.click(screen.getByRole("button", { name: "Save Notes" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not save the note");
    expect(screen.getByLabelText("Notes")).toHaveValue("Remember the pricing section.");
    expect(onSaved).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
    saveLink.mockReset();
  });
});
