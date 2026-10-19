// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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

function loadedProfile() {
  return {
    ok: true,
    json: async () => ({ user: profile }),
  };
}

describe("a username that is already taken", () => {
  it("ties the message to the username field and focuses it", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(loadedProfile())
        .mockResolvedValueOnce({
          ok: false,
          status: 409,
          json: async () => ({ error: "That username is already taken" }),
        }),
    );
    installMatchMedia();

    render(<SettingsClient isOwner={false} />);
    expect(await screen.findByDisplayValue("ada")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save profile changes" }));

    const username = screen.getByLabelText("Username");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "That username is already taken",
    );
    expect(username).toHaveFocus();
    expect(username).toHaveAttribute("aria-invalid", "true");
    expect(username).toHaveAttribute("aria-describedby", "profile-save-error");

    fireEvent.change(username, { target: { value: "ada_lovelace" } });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(username).not.toHaveAttribute("aria-invalid");
  });

  it("leaves the username field alone when the session has expired", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(loadedProfile())
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: async () => ({ error: "Unauthorized" }),
        }),
    );
    installMatchMedia();

    render(<SettingsClient isOwner={false} />);
    expect(await screen.findByDisplayValue("ada")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save profile changes" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Your session expired. Sign in again.",
    );
    const username = screen.getByLabelText("Username");
    expect(username).not.toHaveAttribute("aria-invalid");
    expect(username).not.toHaveAttribute("aria-describedby");
    expect(screen.getByRole("link", { name: "Sign in" })).toBeInTheDocument();
  });
});
