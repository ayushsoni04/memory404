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
    expect(screen.getByRole("status")).toHaveTextContent("Trash is empty");
    const library = screen.getByRole("link", { name: "Return to your links" });
    expect(library).toHaveAttribute("href", "/");
    expect(library.className).toContain("min-h-11");
    expect(library.className).toContain("sm:min-h-8");
    expect(library.className).toContain("focus-visible:ring-2");
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
    fireEvent.click(screen.getByRole("button", { name: /^Restore / }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not restore that link",
    );
    expect(screen.getByText("Nothing changed.")).toBeInTheDocument();
    expect(screen.getByText("Pricing")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const dismiss = screen.getByRole("button", { name: "Dismiss" });
    expect(dismiss.className).toContain("min-h-11");
    expect(dismiss.className).toContain("focus-visible:ring-2");

    fireEvent.click(dismiss);
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

    fireEvent.click(screen.getByRole("button", { name: /^Restore / }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Your session expired. Sign in again.",
    );

    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    fireEvent.click(screen.getByRole("button", { name: /^Restore / }));
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
    fireEvent.click(screen.getByRole("button", { name: /^Restore / }));
    fireEvent.click(screen.getByRole("button", { name: /^Restore / }));
    expect(fetchMock).toHaveBeenCalledTimes(2);

    resolveRestore({ ok: true, json: async () => ({}) });
    await waitFor(() => {
      expect(screen.queryByText("Pricing")).not.toBeInTheDocument();
    });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("clears the previous failure when the next restore starts", async () => {
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
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Could not restore that link" }),
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

    fireEvent.click(screen.getByRole("button", { name: /^Restore / }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not restore that link",
    );
    expect(screen.getByText("Nothing changed.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^Restore / }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByText("Nothing changed.")).not.toBeInTheDocument();
    expect(screen.getByText("Pricing")).toBeInTheDocument();

    resolveRestore({ ok: true, json: async () => ({}) });
    await waitFor(() => {
      expect(screen.queryByText("Pricing")).not.toBeInTheDocument();
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("returns to Restore when a link cannot be restored", async () => {
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
    const restore = await screen.findByRole("button", { name: "Restore Pricing" });
    fireEvent.click(restore);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not restore that link",
    );
    await waitFor(() => expect(restore).toHaveFocus());
  });

  it("returns to Sign in when the session dies during restore", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [
            {
              type: "group",
              id: "group-1",
              name: "Reading",
              linksCount: 2,
              deletedAt: new Date().toISOString(),
              daysLeft: 4,
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Unauthorized" }),
      });
    vi.stubGlobal("fetch", fetchMock);

    render(<TrashPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Restore Reading" }));

    const signIn = await screen.findByRole("link", { name: "Sign in" });
    await waitFor(() => expect(signIn).toHaveFocus());
    expect(signIn).toHaveAttribute("href", "/login?redirect=%2Ftrash");
  });
});
