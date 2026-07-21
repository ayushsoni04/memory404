export type TextSwapTag =
  | "ENTER"
  | "EXIT"
  | "EDGE CASE"
  | "STRESS"
  | "RESILIENCE"
  | "STABILITY";

export type TextSwapCase = {
  id: string;
  title: string;
  description: string;
  from: string;
  to: string;
  tags: TextSwapTag[];
  /** Heuristic expectation for the lab runner */
  expect: "pass" | "perf";
};

export const TEXT_SWAP_FILTERS = [
  "FAILING ONLY",
  "ENTER",
  "EXIT",
  "EDGE CASE",
  "STRESS",
  "RESILIENCE",
  "STABILITY",
] as const;

export type TextSwapFilter = (typeof TEXT_SWAP_FILTERS)[number];

export const TEXT_SWAP_CASES: TextSwapCase[] = [
  {
    id: "add-word",
    title: "Add word",
    description: "Appends a word to a short title — remount enter should fire.",
    from: "All Links",
    to: "All Links archive",
    tags: ["ENTER"],
    expect: "pass",
  },
  {
    id: "remove-word",
    title: "Remove word",
    description: "Drops a trailing word; enter animation still remounts.",
    from: "design system notes",
    to: "design system",
    tags: ["EXIT", "ENTER"],
    expect: "pass",
  },
  {
    id: "replace-title",
    title: "Replace title",
    description: "Full string replacement like switching vault groups.",
    from: "All Links",
    to: "dream project",
    tags: ["ENTER", "EXIT"],
    expect: "pass",
  },
  {
    id: "short-long",
    title: "Short ↔ long",
    description: "Width jump from a short label to a longer group name.",
    from: "All Links",
    to: "design system",
    tags: ["ENTER", "EDGE CASE"],
    expect: "perf",
  },
  {
    id: "long-short",
    title: "Long ↔ short",
    description: "Shrinks from a long title back to a short one.",
    from: "interface anatomy books",
    to: "learn",
    tags: ["ENTER", "EDGE CASE"],
    expect: "perf",
  },
  {
    id: "empty-to-text",
    title: "Empty → text",
    description: "Enters from an empty string into a title.",
    from: "",
    to: "website",
    tags: ["ENTER", "EDGE CASE"],
    expect: "pass",
  },
  {
    id: "text-to-empty",
    title: "Text → empty",
    description: "Clears the title entirely (rare in vault, still remounts).",
    from: "three js",
    to: "",
    tags: ["EXIT", "EDGE CASE"],
    expect: "pass",
  },
  {
    id: "same-string",
    title: "Same string",
    description: "Identical FROM/TO — remount still happens via key change.",
    from: "memory404",
    to: "memory404",
    tags: ["STABILITY", "EDGE CASE"],
    expect: "pass",
  },
  {
    id: "rapid-seq",
    title: "Rapid sequential swaps",
    description: "Stress: three quick hops that interrupt prior enters.",
    from: "Newest",
    to: "Oldest",
    tags: ["STRESS", "RESILIENCE"],
    expect: "perf",
  },
  {
    id: "reduced-motion",
    title: "Reduced-motion path",
    description:
      "CSS still applies classes; animation should be inert under prefers-reduced-motion.",
    from: "Domain",
    to: "Details",
    tags: ["RESILIENCE", "STABILITY"],
    expect: "pass",
  },
];

export const TEXT_SWAP_LAB_VERSION = "v0.1.0";
