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

function typeLink() {
  fireEvent.change(screen.getByRole("textbox", { name: "Link" }), {
    target: { value: "https://example.com" },
  });
}

describe("Paste prompt saves once", () => {
  it("ignores a second Add link until the first request finishes", async () => {
    let release: (value: { ok: true; link: LinkApiRow }) => void = () => {};
    const saveLink = vi.fn(
      () =>
        new Promise<{ ok: true; link: LinkApiRow }>((resolve) => {
          release = resolve;
        }),
    );
    render(
      <PastePrompt
        variant="empty"
        emptyMode="library"
        groupId="general"
        saveLink={saveLink}
        onSaved={() => {}}
      />,
    );
    typeLink();

    const add = screen.getByRole("button", { name: "Add link" });
    fireEvent.click(add);
    fireEvent.click(add);

    expect(saveLink).toHaveBeenCalledOnce();
    release({ ok: true, link: savedLink() });
    expect(await screen.findByRole("textbox", { name: "Add a note" })).toBeInTheDocument();
  });

  it("lets Add link run again after the first attempt fails", async () => {
    const saveLink = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, error: "Could not save that link" })
      .mockResolvedValueOnce({ ok: true, link: savedLink() });
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
    typeLink();

    fireEvent.click(screen.getByRole("button", { name: "Add link" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not save that link");

    fireEvent.click(screen.getByRole("button", { name: "Add link" }));
    await waitFor(() => expect(saveLink).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole("textbox", { name: "Add a note" })).toBeInTheDocument();
  });
});
