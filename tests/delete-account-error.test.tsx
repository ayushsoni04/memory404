// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
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

describe("delete account error", () => {
  it("clears a failed delete when the confirmation changes", async () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: () => ({
        matches: false,
        media: "",
        addEventListener: () => {},
        removeEventListener: () => {},
      }),
    });
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string, init?: { method?: string }) => {
        if (init?.method === "DELETE") {
          return Promise.resolve({
            ok: false,
            json: async () => ({ error: "Failed to delete account" }),
          });
        }
        return Promise.resolve({
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
        });
      }),
    );

    render(<SettingsClient isOwner={false} />);
    fireEvent.click(await screen.findByRole("button", { name: "Delete account & data" }));
    const dialog = screen.getByRole("dialog", { name: "Delete account" });
    const input = within(dialog).getByRole("textbox");
    fireEvent.change(input, { target: { value: "deactivate" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete account" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Failed to delete account");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", "deactivate-error");

    fireEvent.change(input, { target: { value: "deactivated" } });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(input).not.toHaveAttribute("aria-describedby");
  });
});
