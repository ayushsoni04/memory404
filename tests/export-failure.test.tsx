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
    expect(screen.getByRole("button", { name: "Export backup JSON" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Export backup JSON" }));

    await waitFor(() => {
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
    const urls = fetchMock.mock.calls.map(([input]) => requestUrl(input));
    expect(urls.filter((url) => url.includes("/api/me"))).toHaveLength(1);
    expect(urls.filter((url) => url.includes("/api/links"))).toHaveLength(2);
  });
});
