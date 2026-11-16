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
  {
    slug: "group-heading",
    title: "Group heading",
    description:
      "Four ways to show the open group's name at the top of the library, side by side.",
    status: "beta",
  },
  {
    slug: "nixie",
    title: "Nixie counter",
    description:
      "Your link count on three.js nixie tubes. Try how the digits change: slot, cascade, afterglow.",
    status: "beta",
  },
  {
    slug: "wordmark",
    title: "Wordmark",
    description: "memory 404 spray-painted in red over a justified serif paragraph.",
    status: "beta",
  },
];

export function getLab(slug: string): WorkspaceLab | undefined {
  return WORKSPACE_LABS.find((lab) => lab.slug === slug);
}
