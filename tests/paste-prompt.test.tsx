// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import type { ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import PastePrompt from "@/components/vault/PastePrompt";

vi.mock("framer-motion", () => ({
  useReducedMotion: () => true,
  motion: {
    g: ({ children }: { children?: ReactNode }) => <g>{children}</g>,
    path: (props: Record<string, unknown>) => <path {...props} />,
  },
}));

vi.mock("thinking-orbs", () => ({
  ThinkingOrb: () => null,
}));

vi.mock("@/components/MorphText", () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/ExtensionInstallCard", () => ({
  ExtensionInstallCard: () => <p>Download extension</p>,
}));

afterEach(() => {
  cleanup();
});

const saveLink = vi.fn();

describe("PastePrompt empty states", () => {
  it("teaches the first save when the library is empty", () => {
    render(
      <PastePrompt
        variant="empty"
        emptyMode="library"
        groupId="general"
        saveLink={saveLink}
        onSaved={() => {}}
      />,
    );
    expect(screen.getByText(/Save webpages/)).toBeInTheDocument();
    expect(screen.getByText(/Paste a URL/)).toBeInTheDocument();
    expect(screen.getByText("Download extension")).toBeInTheDocument();
  });

  it("names the group when other links already exist", () => {
    render(
      <PastePrompt
        variant="empty"
        emptyMode="group"
        groupName="References"
        groupId="group-1"
        saveLink={saveLink}
        onSaved={() => {}}
      />,
    );
    expect(screen.getByText("Nothing in References yet")).toBeInTheDocument();
    expect(screen.queryByText("Download extension")).not.toBeInTheDocument();
  });
});
