# 002 — Shorten or delete search-clear dissolve

- **Status**: DONE
- **Commit**: bca7ba5
- **Severity**: HIGH
- **Category**: Purpose & frequency / Easing & duration / Accessibility
- **Estimated scope**: 2 files (`components/ClearSearchInput.tsx`, `app/globals.css`), small

## Problem

Clearing search runs a 1000ms rAF dissolve with 400ms fly-out/fly-in. Search clear is tens+/day — delight budget does not belong here.

```ts
/* components/ClearSearchInput.tsx:114-122 — current */
const total = 1000;
const outDur = 400;
const inDur = 400;
const outFly = 12;
const inFly = 12;
```

CSS tokens mirror the same over-budget values:

```css
/* app/globals.css:456-462 — current */
--clear-dur: 1000ms;
--clear-out-dur: 400ms;
--clear-in-dur: 400ms;
--clear-out-fly: 12px;
--clear-in-fly: 12px;
```

rAF path does not short-circuit on `prefers-reduced-motion` (CSS only zeros the glow).

## Target

Prefer **delete the choreography** and clear instantly. If a short dissolve is kept:

```ts
/* target — maximum allowed if not deleted */
const total = 220;
const outDur = 160;
const inDur = 160;
const outFly = 6;
const inFly = 6;
const blur = 2;
// ease: cubic-bezier(0.23, 1, 0.32, 1)  (already close to easeOut sampler)
```

```css
/* target tokens */
--clear-dur: 220ms;
--clear-out-dur: 160ms;
--clear-in-dur: 160ms;
--clear-out-fly: 6px;
--clear-in-fly: 6px;
--clear-out-ease: cubic-bezier(0.23, 1, 0.32, 1);
--clear-in-ease: cubic-bezier(0.23, 1, 0.32, 1);
```

Reduced motion: `onChange("")` immediately; no fly/blur/glow/rAF.

## Repo conventions to follow

- Clear control lives in vault header via `VaultInbox.tsx` + `ClearSearchInput`.
- After plan 005, reuse `--ease-out` instead of duplicating beziers.
- Glow dissolve is optional polish — drop it under reduce, and prefer dropping it entirely if it needs the 1s timeline.

## Steps

1. In `ClearSearchInput.tsx` `handleClear`, detect `prefers-reduced-motion`; if set, clear value and return with no rAF.
2. Change `total/outDur/inDur/outFly/inFly` to target values above — or remove the rAF dissolve and clear instantly (preferred).
3. Sync `app/globals.css` `--clear-*` tokens to the same values (or leave unused if JS no longer reads them — then delete dead tokens).
4. Keep the × button `transition-colors` only; do not add scale hover.

## Boundaries

- Do NOT animate typing / each keystroke.
- Do NOT add a library for this.
- Do NOT change search filtering logic.

## Verification

- **Mechanical**: typecheck/lint clean for touched files.
- **Feel check**:
  - Type a query, hit clear: field empties in ≤220ms (ideally instant).
  - Spam clear: no animation restart from zero / no 1s lockout.
  - Reduced motion: instant clear, no glow.
- **Done when**: no 1000ms / 400ms clear durations remain in JS or CSS tokens used by this control.
