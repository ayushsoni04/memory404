// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import type { ChangeEvent, ReactNode } from "react";
import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProfileTab } from "@/app/settings/_components/ProfileTab";
import {
  AVATAR_FILE_MAX_BYTES,
  getAvatarFileIssues,
  getNameIssues,
} from "@/lib/profile";

vi.mock("next/image", () => ({
  default: () => null,
}));

vi.mock("@/components/MorphText", () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

afterEach(() => {
  cleanup();
});

function ProfileHarness({
  onSave = vi.fn(),
  onAvatarChange = vi.fn(),
}: {
  onSave?: () => void;
  onAvatarChange?: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  const [name, setName] = useState("Ada Lovelace");
  const [username, setUsername] = useState("ada");
  return (
    <ProfileTab
      name={name}
      setName={setName}
      username={username}
      setUsername={setUsername}
      email="ada@example.com"
      bannerStyle="midnight"
      setBannerStyle={() => {}}
      avatarPreview={null}
      onAvatarChange={onAvatarChange}
      isSaved={false}
      profileReady
      onSaveProfile={(event) => {
        event.preventDefault();
        onSave();
      }}
      onOpenDeactivateModal={() => {}}
    />
  );
}

describe("profile field checks", () => {
  it("describes a name and a photo the account cannot store", () => {
    expect(getNameIssues("a".repeat(81))).toEqual([
      "Name must be 80 characters or fewer",
    ]);
    expect(getNameIssues("Ada")).toEqual([]);
    expect(getNameIssues("Ada\nLovelace")).toEqual([
      "Names can't include line breaks.",
    ]);
    expect(
      getAvatarFileIssues({ name: "notes.txt", type: "text/plain", size: 12 }),
    ).toEqual(["Use a PNG, JPEG, WebP, or GIF."]);
    expect(
      getAvatarFileIssues({
        name: "big.png",
        type: "image/png",
        size: AVATAR_FILE_MAX_BYTES + 1,
      }),
    ).toEqual(["That photo is too large. Choose one under 150KB."]);
  });

  it("keeps an invalid username and an oversized photo from saving", () => {
    const onSave = vi.fn();
    const onAvatarChange = vi.fn();
    render(<ProfileHarness onSave={onSave} onAvatarChange={onAvatarChange} />);

    fireEvent.change(screen.getByPlaceholderText("your_handle"), {
      target: { value: "no spaces" },
    });
    expect(
      screen.getByText(/only letters, numbers, and underscores/),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save profile changes" })).toBeDisabled();
    fireEvent.submit(screen.getByRole("button", { name: "Save profile changes" }).closest("form")!);
    expect(onSave).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Change profile photo"), {
      target: {
        files: [
          new File([new Uint8Array(AVATAR_FILE_MAX_BYTES + 1)], "big.png", {
            type: "image/png",
          }),
        ],
      },
    });
    expect(
      screen.getByText("That photo is too large. Choose one under 150KB."),
    ).toBeInTheDocument();
    expect(onAvatarChange).not.toHaveBeenCalled();
  });

  it("explains a name that is too long before the request", () => {
    const onSave = vi.fn();
    render(<ProfileHarness onSave={onSave} />);
    fireEvent.change(screen.getByPlaceholderText("Your name"), {
      target: { value: "A".repeat(81) },
    });
    expect(
      screen.getByText("Name must be 80 characters or fewer"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save profile changes" })).toBeDisabled();
  });

  it("keeps a name with a line break from saving", () => {
    const onSave = vi.fn();
    render(
      <ProfileTab
        name={"Ada\nLovelace"}
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
        onSaveProfile={(event) => {
          event.preventDefault();
          onSave();
        }}
        onOpenDeactivateModal={() => {}}
      />,
    );
    expect(screen.getByText("Names can't include line breaks.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save profile changes" })).toBeDisabled();
    fireEvent.submit(
      screen.getByRole("button", { name: "Save profile changes" }).closest("form")!,
    );
    expect(onSave).not.toHaveBeenCalled();
  });
});
