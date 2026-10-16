// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AddLinkCard from "@/components/AddLinkCard";
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
  ExtensionInstallCard: () => null,
}));

afterEach(() => {
  cleanup();
});

function expectBareHostField(field: HTMLElement) {
  expect(field).toHaveAttribute("type", "text");
  expect(field).toHaveAttribute("inputmode", "url");
  expect(field).not.toHaveAttribute("type", "url");
}

describe("save fields accept a host without https", () => {
  it("lets the add-link card submit example.com/page", () => {
    const saveLink = vi.fn(async () => ({ ok: false as const, error: "stopped" }));
    render(
      <AddLinkCard groupId="reading" onSaved={() => {}} saveLink={saveLink} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Add link" }));
    const field = screen.getByRole("textbox", { name: "Link URL" });
    expectBareHostField(field);
    expect(field).toHaveAttribute("placeholder", "example.com/page");

    fireEvent.change(field, { target: { value: "example.com/page" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(saveLink).toHaveBeenCalledWith("example.com/page", "reading");
  });

  it("lets the empty-library field submit a bare host", () => {
    const saveLink = vi.fn(async () => ({ ok: false as const, error: "stopped" }));
    render(
      <PastePrompt
        variant="empty"
        emptyMode="library"
        groupId="general"
        saveLink={saveLink}
        onSaved={() => {}}
      />,
    );

    const field = screen.getByRole("textbox", { name: "Link URL" });
    expectBareHostField(field);
    fireEvent.change(field, { target: { value: "linear.app/docs" } });
    fireEvent.click(screen.getByRole("button", { name: "Add link" }));

    expect(saveLink).toHaveBeenCalledWith("linear.app/docs", "general");
  });
});
