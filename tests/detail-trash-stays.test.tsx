// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import LinkDetailOverlay from "@/components/LinkDetailOverlay";
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

function renderDetail({
  onDelete,
  onClose = vi.fn(),
  actionError = null,
}: {
  onDelete: (id: string) => void | Promise<boolean | void>;
  onClose?: () => void;
  actionError?: string | null;
}) {
  vi.stubGlobal("matchMedia", () => ({
    matches: true,
    media: "",
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }));
  render(
    <LinkDetailOverlay
      link={sample()}
      groupName="References"
      groups={[{ id: "references", name: "References" }]}
      originRect={null}
      onClose={onClose}
      onPrev={() => {}}
      onNext={() => {}}
      onDelete={onDelete}
      onMove={() => {}}
      hasPrev={false}
      hasNext={false}
      actionError={actionError}
    />,
  );
  return { onClose };
}

describe("Move to Trash from an open link", () => {
  it("stays open when the move fails", async () => {
    const onDelete = vi.fn(async () => false);
    const { onClose } = renderDetail({
      onDelete,
      actionError: "Couldn't move that link to Trash. Try again.",
    });

    fireEvent.click(screen.getByRole("button", { name: "Move to Trash" }));

    await waitFor(() => expect(onDelete).toHaveBeenCalledWith("link-1"));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Couldn't move that link to Trash. Try again.",
    );
    expect(screen.getByRole("button", { name: "Move to Trash" })).toBeEnabled();
  });

  it("closes after the move succeeds", async () => {
    const onDelete = vi.fn(async () => true);
    const { onClose } = renderDetail({ onDelete });

    fireEvent.click(screen.getByRole("button", { name: "Move to Trash" }));

    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(onDelete).toHaveBeenCalledOnce();
  });

  it("ignores a second click until the first move finishes", async () => {
    let release: (ok: boolean) => void = () => {};
    const onDelete = vi.fn(
      () =>
        new Promise<boolean>((resolve) => {
          release = resolve;
        }),
    );
    const { onClose } = renderDetail({ onDelete });

    const button = screen.getByRole("button", { name: "Move to Trash" });
    fireEvent.click(button);
    fireEvent.click(button);

    expect(onDelete).toHaveBeenCalledOnce();
    expect(onClose).not.toHaveBeenCalled();

    release(false);
    await waitFor(() => expect(screen.getByRole("button", { name: "Move to Trash" })).toBeEnabled());
    expect(onClose).not.toHaveBeenCalled();
  });
});
