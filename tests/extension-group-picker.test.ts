import { describe, expect, it } from "vitest";
import {
  chooseSaveGroup,
  groupPickerKeyAction,
  libraryGroupForTitle,
  nextGroupHighlight,
} from "../extension/src/group-picker.js";

describe("nextGroupHighlight", () => {
  it("starts at the first group on ArrowDown and the last on ArrowUp", () => {
    expect(nextGroupHighlight(-1, "ArrowDown", 3)).toBe(0);
    expect(nextGroupHighlight(-1, "ArrowUp", 3)).toBe(2);
  });

  it("stops at the ends", () => {
    expect(nextGroupHighlight(2, "ArrowDown", 3)).toBe(2);
    expect(nextGroupHighlight(0, "ArrowUp", 3)).toBe(0);
    expect(nextGroupHighlight(1, "Home", 3)).toBe(0);
    expect(nextGroupHighlight(1, "End", 3)).toBe(2);
  });

  it("ignores other keys and an empty list", () => {
    expect(nextGroupHighlight(0, "Enter", 3)).toBeNull();
    expect(nextGroupHighlight(-1, "ArrowDown", 0)).toBeNull();
  });
});

describe("groupPickerKeyAction", () => {
  it("moves the highlight while the list is open", () => {
    expect(
      groupPickerKeyAction({
        key: "ArrowDown",
        highlight: -1,
        count: 2,
        hasExactMatch: false,
        hasQuery: false,
      }),
    ).toEqual({ type: "highlight", index: 0 });
  });

  it("picks the highlighted group on Enter", () => {
    expect(
      groupPickerKeyAction({
        key: "Enter",
        highlight: 1,
        count: 3,
        hasExactMatch: true,
        hasQuery: true,
      }),
    ).toEqual({ type: "pick", index: 1 });
  });

  it("picks an exact name, or creates the typed name, when nothing is highlighted", () => {
    expect(
      groupPickerKeyAction({
        key: "Enter",
        highlight: -1,
        count: 2,
        hasExactMatch: true,
        hasQuery: true,
      }),
    ).toEqual({ type: "pick-exact" });
    expect(
      groupPickerKeyAction({
        key: "Enter",
        highlight: -1,
        count: 0,
        hasExactMatch: false,
        hasQuery: true,
      }),
    ).toEqual({ type: "create" });
  });

  it("picks the only visible group instead of creating a shorter name", () => {
    expect(
      groupPickerKeyAction({
        key: "Enter",
        highlight: -1,
        count: 1,
        hasExactMatch: false,
        hasQuery: true,
      }),
    ).toEqual({ type: "pick", index: 0 });
  });

  it("closes on Escape and ignores unrelated keys", () => {
    expect(
      groupPickerKeyAction({
        key: "Escape",
        highlight: 0,
        count: 2,
        hasExactMatch: false,
        hasQuery: false,
      }),
    ).toEqual({ type: "close" });
    expect(
      groupPickerKeyAction({
        key: "a",
        highlight: -1,
        count: 2,
        hasExactMatch: false,
        hasQuery: false,
      }),
    ).toEqual({ type: "noop" });
  });
});

describe("libraryGroupForTitle", () => {
  const groups = [
    { id: "inbox", name: "General" },
    { id: "side", name: "Side Projects" },
  ];

  it("matches a browser tab group that differs by hyphens or spaces", () => {
    expect(libraryGroupForTitle(groups, "side-projects")).toEqual(groups[1]);
    expect(libraryGroupForTitle(groups, "Side  Projects")).toEqual(groups[1]);
    expect(libraryGroupForTitle(groups, "side/projects")).toEqual(groups[1]);
  });

  it("saves All, General, and Uncategorized into the inbox", () => {
    expect(libraryGroupForTitle(groups, "All")?.id).toBe("inbox");
    expect(libraryGroupForTitle(groups, "uncategorized")?.id).toBe("inbox");
    expect(libraryGroupForTitle(groups, "Reading")).toBeNull();
    expect(libraryGroupForTitle(null, "Side Projects")).toBeNull();
  });
});

describe("chooseSaveGroup", () => {
  const projects = { id: "projects", name: "Projects" };
  const archive = { id: "archive", name: "Archive" };

  it("saves into the only group still in the list", () => {
    expect(
      chooseSaveGroup({
        selected: null,
        exact: null,
        visible: [projects],
        query: "Proj",
      }),
    ).toEqual({ type: "use", group: projects });
  });

  it("creates the typed name when several groups still match", () => {
    expect(
      chooseSaveGroup({
        selected: null,
        exact: null,
        visible: [projects, archive],
        query: "Pro",
      }),
    ).toEqual({ type: "create", name: "Pro" });
  });

  it("creates a name the person asked for, even when one group matches", () => {
    expect(
      chooseSaveGroup({
        selected: null,
        exact: null,
        visible: [projects],
        query: "Proj",
        createName: "Proj",
      }),
    ).toEqual({ type: "create", name: "Proj" });
  });

  it("keeps a chosen row ahead of the typed filter", () => {
    expect(
      chooseSaveGroup({
        selected: archive,
        exact: projects,
        visible: [projects],
        query: "Projects",
      }),
    ).toEqual({ type: "use", group: archive });
    expect(chooseSaveGroup({ query: "   " })).toEqual({ type: "need-group" });
  });
});
