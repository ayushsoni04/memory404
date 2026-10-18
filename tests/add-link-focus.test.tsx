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
    groupId: "reading",
    metadataStatus: "ready",
    createdAt: "2026-10-01T12:00:00.000Z",
    deletedAt: null,
  };
}

async function saveExample() {
  fireEvent.click(screen.getByRole("button", { name: "Add link" }));
  fireEvent.change(screen.getByRole("textbox", { name: "Link" }), {
    target: { value: "https://example.com" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  return screen.findByRole("textbox", { name: "Notes" }, { timeout: 1500 });
}

describe("AddLinkCard focus", () => {
  it("points the URL field at a failure and keeps a focus ring", async () => {
    render(
      <AddLinkCard
        groupId="reading"
        onSaved={() => {}}
        saveLink={async () => ({ ok: false, error: "Could not save that link" })}
      />,
    );

    const opener = screen.getByRole("button", { name: "Add link" });
    expect(opener.className).toContain("focus-visible:ring-2");
    fireEvent.click(opener);

    const url = screen.getByRole("textbox", { name: "Link" });
    expect(url.className).toContain("focus-visible:ring-2");
    expect(url.className).not.toContain("focus:border-foreground");
    fireEvent.change(url, { target: { value: "https://example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Could not save that link");
    expect(url).toHaveAttribute("aria-invalid", "true");
    expect(url).toHaveAttribute("aria-describedby", "add-link-url-error");
    expect(screen.getByRole("button", { name: "Cancel" }).className).toContain(
      "focus-visible:ring-2",
    );
    expect(screen.getByRole("button", { name: "Save" }).className).toContain(
      "focus-visible:ring-2",
    );
  });

  it("returns focus to Add link when the form is cancelled", () => {
    render(
      <AddLinkCard groupId="reading" onSaved={() => {}} saveLink={async () => ({ ok: true, link: savedLink() })} />,
    );

    const opener = screen.getByRole("button", { name: "Add link" });
    fireEvent.click(opener);
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Link" }), { key: "Escape" });
    expect(opener).toHaveFocus();

    fireEvent.click(opener);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(opener).toHaveFocus();
  });

  it("focuses the note, keeps typed text on Escape, and returns to Add link when the note is empty", async () => {
    const onSaved = vi.fn();
    render(
      <AddLinkCard
        groupId="reading"
        onSaved={onSaved}
        saveLink={async () => ({ ok: true, link: savedLink() })}
      />,
    );

    const notes = await saveExample();
    await waitFor(() => expect(notes).toHaveFocus());

    fireEvent.change(notes, { target: { value: "keep this" } });
    fireEvent.keyDown(notes, { key: "Escape" });
    expect(notes).toHaveValue("keep this");
    expect(onSaved).not.toHaveBeenCalled();

    fireEvent.change(notes, { target: { value: "   " } });
    fireEvent.keyDown(notes, { key: "Escape" });
    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
    expect(screen.getByRole("button", { name: "Add link" })).toHaveFocus();
  });

  it("leaves the note open when saving it fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        json: async () => ({}),
      })),
    );
    render(
      <AddLinkCard
        groupId="reading"
        onSaved={() => {}}
        saveLink={async () => ({ ok: true, link: savedLink() })}
      />,
    );

    const notes = await saveExample();
    fireEvent.change(notes, { target: { value: "remember" } });
    fireEvent.click(screen.getByRole("button", { name: "Save note" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't save the note. Try again.");
    expect(screen.getByRole("textbox", { name: "Notes" })).toHaveValue("remember");
    expect(screen.getByRole("button", { name: "Add link", hidden: true })).not.toHaveFocus();
  });
});
