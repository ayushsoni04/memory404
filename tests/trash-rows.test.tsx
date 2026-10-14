// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { TrashGroupItem, TrashLinkItem } from "@/app/api/trash/route";
import { TrashGroupRow, TrashLinkRow } from "@/app/trash/TrashRows";

vi.mock("next/image", () => ({
  default: (props: { alt: string }) => <span role="img" aria-label={props.alt} />,
}));

afterEach(() => {
  cleanup();
});

const link: TrashLinkItem = {
  type: "link",
  id: "link-1",
  url: "https://example.com/a-very-long-path-that-should-not-push-the-actions-off-screen",
  title: "A saved page with a very long title that used to sit on one crushed line",
  displayTitle: "A saved page with a very long title that used to sit on one crushed line",
  imageUrl: "/placeholder-unicorn.jpg",
  faviconUrl: "/placeholder-unicorn.jpg",
  groupId: "g1",
  groupName: "Reading",
  deletedAt: "2026-10-01T00:00:00.000Z",
  daysLeft: 12,
};

const group: TrashGroupItem = {
  type: "group",
  id: "g1",
  name: "Reading",
  linksCount: 1,
  deletedAt: "2026-10-01T00:00:00.000Z",
  daysLeft: 0,
};

function actionsFor(label: string) {
  return screen.getByRole("button", { name: label }).parentElement;
}

describe("trash rows on a narrow screen", () => {
  it("keeps link actions on their own row and wraps a long title", () => {
    render(
      <TrashLinkRow item={link} exiting={false} onRestore={() => {}} onDelete={() => {}} />,
    );

    const title = screen.getByText(link.displayTitle);
    expect(title.className).toContain("break-words");
    expect(title.className).toContain("line-clamp-2");
    expect(screen.getByText(/in Reading/)).toBeInTheDocument();

    const actions = actionsFor("Restore");
    expect(actions).toHaveClass("opacity-100", "sm:opacity-0");
    expect(actions?.parentElement?.parentElement?.className).toContain("flex-col");
    expect(actions?.parentElement?.parentElement?.className).toContain("sm:flex-row");
    expect(screen.getByRole("button", { name: "Restore" }).className).toContain(
      "focus-visible:ring-2",
    );
    expect(screen.getByRole("button", { name: "Delete Now" })).toBeInTheDocument();
  });

  it("stacks group actions the same way and says when trash expires today", () => {
    render(
      <TrashGroupRow item={group} exiting={false} onRestore={() => {}} onDelete={() => {}} />,
    );
    expect(screen.getByText("1 link inside")).toBeInTheDocument();
    expect(screen.getByText("Expires today")).toBeInTheDocument();
    expect(actionsFor("Delete Now")).toHaveClass("sm:opacity-0");
  });
});
