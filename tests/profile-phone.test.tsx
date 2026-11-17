// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import type { FormEvent, ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
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

function expectPhoneField(element: HTMLElement) {
  expect(element.className).toContain("text-base");
  expect(element.className).toContain("sm:text-sm");
}

describe("profile on a phone", () => {
  it("keeps the fields at 16px and the actions at 44px", () => {
    render(
      <ProfileTab
        name="Ada Lovelace"
        setName={() => {}}
        username="ada"
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

    expectPhoneField(screen.getByRole("textbox", { name: "Full Name" }));
    expectPhoneField(screen.getByRole("textbox", { name: "Username" }));
    expectPhoneField(screen.getByRole("textbox", { name: "Email address" }));

    const save = screen.getByRole("button", { name: "Save profile changes" });
    expect(save.className).toContain("h-11");
    expect(save.className).toContain("sm:h-9");

    for (const name of ["Export backup JSON", "Delete account & data"]) {
      const button = screen.getByRole("button", { name });
      expect(button.className).toContain("h-11");
      expect(button.className).toContain("sm:h-8");
    }
  });
});
