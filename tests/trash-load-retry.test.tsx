// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import TrashPage from "@/app/trash/page";
import { SESSION_EXPIRED_MESSAGE, UNREACHABLE_MESSAGE } from "@/lib/load-error";

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

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Trash load errors", () => {
  it("says when the session died, and when the connection died", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Unauthorized" }),
      })
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      });
    vi.stubGlobal("fetch", fetchMock);

    const first = render(<TrashPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent(SESSION_EXPIRED_MESSAGE);
    expect(screen.getByText("Sign in, then open Trash again.")).toBeInTheDocument();
    first.unmount();

    const second = render(<TrashPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent(UNREACHABLE_MESSAGE);
    expect(screen.getByText("Check your connection, then try again.")).toBeInTheDocument();
    second.unmount();

    render(<TrashPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Couldn't load Trash. Try again.",
    );
  });

  it("offers Retry and loads the list after a failed fetch", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Failed to load trash" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [] }),
      });
    vi.stubGlobal("fetch", fetchMock);

    render(<TrashPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Couldn't load Trash. Try again.",
    );
    expect(screen.getByText("Try again in a moment.")).toBeInTheDocument();
    expect(screen.queryByText("Check your connection, then try again.")).not.toBeInTheDocument();
    expect(screen.queryByText("Trash is empty")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByText("Trash is empty")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("keeps the list when restore fails and does not reload it", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [
            {
              type: "link",
              id: "link-1",
              url: "https://example.com/pricing",
              title: "Pricing",
              displayTitle: "Pricing",
              imageUrl: "/placeholder-unicorn.jpg",
              faviconUrl: "/placeholder-unicorn.jpg",
              groupId: "group-1",
              groupName: "Reading",
              deletedAt: new Date().toISOString(),
              daysLeft: 12,
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Could not restore that link" }),
      });
    vi.stubGlobal("fetch", fetchMock);

    render(<TrashPage />);

    expect(await screen.findByText("Pricing")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Restore" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not restore that link",
    );
    expect(screen.getByText("Nothing changed.")).toBeInTheDocument();
    expect(screen.getByText("Pricing")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByText("Pricing")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("explains a dead session and a connection failure", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [
            {
              type: "link",
              id: "link-1",
              url: "https://example.com/pricing",
              title: "Pricing",
              displayTitle: "Pricing",
              imageUrl: "/placeholder-unicorn.jpg",
              faviconUrl: "/placeholder-unicorn.jpg",
              groupId: "group-1",
              groupName: "Reading",
              deletedAt: new Date().toISOString(),
              daysLeft: 12,
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Unauthorized" }),
      })
      .mockRejectedValueOnce(new TypeError("Failed to fetch"));
    vi.stubGlobal("fetch", fetchMock);

    render(<TrashPage />);
    expect(await screen.findByText("Pricing")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Restore" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Your session expired. Sign in again.",
    );

    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    fireEvent.click(screen.getByRole("button", { name: "Restore" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Couldn't reach memory404. Check your connection and try again.",
    );
    expect(screen.getByText("Pricing")).toBeInTheDocument();
  });

  it("ignores a second restore while the first is still running", async () => {
    let resolveRestore: (value: { ok: boolean; json: () => Promise<unknown> }) => void =
      () => {};
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [
            {
              type: "link",
              id: "link-1",
              url: "https://example.com/pricing",
              title: "Pricing",
              displayTitle: "Pricing",
              imageUrl: "/placeholder-unicorn.jpg",
              faviconUrl: "/placeholder-unicorn.jpg",
              groupId: "group-1",
              groupName: "Reading",
              deletedAt: new Date().toISOString(),
              daysLeft: 12,
            },
          ],
        }),
      })
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveRestore = resolve;
          }),
      );
    vi.stubGlobal("fetch", fetchMock);

    render(<TrashPage />);
    expect(await screen.findByText("Pricing")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Restore" }));
    fireEvent.click(screen.getByRole("button", { name: "Restore" }));
    expect(fetchMock).toHaveBeenCalledTimes(2);

    resolveRestore({ ok: true, json: async () => ({}) });
    await waitFor(() => {
      expect(screen.queryByText("Pricing")).not.toBeInTheDocument();
    });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
