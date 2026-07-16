# 004 — Wire real settings modal enter; kill contribution hover scale

- **Status**: DONE
- **Commit**: bca7ba5
- **Severity**: HIGH
- **Category**: Missed opportunities / Purpose & frequency / Accessibility
- **Estimated scope**: 2 files (`app/settings/page.tsx`, `app/globals.css`), medium

## Problem

1. Deactivate modal uses `animate-fade-in` / `animate-scale-up`, but those classes are **not defined** in product CSS (`tw-animate-css` is in package.json and not imported). Intended entrance is a no-op — the modal teleports.

```tsx
/* app/settings/page.tsx:996-997 — current */
<div className="fixed inset-0 z-50 … animate-fade-in">
  <div className="… animate-scale-up">
```

2. Contribution grid cells use frequent hover scale with `transition-all`:

```tsx
/* app/settings/page.tsx:305 — current */
className={`size-2.5 rounded-sm transition-all duration-300 hover:scale-125 cursor-pointer ${colorClass}`}
```

~182 cells × hover = tens+/day noise; ungated for touch; `scale-125` is loud; `transition-all` is unbounded.

Auth modal (`:1054+`) also mounts with no enter/exit — secondary, same modal recipe.

## Target

```css
/* app/globals.css — add real modal utilities */
:root {
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1); /* or reuse plan 005 token */
}

@keyframes mind-modal-backdrop-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes mind-modal-panel-in {
  from { opacity: 0; transform: scale(0.96); }
  to { opacity: 1; transform: scale(1); }
}

.mind-modal-backdrop-in {
  animation: mind-modal-backdrop-in 240ms var(--ease-out) both;
}
.mind-modal-panel-in {
  transform-origin: center; /* modals are exempt — center is correct */
  animation: mind-modal-panel-in 280ms var(--ease-out) both;
}

@media (prefers-reduced-motion: reduce) {
  .mind-modal-backdrop-in,
  .mind-modal-panel-in {
    animation: mind-modal-backdrop-in 150ms ease both; /* opacity-only keyframes path, or disable transform in a reduce-specific keyframe */
  }
  .mind-modal-panel-in {
    animation: none;
    opacity: 1;
  }
}
```

Contribution cells:

```tsx
/* target */
className={`size-2.5 rounded-sm ${colorClass}`}
/* OR, if a hover hint is required, CSS: */
/* @media (hover: hover) and (pointer: fine) {
     .contrib-cell:hover { transform: scale(1.06); transition: transform 150ms ease; }
   }
   @media (prefers-reduced-motion: reduce) { .contrib-cell:hover { transform: none; } }
*/
```

Progress bars that currently animate `width` (`transition-all duration-500` + inline width): prefer `transform: scaleX(...)` with `transform-origin: left`, duration **200–250ms**, `var(--ease-out)`.

## Repo conventions to follow

- Do not invent a second animation system via unimported `tw-animate-css` unless you also import it and use its real utility names — prefer local `.mind-modal-*` classes for control.
- Modal origin stays center (exempt from trigger-origin rule).
- Never `scale(0)` — start at `0.95–0.97`.

## Steps

1. Add `.mind-modal-backdrop-in` / `.mind-modal-panel-in` (or equivalent) to `app/globals.css` with exact durations above + reduced-motion.
2. Replace `animate-fade-in` / `animate-scale-up` on deactivate modal with those classes.
3. Apply the same enter classes to the auth modal shell (optional but recommended in this plan).
4. Remove `transition-all duration-300 hover:scale-125` from contribution cells; either no hover motion or gated `scale(1.06)` / 150ms.
5. Optional same PR: change stats bars from width tween to `scaleX` 200–250ms.
6. Escape on auth modal: dismiss **without** entrance replay; keyboard dismiss should be instant or opacity-only ≤150ms.

## Boundaries

- Do NOT stagger settings tab content.
- Do NOT animate the contribution grid on load.
- Do NOT import a motion library for settings.
- Do NOT use `zoom-in` utilities that map to `scale(0)`.

## Verification

- **Mechanical**: typecheck; confirm no references to undefined `animate-fade-in` / `animate-scale-up` remain in settings.
- **Feel check**:
  - Open deactivate modal: backdrop + panel ease-out from `scale(0.96)`, ≤280ms.
  - Hover contribution cells rapidly: no 1.25 scale wave; touch devices don’t sticky-hover.
  - Reduced motion: opacity only / no panel scale.
  - Animations panel 10%: panel does not ease-in.
- **Done when**: modal entrance is real CSS; contribution hover scale-125 + transition-all are gone.
