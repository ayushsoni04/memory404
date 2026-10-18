// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { TrashGroupItem, TrashLinkItem } from "@/app/api/trash/route";
import { TrashGroupRow, TrashLinkRow, trashRowActionName } from "@/app/trash/TrashRows";

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

function actionsFor(name: RegExp) {
  return screen.getByRole("button", { name }).parentElement;
}

describe("trash row action names", () => {
  it("names the item, and falls back when the title is blank", () => {
    expect(trashRowActionName("restore", "Pricing")).toBe("Restore Pricing");
    expect(trashRowActionName("delete", "Pricing")).toBe("Delete Pricing forever");
    expect(trashRowActionName("restore", "  ")).toBe("Restore this item");
  });
});

describe("trash rows on a narrow screen", () => {
  it("keeps link actions on their own row and wraps a long title", () => {
    render(
      <TrashLinkRow item={link} exiting={false} onRestore={() => {}} onDelete={() => {}} />,
    );

    const title = screen.getByText(link.displayTitle);
    expect(title.className).toContain("break-words");
    expect(title.className).toContain("line-clamp-2");
    expect(screen.getByText(/in Reading/)).toBeInTheDocument();

    const actions = actionsFor(/^Restore /);
    expect(actions).toHaveClass("opacity-100", "sm:opacity-0");
    expect(actions?.parentElement?.parentElement?.className).toContain("flex-col");
    expect(actions?.parentElement?.parentElement?.className).toContain("sm:flex-row");
    const restore = screen.getByRole("button", {
      name: trashRowActionName("restore", link.displayTitle),
    });
    expect(restore.className).toContain("focus-visible:ring-2");
    expect(restore.className).toContain("min-h-6");
    expect(
      screen.getByRole("button", {
        name: trashRowActionName("delete", link.displayTitle),
      }).className,
    ).toContain("min-h-6");
    expect(screen.queryByRole("button", { name: "Delete Now" })).not.toBeInTheDocument();
  });

  it("stacks group actions the same way and says when trash expires today", () => {
    render(
      <TrashGroupRow item={group} exiting={false} onRestore={() => {}} onDelete={() => {}} />,
    );
    expect(screen.getByText("1 link inside")).toBeInTheDocument();
    expect(screen.getByText("Expires today")).toBeInTheDocument();
    expect(actionsFor(/^Delete Reading forever$/)).toHaveClass("sm:opacity-0");
    expect(screen.getByRole("button", { name: "Restore Reading" })).toBeInTheDocument();
  });

  it("calls a trashed inbox group All", () => {
    render(
      <TrashGroupRow
        item={{ ...group, name: "General" }}
        exiting={false}
        onRestore={() => {}}
        onDelete={() => {}}
      />,
    );
    expect(screen.getByText("All")).toBeInTheDocument();
    expect(screen.queryByText("General")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Restore All" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete All forever" })).toBeInTheDocument();
  });

  it("calls the inbox All, the same label the library uses", () => {
    render(
      <TrashLinkRow
        item={{ ...link, groupName: "General" }}
        exiting={false}
        onRestore={() => {}}
        onDelete={() => {}}
      />,
    );
    expect(screen.getByText(/in All/)).toBeInTheDocument();
    expect(screen.queryByText(/in General/)).not.toBeInTheDocument();
  });
});
