// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import SaveTaskRows, { taskStatusCopy } from "../extension/src/SaveTaskRows.jsx";
import { BLOCKED_PAGE_MESSAGE } from "../extension/src/page-url.js";

afterEach(() => {
  cleanup();
});

describe("task status copy", () => {
  it("uses the skip reason instead of a bare skipped label", () => {
    expect(taskStatusCopy("skipped", BLOCKED_PAGE_MESSAGE)).toEqual({
      pill: "Can't save",
      detail: BLOCKED_PAGE_MESSAGE,
    });
    expect(taskStatusCopy("skipped", "  ")).toEqual({
      pill: "Can't save",
      detail: "This page can't be saved.",
    });
    expect(taskStatusCopy("failed", "Session expired")).toEqual({
      pill: "Failed",
      detail: "Session expired",
    });
  });
});

describe("SaveTaskRows", () => {
  it("shows why a tab was left out of a multi-save", () => {
    render(
      <SaveTaskRows
        items={[
          {
            url: "chrome://newtab/",
            title: "New Tab",
            status: "skipped",
            error: BLOCKED_PAGE_MESSAGE,
          },
        ]}
      />,
    );

    expect(screen.getByRole("button", { name: /New Tab/ })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByText("Can't save")).toBeInTheDocument();
    expect(screen.getByText(BLOCKED_PAGE_MESSAGE)).toBeInTheDocument();
  });
});
