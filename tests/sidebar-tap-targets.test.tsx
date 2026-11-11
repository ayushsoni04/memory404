// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import type { ComponentProps, ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import VaultSidebar from "@/components/vault/VaultSidebar";

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

vi.mock("thinking-orbs", () => ({
  ThinkingOrb: () => null,
}));

vi.mock("@/components/vault/SidebarDitherBackground", () => ({
  default: () => null,
}));

vi.mock("@/components/GlitchText", () => ({
  default: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/components/MorphText", () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function renderSidebar(
  overrides: Partial<ComponentProps<typeof VaultSidebar>> = {},
) {
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
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ user: { name: "Ada", username: "ada", avatarUrl: null } }),
    }),
  );

  render(
    <VaultSidebar
      gridSize="default"
      setGridSizeAndPersist={() => {}}
      sidebarShowNotesForm={false}
      sidebarNotesText=""
      setSidebarNotesText={() => {}}
      finishSidebarNotesFlow={() => {}}
      saving={false}
      saveSuccess={false}
      savePhase="paste"
      setSavePhase={() => {}}
      urlInput="https://example.com"
      handleSubmit={(event) => event.preventDefault()}
      groups={[]}
      creatingNewGroup={false}
      setCreatingNewGroup={() => {}}
      placeGroupId={null}
      setPlaceGroupId={() => {}}
      newGroupNameDraft=""
      setNewGroupNameDraft={() => {}}
      saveError={null}
      setSaveError={() => {}}
      savedFlash={false}
      groupsError={null}
      loadGroups={async () => undefined}
      onDeleteLink={() => {}}
      onDeleteGroup={() => {}}
      groupSearch=""
      setGroupSearch={() => {}}
      filteredFolders={[]}
      selectGroup={() => {}}
      {...overrides}
    />,
  );
}

function expectPhoneHeight(element: HTMLElement, desktop: string) {
  expect(element.className).toContain("h-11");
  expect(element.className).toContain(desktop);
}

describe("sidebar tap targets", () => {
  it("keeps Download and Retry at 44px on a phone", () => {
    renderSidebar({ groupsError: "Could not load groups" });

    expectPhoneHeight(screen.getByRole("link", { name: /download extension/i }), "sm:h-8");
    const retry = screen.getByRole("button", { name: "Retry" });
    expect(retry.className).toContain("min-h-11");
    expect(retry.className).toContain("sm:min-h-8");
  });

  it("keeps the note action, Back, and Save at 44px on a phone", () => {
    renderSidebar({ sidebarShowNotesForm: true });
    expectPhoneHeight(screen.getByRole("button", { name: "Done" }), "sm:h-8");
    cleanup();

    renderSidebar({ savePhase: "place" });
    expectPhoneHeight(screen.getByRole("button", { name: "Back" }), "sm:h-[38px]");
    expectPhoneHeight(screen.getByRole("button", { name: "Save" }), "sm:h-[38px]");
  });
});
