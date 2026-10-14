// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
  vi.unstubAllGlobals();
});

function renderProfile() {
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
      onSaveProfile={(event) => event.preventDefault()}
      currentPlan="free"
      onOpenDeactivateModal={() => {}}
    />,
  );
}

describe("library export", () => {
  it("says when the backup cannot be downloaded and keeps the button", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Failed to fetch links" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ links: [{ id: "link-1", url: "https://example.com" }], hasMore: false }),
      });
    vi.stubGlobal("fetch", fetchMock);

    renderProfile();

    fireEvent.click(screen.getByRole("button", { name: "Export backup JSON" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not export your links. Try again.",
    );
    expect(screen.getByRole("button", { name: "Export backup JSON" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Export backup JSON" }));

    await waitFor(() => {
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
