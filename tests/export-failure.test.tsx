// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import SettingsClient from "@/app/settings/SettingsClient";

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

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/components/MorphText", () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function installMatchMedia() {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

const profile = {
  id: "user-1",
  email: "ada@example.com",
  name: "Ada Lovelace",
  username: "ada",
  avatarUrl: null,
  bannerStyle: "midnight",
  plan: "free",
};

function requestUrl(input: RequestInfo | URL) {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

/** jsdom does not implement blob URLs. Capture the file the button would download. */
function installBlobDownload() {
  const blobs: Blob[] = [];
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    writable: true,
    value: (blob: Blob) => {
      blobs.push(blob);
      return "blob:backup";
    },
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    writable: true,
    value: () => {},
  });
  return blobs;
}

describe("library export", () => {
  it("says when the backup cannot be downloaded and keeps the button", async () => {
    let linkRequests = 0;
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = requestUrl(input);
      if (url.includes("/api/me")) {
        return {
          ok: true,
          json: async () => ({ user: profile }),
        };
      }
      linkRequests += 1;
      if (linkRequests === 1) {
        return {
          ok: false,
          json: async () => ({ error: "Failed to fetch links" }),
        };
      }
      return {
        ok: true,
        json: async () => ({
          links: [{ id: "link-1", url: "https://example.com" }],
          hasMore: false,
        }),
      };
    });
    vi.stubGlobal("fetch", fetchMock);
    installMatchMedia();

    render(<SettingsClient isOwner={false} />);

    const exportButton = await screen.findByRole("button", {
      name: "Export backup JSON",
    });
    fireEvent.click(exportButton);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not export your links. Try again.",
    );
    expect(screen.queryByText(/Downloaded memory404-backup/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export backup JSON" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Export backup JSON" }));

    await waitFor(() => {
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
    const urls = fetchMock.mock.calls.map(([input]) => requestUrl(input));
    expect(urls.filter((url) => url.includes("/api/me"))).toHaveLength(1);
    expect(urls.filter((url) => url.includes("/api/links"))).toHaveLength(2);
  });

  it("says the session expired instead of a raw unauthorized", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = requestUrl(input);
        if (url.includes("/api/me")) {
          return { ok: true, json: async () => ({ user: profile }) };
        }
        return { ok: false, status: 401, json: async () => ({ error: "Unauthorized" }) };
      }),
    );
    installMatchMedia();
    render(<SettingsClient isOwner={false} />);

    fireEvent.click(await screen.findByRole("button", { name: "Export backup JSON" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Your session expired. Sign in again.",
    );
    expect(screen.queryByText("Unauthorized")).not.toBeInTheDocument();
    expect(screen.queryByText(/Downloaded memory404-backup/)).not.toBeInTheDocument();
  });

  it("says when the backup cannot reach memory404", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = requestUrl(input);
        if (url.includes("/api/me")) {
          return { ok: true, json: async () => ({ user: profile }) };
        }
        throw new TypeError("Failed to fetch");
      }),
    );
    installMatchMedia();
    render(<SettingsClient isOwner={false} />);

    fireEvent.click(await screen.findByRole("button", { name: "Export backup JSON" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/Check your connection/);
  });

  it("names the backup file after it downloads", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = requestUrl(input);
        if (url.includes("/api/me")) {
          return { ok: true, json: async () => ({ user: profile }) };
        }
        return {
          ok: true,
          json: async () => ({
            links: [{ id: "link-1", url: "https://example.com" }],
            hasMore: false,
          }),
        };
      }),
    );
    installMatchMedia();
    installBlobDownload();
    render(<SettingsClient isOwner={false} />);

    fireEvent.click(
      await screen.findByRole("button", { name: "Export backup JSON" }),
    );

    expect(
      await screen.findByText(/^Downloaded memory404-backup-\d{4}-\d{2}-\d{2}\.json$/),
    ).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("downloads a file that includes the groups, not a data URL", async () => {
    const blobs = installBlobDownload();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = requestUrl(input);
        if (url.includes("/api/me")) {
          return { ok: true, json: async () => ({ user: profile }) };
        }
        if (url.includes("/api/groups")) {
          return {
            ok: true,
            json: async () => ({
              groups: [{ id: "reading", name: "Reading" }],
            }),
          };
        }
        return {
          ok: true,
          json: async () => ({
            links: [{ id: "link-1", url: "https://example.com", groupId: "reading" }],
            hasMore: false,
          }),
        };
      }),
    );
    installMatchMedia();
    render(<SettingsClient isOwner={false} />);

    fireEvent.click(
      await screen.findByRole("button", { name: "Export backup JSON" }),
    );

    expect(await screen.findByText(/Downloaded memory404-backup/)).toBeInTheDocument();
    expect(blobs).toHaveLength(1);
    const text = await blobs[0].text();
    expect(text).toContain('"name": "Reading"');
    expect(text).toContain('"id": "link-1"');
    expect(text).not.toContain("data:");
    expect(blobs[0].type).toBe("application/json");
  });

  it("explains when the library is too large for one backup", async () => {
    const click = vi.fn();
    const create = document.createElement.bind(document);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = requestUrl(input);
        if (url.includes("/api/me")) {
          return { ok: true, json: async () => ({ user: profile }) };
        }
        return {
          ok: true,
          json: async () => ({
            links: [{ id: "link-1" }],
            hasMore: true,
            nextCursor: "next",
          }),
        };
      }),
    );
    installMatchMedia();
    render(<SettingsClient isOwner={false} />);
    const createSpy = vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
      const element = create(tagName);
      if (tagName === "a") element.click = click;
      return element;
    });

    fireEvent.click(
      await screen.findByRole("button", { name: "Export backup JSON" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This library is too large to download in one backup.",
    );
    expect(screen.queryByText(/Downloaded memory404-backup/)).not.toBeInTheDocument();
    expect(click).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Export backup JSON" })).toBeEnabled();
    createSpy.mockRestore();
  });

  it("explains an empty library instead of downloading a blank file", async () => {
    const click = vi.fn();
    const create = document.createElement.bind(document);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = requestUrl(input);
        if (url.includes("/api/me")) {
          return { ok: true, json: async () => ({ user: profile }) };
        }
        return {
          ok: true,
          json: async () => ({ links: [], hasMore: false }),
        };
      }),
    );
    installMatchMedia();
    render(<SettingsClient isOwner={false} />);

    const exportButton = await screen.findByRole("button", {
      name: "Export backup JSON",
    });
    const createSpy = vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
      const element = create(tagName);
      if (tagName === "a") element.click = click;
      return element;
    });
    fireEvent.click(exportButton);

    expect(
      await screen.findByText("Nothing to download yet. Save a link first."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Downloaded memory404-backup/)).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(click).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Export backup JSON" })).toBeEnabled();
    createSpy.mockRestore();
  });
});
