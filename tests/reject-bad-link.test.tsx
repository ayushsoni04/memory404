// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AddLinkCard from "@/components/AddLinkCard";
import PastePrompt from "@/components/vault/PastePrompt";
import { LINK_NOT_WEB, LINK_URL_HINT } from "@/lib/links";

vi.mock("framer-motion", () => ({
  useReducedMotion: () => true,
  motion: {
    g: ({ children }: { children?: ReactNode }) => <g>{children}</g>,
    path: (props: Record<string, unknown>) => <path {...props} />,
  },
}));

vi.mock("thinking-orbs", () => ({
  ThinkingOrb: () => <div>Saving</div>,
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

describe("saving a link that is not a web page", () => {
  it("explains the add-link card before the save starts", () => {
    const saveLink = vi.fn();
    render(
      <AddLinkCard groupId="reading" onSaved={() => {}} saveLink={saveLink} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Add link" }));
    const field = screen.getByRole("textbox", { name: "Link" });
    fireEvent.change(field, { target: { value: "see you tomorrow" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByRole("alert")).toHaveTextContent(LINK_URL_HINT);
    expect(field).toHaveFocus();
    expect(saveLink).not.toHaveBeenCalled();

    fireEvent.change(field, { target: { value: "javascript:alert(1)" } });
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent(LINK_NOT_WEB);
  });

  it("explains the empty library field before the save starts", () => {
    const saveLink = vi.fn();
    render(
      <PastePrompt
        variant="empty"
        emptyMode="library"
        groupId="general"
        saveLink={saveLink}
        onSaved={() => {}}
      />,
    );

    const field = screen.getByRole("textbox", { name: "Link" });
    fireEvent.change(field, { target: { value: "not a page" } });
    fireEvent.click(screen.getByRole("button", { name: "Add link" }));

    expect(screen.getByRole("alert")).toHaveTextContent(LINK_URL_HINT);
    expect(field).toHaveFocus();
    expect(saveLink).not.toHaveBeenCalled();

    fireEvent.change(field, { target: { value: "mailto:ada@example.com" } });
    expect(screen.getByRole("button", { name: "Add link" })).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent(LINK_NOT_WEB);
  });
});
