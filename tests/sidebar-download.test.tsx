// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import type { ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import VaultSidebar from "@/components/vault/VaultSidebar";
import {
  EXTENSION_VERSION,
  EXTENSION_ZIP_FILENAME,
  EXTENSION_ZIP_HREF,
} from "@/lib/extension-download";

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

describe("library sidebar", () => {
  it("offers the extension download and no Shortcuts button", () => {
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
        json: async () => ({
          user: { name: "Ada", username: "ada", avatarUrl: null },
        }),
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
        urlInput=""
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
      />,
    );

    const download = screen.getByRole("link", { name: /download extension/i });
    expect(download).toHaveAttribute("href", EXTENSION_ZIP_HREF);
    expect(download).toHaveAttribute("download", EXTENSION_ZIP_FILENAME);
    expect(download).toHaveTextContent(EXTENSION_VERSION);
    expect(download.className).not.toMatch(/(?:^|\s)hidden(?:\s|$)/);
    expect(download.className).not.toMatch(/lg:hidden/);
    expect(screen.queryByRole("button", { name: /shortcuts/i })).not.toBeInTheDocument();
    expect(screen.queryByText("Plan & billing")).not.toBeInTheDocument();
  });
});
