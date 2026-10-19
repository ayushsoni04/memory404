// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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

const profile = {
  ok: true,
  json: async () => ({
    user: {
      id: "user-1",
      email: "ada@example.com",
      name: "Ada Lovelace",
      username: "ada",
      avatarUrl: null,
      bannerStyle: "midnight",
    },
  }),
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function stubMedia() {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: () => ({
      matches: false,
      media: "",
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
  });
}

async function openDelete() {
  fireEvent.click(await screen.findByRole("button", { name: "Delete account & data" }));
  const dialog = screen.getByRole("dialog", { name: "Delete account" });
  fireEvent.change(within(dialog).getByRole("textbox"), { target: { value: "deactivate" } });
}

describe("delete account once", () => {
  it("ignores a second Delete account until the first request finishes", async () => {
    stubMedia();
    let release: (value: unknown) => void = () => {};
    const fetchMock = vi.fn((url: string, init?: { method?: string }) => {
      if (init?.method === "DELETE") {
        return new Promise((resolve) => {
          release = resolve;
        });
      }
      return Promise.resolve(profile);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<SettingsClient isOwner={false} />);
    await openDelete();

    const submit = screen.getByRole("button", { name: "Delete account" });
    fireEvent.click(submit);
    fireEvent.click(submit);

    await waitFor(() => {
      expect(fetchMock.mock.calls.filter((call) => call[1]?.method === "DELETE")).toHaveLength(1);
    });
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-busy", "true");

    release({ ok: true, json: async () => ({ ok: true }) });
    expect(await screen.findByText(/Account deleted/)).toBeInTheDocument();
    expect(fetchMock.mock.calls.filter((call) => call[1]?.method === "DELETE")).toHaveLength(1);
  });

  it("lets you try again after the first delete fails", async () => {
    stubMedia();
    const fetchMock = vi.fn((url: string, init?: { method?: string }) => {
      if (init?.method === "DELETE") {
        return Promise.resolve({
          ok: false,
          json: async () => ({ error: "Failed to delete account" }),
        });
      }
      return Promise.resolve(profile);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<SettingsClient isOwner={false} />);
    await openDelete();

    fireEvent.click(screen.getByRole("button", { name: "Delete account" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Failed to delete account");

    fireEvent.click(screen.getByRole("button", { name: "Delete account" }));
    await waitFor(() => {
      expect(fetchMock.mock.calls.filter((call) => call[1]?.method === "DELETE")).toHaveLength(2);
    });
  });
});
