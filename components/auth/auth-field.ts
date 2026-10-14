/** Auth fields share the library focus ring so keyboard users can see where they are. */

export const authFieldClass =
  "w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-foreground outline-none transition-[border-color,box-shadow] duration-[var(--duration-ui)] placeholder:text-subtle focus-visible:border-border-strong focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklch,var(--focus)_35%,transparent)]";

export const authPasswordFieldClass = `${authFieldClass} pr-11`;

export const authRevealClass =
  "absolute right-1 top-1 inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-subtle hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklch,var(--focus)_40%,transparent)]";

export const authSubmitClass =
  "h-9 w-full cursor-pointer rounded-lg bg-pill-active text-xs font-bold text-pill-active-fg transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklch,var(--focus)_70%,transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:opacity-50";

export const authLinkClass =
  "rounded-sm text-foreground underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklch,var(--focus)_40%,transparent)]";

export const authQuietControlClass =
  "cursor-pointer rounded-sm text-[11px] text-subtle transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklch,var(--focus)_40%,transparent)] disabled:opacity-50";
