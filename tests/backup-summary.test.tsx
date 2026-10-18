// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import type { ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProfileTab } from "@/app/settings/_components/ProfileTab";
import { LIBRARY_BACKUP_SUMMARY } from "@/lib/library-backup";

vi.mock("next/image", () => ({
  default: () => null,
}));

vi.mock("@/components/MorphText", () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

afterEach(() => {
  cleanup();
});

describe("library backup copy", () => {
  it("tells you Trash is left out of the download", () => {
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
        onSaveProfile={() => {}}
        onOpenDeactivateModal={() => {}}
      />,
    );

    expect(screen.getByText(LIBRARY_BACKUP_SUMMARY)).toBeInTheDocument();
  });
});
