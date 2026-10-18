// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import type { FormEvent, ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProfileTab } from "@/app/settings/_components/ProfileTab";
import { profileInitials } from "@/lib/profile";

vi.mock("next/image", () => ({
  default: () => null,
}));

vi.mock("@/components/MorphText", () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

afterEach(() => {
  cleanup();
});

describe("profileInitials", () => {
  it("uses the first two words and falls back when the name is empty", () => {
    expect(profileInitials("Ada Lovelace")).toBe("AL");
    expect(profileInitials("  ada   lovelace  king ")).toBe("AL");
    expect(profileInitials("One Two Three Four")).toBe("OT");
    expect(profileInitials("")).toBe("M");
    expect(profileInitials("   ")).toBe("M");
  });
});

describe("profile header", () => {
  it("keeps a long name and username inside the card", () => {
    const name = "A".repeat(80);
    const username = "b".repeat(30);
    render(
      <ProfileTab
        name={name}
        setName={() => {}}
        username={username}
        setUsername={() => {}}
        email="ada@example.com"
        bannerStyle="midnight"
        setBannerStyle={() => {}}
        avatarPreview={null}
        onAvatarChange={() => {}}
        isSaved={false}
        profileReady
        onSaveProfile={(event: FormEvent) => event.preventDefault()}
        onOpenDeactivateModal={() => {}}
      />,
    );

    const heading = screen.getByRole("heading", { name });
    expect(heading.className).toContain("break-words");
    expect(heading).toHaveAttribute("title", name);
    expect(screen.getByText(profileInitials(name))).toBeInTheDocument();

    const handle = screen.getByText(`@${username}`);
    expect(handle.className).toContain("break-all");
    expect(handle).toHaveAttribute("title", `@${username}`);
  });
});
