# 001 — Fix link detail overlay easing, keyboard path, reduced motion

- **Status**: DONE
- **Commit**: bca7ba5
- **Severity**: HIGH
- **Category**: Easing & duration / Purpose & frequency / Accessibility
- **Estimated scope**: 1 file (`components/LinkDetailOverlay.tsx`), medium

## Problem

The detail overlay is the main spatial story of the vault, but three feel-breaking issues stack:

1. Close uses GSAP `ease: "power2.in"` — `ease-in` on UI delays the moment the user watches most.
2. ArrowLeft / ArrowRight change `link.id`, which re-runs the full open timeline in `useLayoutEffect` — keyboard-initiated actions must not replay modal entrance.
3. No `prefers-reduced-motion` branch — movement always runs.

Current close path:

```ts
/* components/LinkDetailOverlay.tsx:129-135 — current */
const tl = gsap.timeline({
  defaults: { ease: "power2.in" },
  onComplete: () => onClose(),
});
tl.to(panel, { x: -28, opacity: 0, duration: 0.22 }, 0)
  .to(stage, { opacity: 0, scale: 0.94, duration: 0.24 }, 0)
  .to(backdrop, { opacity: 0, duration: 0.28 }, 0.02);
```

Open timeline durations currently hit 0.35 / 0.42 / 0.48s and re-fire on every `link.id` change (`:72-117`).

## Target

```ts
/* target values */
const EASE_OUT = "power3.out"; // ≈ cubic-bezier(0.23, 1, 0.32, 1)
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// First open (mount / fresh open from card):
//   backdrop opacity 0→1, duration 0.22–0.25
//   panel x -24→0 + opacity, duration 0.28
//   stage from originRect (or scale 0.95) → settled, duration 0.30
//   all ease: EASE_OUT
// Reduced motion: opacity only, duration ≤ 0.15, no x/scale/y

// Close (pointer / button):
//   defaults: { ease: EASE_OUT }  // NEVER power2.in / ease-in
//   panel/stage/backdrop ≤ 0.22s

// Keyboard next/prev (ArrowLeft/Right):
//   DO NOT kill/restart open timeline
//   Crossfade stage image only: opacity 1→0→1 over 150–180ms ease-out
//   Panel chrome stays put; no slide-in replay
// Escape may keep a short close (user initiated via keyboard but is dismiss —
// prefer ≤150ms opacity-only under reduce; pointer close can keep transform)
```

## Repo conventions to follow

- Motion tokens (after plan 005): `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)`.
- Reduced-motion pattern already used in `components/DigitalScreen.tsx:94-96` and `RisingHelixFill` via `usePrefersReducedMotion`.
- Overlay already captures `originRect` for spatial morph — keep that for first open only.

## Steps

1. In `components/LinkDetailOverlay.tsx`, add a `prefers-reduced-motion` read (matchMedia or shared hook) at open/close time.
2. Change close timeline `defaults.ease` from `"power2.in"` to `"power3.out"`. Cap close durations ≤ `0.22`.
3. Cap open durations: backdrop `0.24`, panel `0.28`, stage `0.30`. Keep `power3.out`. Fallback start scale stay `0.92–0.95` (never `0`).
4. Split “first open” from “link change while open”:
   - Keep full open TL only when overlay mounts (or when `originRect` is new from a card click).
   - When only `link.id` changes while already open, animate stage content with opacity crossfade 150–180ms; skip panel/backdrop slide.
5. Under reduced motion: opacity-only open/close ≤150ms; skip x/y/scale.
6. Do not change markup structure, delete/copy/move handlers, or feed layout.

## Boundaries

- Do NOT touch `VaultInbox.tsx` keyboard handlers beyond what overlay needs.
- Do NOT add Framer Motion for this overlay.
- Do NOT animate ArrowLeft/Right with the full open timeline.
- If `originRect` wiring differs from this commit, STOP and report.

## Verification

- **Mechanical**: `npx tsc --noEmit` (or project typecheck) passes for touched file.
- **Feel check**:
  - Open a card: stage grows from the card, not from nowhere; settles ≤300ms.
  - Spam ArrowLeft/Right: panel does not re-slide; only the preview crossfades.
  - Close via backdrop/×: exits with ease-out (starts immediately, no sluggish wind-up).
  - DevTools → Rendering → `prefers-reduced-motion: reduce`: movement gone, short fade remains.
  - Animations panel at 10% playback: no ease-in on close.
- **Done when**: no `power2.in` / `ease-in` in this file; keyboard next/prev does not replay open TL; reduced-motion path exists.
