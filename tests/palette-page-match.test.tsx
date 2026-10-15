// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import CommandPalette from "@/components/CommandPalette";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("@/components/MorphText", () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {};
});

beforeEach(() => {
  push.mockReset();
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ links: [] }),
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function renderPalette(isOwner = false) {
  const onOpenChange = vi.fn();
  render(
    <CommandPalette
      open
      onOpenChange={onOpenChange}
      groups={[]}
      onSelectGroup={() => {}}
      isOwner={isOwner}
    />,
  );
  return { onOpenChange };
}

describe("command palette pages", () => {
  it("lists Settings and Trash before a search", () => {
    renderPalette();
    expect(screen.getByText("Settings")).toBeInTheDocument();
    expect(screen.getByText("Trash")).toBeInTheDocument();
    expect(screen.queryByText("Workspace")).not.toBeInTheDocument();
  });

  it("drops pages that do not match, and says nothing matched", async () => {
    renderPalette(true);
    fireEvent.change(screen.getByPlaceholderText(/Search links/), {
      target: { value: "zzzz-not-a-page" },
    });
    expect(await screen.findByText(/No matches for/)).toBeInTheDocument();
    expect(screen.queryByText("Settings")).not.toBeInTheDocument();
    expect(screen.queryByText("Trash")).not.toBeInTheDocument();
    expect(screen.queryByText("Workspace")).not.toBeInTheDocument();
  });

  it("keeps Trash when the query is the page name", async () => {
    const { onOpenChange } = renderPalette(true);
    fireEvent.change(screen.getByPlaceholderText(/Search links/), {
      target: { value: "trash" },
    });
    const trash = await screen.findByText("Trash");
    await waitFor(() => {
      expect(screen.queryByText("Searching links…")).not.toBeInTheDocument();
    });
    expect(screen.queryByText("Settings")).not.toBeInTheDocument();
    expect(screen.queryByText(/No matches for/)).not.toBeInTheDocument();
    fireEvent.click(trash);
    expect(push).toHaveBeenCalledWith("/trash");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
