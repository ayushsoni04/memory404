export type WorkspaceLab = {
  slug: string;
  title: string;
  description: string;
  status: "ready" | "beta";
};

export const WORKSPACE_LABS: WorkspaceLab[] = [
  {
    slug: "screen",
    title: "Screen editor",
    description: "Configure LED matrix screens — size, dots, frame, and paint.",
    status: "ready",
  },
  {
    slug: "text-swap",
    title: "Text swap",
    description:
      "Sandbox and case runner for vault title TextSwap enter animations.",
    status: "beta",
  },
  {
    slug: "group-toolbar",
    title: "Group toolbar",
    description:
      "Preview VaultGroupToolbar on every screen, tweak values, copy a change prompt.",
    status: "ready",
  },
];

export function getLab(slug: string): WorkspaceLab | undefined {
  return WORKSPACE_LABS.find((lab) => lab.slug === slug);
}
