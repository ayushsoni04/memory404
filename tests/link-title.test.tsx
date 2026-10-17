// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import LinkTitleEditor from "@/components/vault/LinkTitleEditor";
import {
  LINK_TITLE_LINE_BREAK,
  LINK_TITLE_MAX,
  linkTitleIssue,
} from "@/lib/link-title";
import type { LinkApiRow } from "@/lib/links";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function sample(): LinkApiRow {
  return {
    id: "link-1",
    url: "https://example.com/article",
    title: "Pricing page",
    customTitle: null,
    displayTitle: "Pricing page",
    description: null,
    imageUrl: "",
    faviconUrl: "",
    tags: [],
    notes: null,
    groupId: "references",
    metadataStatus: "ready",
    createdAt: "2026-10-01T12:00:00.000Z",
    deletedAt: null,
  };
}

describe("linkTitleIssue", () => {
  it("allows a blank name and rejects one that is too long", () => {
    expect(linkTitleIssue("  ")).toBeNull();
    expect(linkTitleIssue("a".repeat(LINK_TITLE_MAX))).toBeNull();
    expect(linkTitleIssue("a".repeat(LINK_TITLE_MAX + 1))).toMatch(/200/);
  });

  it("rejects a name that would break across lines", () => {
    expect(linkTitleIssue("Launch\nnotes")).toBe(LINK_TITLE_LINE_BREAK);
    expect(linkTitleIssue("Launch\rnotes")).toBe(LINK_TITLE_LINE_BREAK);
    expect(linkTitleIssue("Launch notes")).toBeNull();
  });
});

describe("LinkTitleEditor", () => {
  it("renames the link and keeps the page title when the name is cleared", async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    const renamed = { ...sample(), customTitle: "Launch notes", displayTitle: "Launch notes" };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => ({
        ok: true,
        json: async () => ({
          link: JSON.parse(String(init?.body)).customTitle
            ? renamed
            : { ...sample(), displayTitle: "Pricing page" },
        }),
      })),
    );

    render(<LinkTitleEditor link={sample()} onSaved={onSaved} />);
    expect(screen.getByRole("heading", { name: "Pricing page" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Rename" }));
    const field = screen.getByLabelText("Name");
    await user.clear(field);
    await user.type(field, "Launch notes");
    await user.click(screen.getByRole("button", { name: "Save name" }));

    expect(onSaved).toHaveBeenCalledWith(renamed);
    expect(fetch).toHaveBeenCalledWith(
      "/api/links/link-1",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ customTitle: "Launch notes" }),
      }),
    );
  });

  it("does not save a name that is too long", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<LinkTitleEditor link={sample()} />);
    await user.click(screen.getByRole("button", { name: "Rename" }));
    const field = screen.getByLabelText("Name");
    await user.clear(field);
    await user.click(field);
    await user.paste("a".repeat(LINK_TITLE_MAX + 1));

    expect(screen.getByRole("button", { name: "Save name" })).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent("Names must be 200 characters or fewer.");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("leaves the name alone when Escape cancels", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<LinkTitleEditor link={sample()} />);
    await user.click(screen.getByRole("button", { name: "Rename" }));
    await user.type(screen.getByLabelText("Name"), " extra");
    await user.keyboard("{Escape}");

    expect(screen.getByRole("heading", { name: "Pricing page" })).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
