// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import type { FormEvent, ReactNode } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProfileTab } from "@/app/settings/_components/ProfileTab";

vi.mock("next/image", () => ({
  default: () => null,
}));

vi.mock("@/components/MorphText", () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

afterEach(() => {
  cleanup();
});

function profileProps(
  bannerStyle: string,
  setBannerStyle: (value: string) => void,
) {
  return {
    name: "Ada Lovelace",
    setName: () => {},
    username: "ada",
    setUsername: () => {},
    email: "ada@example.com",
    bannerStyle,
    setBannerStyle,
    avatarPreview: null,
    onAvatarChange: () => {},
    isSaved: false,
    profileReady: true,
    onSaveProfile: (event: FormEvent) => event.preventDefault(),
    onOpenDeactivateModal: () => {},
  };
}

function renderProfile(bannerStyle = "midnight", setBannerStyle = vi.fn()) {
  const view = render(<ProfileTab {...profileProps(bannerStyle, setBannerStyle)} />);
  return { setBannerStyle, ...view };
}

describe("profile focus", () => {
  it("gives the name field and photo a visible keyboard target", () => {
    renderProfile();
    const name = screen.getByRole("textbox", { name: "Full Name" });
    expect(name.className).toContain("focus-visible:ring-2");
    expect(name.className).not.toContain("focus:ring-foreground/5");
    const photo = screen.getByLabelText("Change profile photo");
    expect(photo.className).not.toContain("hidden");
    expect(photo.closest("label")?.className).toContain("focus-within:ring-2");
    expect(screen.getByRole("button", { name: "Save profile changes" }).className).toContain(
      "focus-visible:ring-2",
    );
    expect(screen.getByRole("switch", { name: /interface sounds/i }).className).toContain(
      "focus-visible:ring-2",
    );
  });

  it("moves the banner with the arrow keys and keeps one tab stop", () => {
    const setBannerStyle = vi.fn();
    const { rerender } = renderProfile("aurora", setBannerStyle);
    const midnight = screen.getByRole("radio", { name: "Midnight Onyx" });
    const aurora = screen.getByRole("radio", { name: "Aurora Teal" });
    const ocean = screen.getByRole("radio", { name: "Deep Ocean" });
    expect(aurora).toHaveAttribute("aria-checked", "true");
    expect(aurora).toHaveAttribute("tabindex", "0");
    expect(midnight).toHaveAttribute("tabindex", "-1");
    expect(ocean).toHaveAttribute("tabindex", "-1");
    expect(aurora.className).toContain("focus-visible:ring-2");

    fireEvent.keyDown(aurora, { key: "ArrowRight" });
    expect(setBannerStyle).toHaveBeenCalledWith("twilight");
    expect(screen.getByRole("radio", { name: "Twilight Violet" })).toHaveFocus();

    rerender(<ProfileTab {...profileProps("ocean", setBannerStyle)} />);
    fireEvent.keyDown(screen.getByRole("radio", { name: "Deep Ocean" }), {
      key: "ArrowRight",
    });
    expect(setBannerStyle).toHaveBeenCalledTimes(1);
  });
});
