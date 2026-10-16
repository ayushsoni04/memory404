// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import SidebarProfile from "@/components/vault/SidebarProfile";
import { AVATAR_FILE_MAX_BYTES } from "@/lib/profile";

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

function renderProfile() {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        user: { name: "Ada", username: "ada", avatarUrl: null },
      }),
    }),
  );
  render(<SidebarProfile />);
}

describe("sidebar profile photo", () => {
  it("explains a file the profile cannot store", async () => {
    renderProfile();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toHaveAttribute("accept", "image/png,image/jpeg,image/webp,image/gif");

    const notes = new File(["hello"], "notes.txt", { type: "text/plain" });
    fireEvent.change(input, { target: { files: [notes] } });

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Use a PNG, JPEG, WebP, or GIF.");
    expect(screen.getByRole("button", { name: "Add profile photo" })).toHaveAccessibleDescription(
      "Use a PNG, JPEG, WebP, or GIF.",
    );
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("explains a photo that is over the size limit", async () => {
    renderProfile();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const big = new File(
      [new Uint8Array(AVATAR_FILE_MAX_BYTES + 1)],
      "big.png",
      { type: "image/png" },
    );
    fireEvent.change(input, { target: { files: [big] } });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "That photo is too large. Choose one under 150KB.",
    );
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("shows the server error when a photo cannot be saved", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === "PATCH") {
        return {
          ok: false,
          json: async () => ({ error: "Avatar image is too large (max 200KB)" }),
        };
      }
      return {
        ok: true,
        json: async () => ({
          user: { name: "Ada", username: "ada", avatarUrl: null },
        }),
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<SidebarProfile />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const photo = new File(["png"], "ada.png", { type: "image/png" });
    fireEvent.change(input, { target: { files: [photo] } });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Avatar image is too large (max 200KB)",
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/me",
      expect.objectContaining({ method: "PATCH" }),
    );
  });
});
