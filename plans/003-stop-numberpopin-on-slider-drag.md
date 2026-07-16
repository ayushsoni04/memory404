# 003 — Stop NumberPopIn on continuous slider input

- **Status**: DONE
- **Commit**: bca7ba5
- **Severity**: HIGH
- **Category**: Purpose & frequency / Interruptibility / Easing & duration
- **Estimated scope**: 3 files (`components/NumberPopIn.tsx`, `components/ui/studio-controls.tsx`, `app/globals.css`), small–medium

## Problem

`NumberPopIn` replays a 500ms bounce keyframe on every value change. `RangeField` wires it directly to slider `value`, so dragging fires dozens of non-interruptible keyframe restarts per second.

```css
/* app/globals.css:385-390 — current */
--digit-dur: 500ms;
--digit-stagger: 70ms;
--digit-ease: cubic-bezier(0.34, 1.45, 0.64, 1);
```

```tsx
/* components/ui/studio-controls.tsx:51-53 — current */
<span className="font-mono text-foreground tabular-nums flex items-baseline">
  <NumberPopIn>{value}</NumberPopIn>
  {unit ?? ""}
</span>
```

Also used in `components/ScreenWorkspace.tsx:285-291` for live cols/rows/size readouts.

## Target

Primary fix: **do not animate while dragging**.

```tsx
/* target — RangeField */
<span className="font-mono text-foreground tabular-nums">
  {value}{unit ?? ""}
</span>
/* optional: NumberPopIn only on pointerup/commit, not onChange */
```

If NumberPopIn remains for discrete commits (e.g. button nudges):

```css
/* target tokens */
--digit-dur: 180ms;
--digit-stagger: 40ms;
--digit-distance: 6px;
--digit-blur: 2px;
--digit-ease: cubic-bezier(0.23, 1, 0.32, 1); /* no bounce overshoot */
```

Keep `tabular-nums` so digits don’t shift layout. Reduced-motion path already zeros animation — keep it.

## Repo conventions to follow

- Studio controls already use `transition-colors` only — match that crisp personality.
- Prefer CSS transitions over keyframes for anything that can re-trigger rapidly.
- Shared `--ease-out` from plan 005.

## Steps

1. In `studio-controls.tsx` `RangeField`, replace `<NumberPopIn>{value}</NumberPopIn>` with plain `{value}` (keep `tabular-nums`).
2. In `ScreenWorkspace.tsx`, same for live slider-driven readouts; keep NumberPopIn only if a value changes from a discrete control (not `input type="range" onChange`).
3. In `globals.css`, set `--digit-dur: 180ms` and `--digit-ease: cubic-bezier(0.23, 1, 0.32, 1)`; reduce `--digit-stagger` to `40ms`.
4. Optionally add a `NumberPopIn` prop `enabled` / `animate` defaulting true for rare call sites — but RangeField must pass false or not use it.
5. Do not remove the component entirely if other discrete call sites want a short pop.

## Boundaries

- Do NOT add bounce back into digit ease.
- Do NOT animate every slider tick.
- Do NOT change slider min/max/step behavior.

## Verification

- **Mechanical**: typecheck clean.
- **Feel check**:
  - Drag any workspace range: number updates instantly, no blur/bounce strobing.
  - If a discrete commit pop remains: ≤180ms, ease-out, no overshoot.
  - Reduced motion: no digit animation.
- **Done when**: dragging a range never triggers `t-digit-pop-in`; `--digit-dur` ≤220ms if the effect remains at all.
