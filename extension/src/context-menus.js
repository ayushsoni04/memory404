/** Right-click items. Ids stay stable so an already-installed menu still maps. */
export const CONTEXT_MENUS = [
  {
    id: "lk-parent",
    title: "Save to memory404",
    contexts: ["page", "link", "selection", "tab"],
  },
  {
    id: "lk-save",
    parentId: "lk-parent",
    title: "Save this page",
    contexts: ["page", "link", "selection", "tab"],
  },
  {
    id: "lk-save-open",
    parentId: "lk-parent",
    title: "Save and open memory404",
    contexts: ["page", "link", "selection", "tab"],
  },
  {
    id: "lk-save-selected",
    parentId: "lk-parent",
    title: "Save selected tabs",
    contexts: ["page", "tab"],
  },
  {
    id: "lk-save-group",
    parentId: "lk-parent",
    title: "Save this tab group",
    contexts: ["page", "tab"],
  },
];
