// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { readFileSync } from "node:fs";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CreateGroupOption,
  CurrentGroupLine,
  GroupOptionName,
} from "../extension/src/GroupName.jsx";

afterEach(() => {
  cleanup();
});

const longName = "A".repeat(60);

describe("extension group names", () => {
  it("keeps a long group name inside the row and offers the full name", () => {
    render(<GroupOptionName name={longName} />);
    const name = screen.getByTitle(longName);
    expect(name).toHaveTextContent(longName);
    expect(name.className).toContain("group-option-name");
  });

  it("keeps Create and the saved group line inside the panel", () => {
    const onClick = vi.fn();
    render(
      <>
        <CreateGroupOption
          name={longName}
          onMouseDown={(event: { preventDefault: () => void }) => event.preventDefault()}
          onClick={onClick}
        />
        <CurrentGroupLine name={longName} />
      </>,
    );

    const create = screen.getByRole("button", { name: `Create “${longName}”` });
    expect(create).toHaveAttribute("title", longName);
    expect(create.className).toContain("create-option");
    fireEvent.click(create);
    expect(onClick).toHaveBeenCalledOnce();

    const saved = screen.getByText(`In ${longName}`);
    expect(saved).toHaveAttribute("title", longName);
    expect(saved.className).toContain("current-group");
  });

  it("is what the save overlay and its styles use", () => {
    const overlay = readFileSync("extension/src/overlay.jsx", "utf8");
    const css = readFileSync("extension/src/overlay-styles.css", "utf8");
    expect(overlay).toContain("<GroupOptionName");
    expect(overlay).toContain("<CreateGroupOption");
    expect(overlay).toContain("<CurrentGroupLine");
    expect(css).toContain(".group-option-name");
    expect(css).toContain("text-overflow: ellipsis");
    expect(readFileSync("extension/public/static/manifest.json", "utf8")).toContain(
      '"version": "0.2.23"',
    );
  });
});
