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

function renderProfile(isSaving: boolean) {
  const setName = vi.fn();
  const setUsername = vi.fn();
  const setBannerStyle = vi.fn();
  const onAvatarChange = vi.fn();
  render(
    <ProfileTab
      name="Ada Lovelace"
      setName={setName}
      username="ada"
      setUsername={setUsername}
      email="ada@example.com"
      bannerStyle="aurora"
      setBannerStyle={setBannerStyle}
      avatarPreview={null}
      onAvatarChange={onAvatarChange}
      isSaved={false}
      isSaving={isSaving}
      profileReady
      onSaveProfile={(event: FormEvent) => event.preventDefault()}
      onOpenDeactivateModal={() => {}}
    />,
  );
  return { setName, setUsername, setBannerStyle, onAvatarChange };
}

describe("profile save lock", () => {
  it("keeps name, username, photo, and banner theme locked while a save is in flight", () => {
    const { setName, setUsername, setBannerStyle, onAvatarChange } = renderProfile(true);

    const name = screen.getByRole("textbox", { name: "Full Name" });
    const username = screen.getByRole("textbox", { name: "Username" });
    const photo = screen.getByLabelText("Change profile photo");
    const banners = screen.getAllByRole("radio");

    expect(name).toBeDisabled();
    expect(username).toBeDisabled();
    expect(photo).toBeDisabled();
    expect(banners).toHaveLength(4);
    for (const banner of banners) expect(banner).toBeDisabled();
    expect(screen.getByRole("switch", { name: /interface sounds/i })).toBeEnabled();

    fireEvent.change(name, { target: { value: "Grace Hopper" } });
    fireEvent.change(username, { target: { value: "grace" } });
    fireEvent.change(photo, {
      target: { files: [new File(["x"], "ada.png", { type: "image/png" })] },
    });
    fireEvent.click(screen.getByRole("radio", { name: "Midnight Onyx" }));
    fireEvent.keyDown(screen.getByRole("radio", { name: "Aurora Teal" }), {
      key: "ArrowRight",
    });

    expect(setName).not.toHaveBeenCalled();
    expect(setUsername).not.toHaveBeenCalled();
    expect(onAvatarChange).not.toHaveBeenCalled();
    expect(setBannerStyle).not.toHaveBeenCalled();
  });

  it("unlocks those fields once the save finishes", () => {
    renderProfile(false);
    expect(screen.getByRole("textbox", { name: "Full Name" })).toBeEnabled();
    expect(screen.getByRole("textbox", { name: "Username" })).toBeEnabled();
    expect(screen.getByLabelText("Change profile photo")).toBeEnabled();
    for (const banner of screen.getAllByRole("radio")) expect(banner).toBeEnabled();
  });
});
