// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import type { ReactNode } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import LinkCard from "@/components/LinkCard";
import LinkDetailOverlay from "@/components/LinkDetailOverlay";
import PastePrompt from "@/components/vault/PastePrompt";
import type { LinkApiRow } from "@/lib/links";

vi.mock("framer-motion", () => ({
  useReducedMotion: () => true,
  useInView: () => false,
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

vi.mock("gsap", () => {
  const tween = { kill: vi.fn() };
  const timeline = () => {
    const tl = {
      to: vi.fn(() => tl),
      kill: vi.fn(),
    };
    return tl;
  };
  return {
    default: {
      set: vi.fn(),
      to: vi.fn(() => tween),
      fromTo: vi.fn(() => tween),
      timeline,
    },
  };
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function sampleLink(overrides: Partial<LinkApiRow> = {}): LinkApiRow {
  return {
    id: "link-1",
    url: "https://example.com/article",
    title: "A saved article",
    customTitle: null,
    displayTitle: "A saved article",
    description: "A short description.",
    imageUrl: "",
    faviconUrl: "",
    tags: ["reading"],
    notes: "Remember the pricing section.",
    groupId: "general",
    metadataStatus: "ready",
    createdAt: "2026-10-01T12:00:00.000Z",
    deletedAt: null,
    ...overrides,
  };
}

describe("saved notes stay visible", () => {
  it("shows a note under the card title, inside the card gap", () => {
    const { container } = render(
      <LinkCard link={sampleLink()} onOpen={() => {}} />,
    );
    const card = container.querySelector(".mind-card");
    const note = screen.getByText("Remember the pricing section.");
    expect(card).toContainElement(note);
    expect(card).toContainElement(screen.getByText("A saved article"));
    expect(card?.className).not.toMatch(/\bmb-3\b/);
  });

  it("omits the note line when a link has none", () => {
    render(
      <LinkCard link={sampleLink({ notes: null })} onOpen={() => {}} />,
    );
    expect(screen.queryByText("Remember the pricing section.")).not.toBeInTheDocument();
  });

  it("keeps the paste note form open until the user finishes", async () => {
    vi.useFakeTimers();
    const onSaved = vi.fn();
    const saveLink = vi.fn().mockResolvedValue({ ok: true, link: sampleLink({ notes: null }) });
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

    fireEvent.change(screen.getByPlaceholderText("Paste a link to save"), {
      target: { value: "https://example.com/article" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add link" }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    expect(screen.getByText("Add a note")).toBeInTheDocument();
    expect(screen.queryByText(/closes in/i)).not.toBeInTheDocument();
    expect(onSaved).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(8000);
    });

    expect(screen.getByText("Add a note")).toBeInTheDocument();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("saves an edited note from the detail overlay", async () => {
    const link = sampleLink();
    const onNotesSaved = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ link: { ...link, notes: "Updated note" } }),
      }),
    );
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query.includes("reduce"),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }));

    const { rerender } = render(
      <LinkDetailOverlay
        link={link}
        groupName="All"
        groups={[{ id: "general", name: "All" }]}
        originRect={null}
        onClose={() => {}}
        onPrev={() => {}}
        onNext={() => {}}
        onDelete={() => {}}
        onMove={() => {}}
        hasPrev={false}
        hasNext={false}
        onNotesSaved={onNotesSaved}
      />,
    );

    const note = screen.getByLabelText("Note");
    expect(note).toHaveValue("Remember the pricing section.");
    fireEvent.change(note, { target: { value: "Updated note" } });
    fireEvent.click(screen.getByRole("button", { name: "Save note" }));

    await waitFor(() => {
      expect(onNotesSaved).toHaveBeenCalledWith(
        expect.objectContaining({ id: "link-1", notes: "Updated note" }),
      );
    });

    rerender(
      <LinkDetailOverlay
        link={sampleLink({ id: "link-2", notes: "Second link note" })}
        groupName="All"
        groups={[{ id: "general", name: "All" }]}
        originRect={null}
        onClose={() => {}}
        onPrev={() => {}}
        onNext={() => {}}
        onDelete={() => {}}
        onMove={() => {}}
        hasPrev={false}
        hasNext={false}
        onNotesSaved={onNotesSaved}
      />,
    );

    expect(screen.getByLabelText("Note")).toHaveValue("Second link note");
  });
});
