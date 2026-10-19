// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AddLinkCard from "@/components/AddLinkCard";
import type { LinkApiRow } from "@/lib/links";

vi.mock("thinking-orbs", () => ({
  ThinkingOrb: () => null,
}));

vi.mock("@/components/MorphText", () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
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
    groupId: "reading",
    metadataStatus: "ready",
    createdAt: "2026-10-01T12:00:00.000Z",
    deletedAt: null,
  };
}

function openForm() {
  fireEvent.click(screen.getByRole("button", { name: "Add link" }));
  fireEvent.change(screen.getByRole("textbox", { name: "Link" }), {
    target: { value: "https://example.com" },
  });
}

describe("Add link saves once", () => {
  it("ignores a second Save until the first request finishes", async () => {
    let release: (value: { ok: true; link: LinkApiRow }) => void = () => {};
    const saveLink = vi.fn(
      () =>
        new Promise<{ ok: true; link: LinkApiRow }>((resolve) => {
          release = resolve;
        }),
    );
    render(<AddLinkCard groupId="reading" onSaved={() => {}} saveLink={saveLink} />);
    openForm();

    const save = screen.getByRole("button", { name: "Save" });
    fireEvent.click(save);
    fireEvent.click(save);

    expect(saveLink).toHaveBeenCalledOnce();
    release({ ok: true, link: savedLink() });
    expect(await screen.findByRole("textbox", { name: "Add a note" })).toBeInTheDocument();
  });

  it("lets Save run again after the first attempt fails", async () => {
    const saveLink = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, error: "Could not save that link" })
      .mockResolvedValueOnce({ ok: true, link: savedLink() });
    render(<AddLinkCard groupId="reading" onSaved={() => {}} saveLink={saveLink} />);
    openForm();

    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not save that link");

    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(saveLink).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole("textbox", { name: "Add a note" })).toBeInTheDocument();
  });
});
