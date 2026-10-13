// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CollectionDrop } from "@/components/vault/VaultGroupToolbar";

vi.mock("@/lib/ui-sound", () => ({
  playUiSound: vi.fn(),
}));

afterEach(() => {
  cleanup();
});

function dataTransfer(linkId: string) {
  return {
    dropEffect: "move",
    effectAllowed: "move",
    getData: (key: string) => (key === "linkId" ? linkId : ""),
    setData: () => {},
    types: ["linkid"],
  };
}

describe("CollectionDrop", () => {
  it("moves a dropped link into the group", () => {
    const onDropLink = vi.fn();
    render(
      <CollectionDrop groupId="references" onDropLink={onDropLink} className="pill">
        <button type="button">References</button>
      </CollectionDrop>,
    );

    const target = screen.getByTitle("Drop a link to move it here");
    fireEvent.dragOver(target, { dataTransfer: dataTransfer("link-1") });
    expect(target).toHaveAttribute("data-drop-over", "true");
    expect(screen.getByText("Move")).toBeInTheDocument();

    fireEvent.drop(target, { dataTransfer: dataTransfer("link-1") });
    expect(onDropLink).toHaveBeenCalledWith("link-1", "references");
    expect(target).toHaveAttribute("data-drop-over", "false");
  });

  it("ignores a drop that is not a link", () => {
    const onDropLink = vi.fn();
    render(
      <CollectionDrop groupId="references" onDropLink={onDropLink} className="pill">
        <span>References</span>
      </CollectionDrop>,
    );
    fireEvent.drop(screen.getByTitle("Drop a link to move it here"), {
      dataTransfer: dataTransfer(""),
    });
    expect(onDropLink).not.toHaveBeenCalled();
  });
});
