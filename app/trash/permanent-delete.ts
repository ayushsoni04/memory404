export type PermanentDelete =
  | { kind: "empty"; count: number }
  | { kind: "link"; id: string; title: string }
  | { kind: "group"; id: string; name: string };

export function permanentDeleteCopy(pending: PermanentDelete): {
  title: string;
  detail: string;
  action: string;
} {
  if (pending.kind === "empty") {
    const count =
      pending.count === 1 ? "1 item" : `${Math.max(pending.count, 0)} items`;
    return {
      title: "Empty Trash?",
      detail: `This permanently deletes ${count}. This cannot be undone.`,
      action: "Empty Trash",
    };
  }
  if (pending.kind === "link") {
    return {
      title: `Delete “${pending.title}” forever?`,
      detail: "This cannot be undone.",
      action: "Delete forever",
    };
  }
  return {
    title: `Delete “${pending.name}” forever?`,
    detail:
      "Links that were deleted with this group are removed too. This cannot be undone.",
    action: "Delete forever",
  };
}
