# 005 — Add shared motion tokens; replace `transition-all` hotspots

- **Status**: DONE
- **Commit**: bca7ba5
- **Severity**: MEDIUM
- **Category**: Cohesion & tokens / Performance
- **Estimated scope**: `app/globals.css` + several className hotspots, medium

## Problem

The app has many near-duplicate curves (`cubic-bezier(0.22, 1, 0.36, 1)`, Tailwind defaults, GSAP power curves) and widespread `transition-all`, which animates unintended non-GPU properties.

Hotspots (non-exhaustive, confirmed at audit commit):

```tsx
/* components/TrashBin.tsx:48 */
transition-all duration-200

/* components/ui/button.tsx:7 */
transition-all … active:not-aria-[haspopup]:translate-y-px

/* components/VaultInbox.tsx:1696,1719,1459 */
transition-all duration-150|200

/* app/settings/page.tsx — many */
transition-all duration-200|300
```

Also over-budget related tokens to align while introducing the system:

```css
/* app/globals.css — current pain points */
.vault-enter { animation: vault-fade-up 0.45s … } /* → 250ms */
.rising-helix-band { animation: rising-helix-up 0.55s … } /* → 300ms */
--digit-dur: 500ms; /* coordinated with plan 003 */
--text-swap-ease: ease-in-out; /* → strong ease-in-out or ease-out */
```

## Target

```css
/* app/globals.css :root — add */
--ease-out: cubic-bezier(0.23, 1, 0.32, 1);
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
--duration-press: 160ms;
--duration-tooltip: 160ms;
--duration-ui: 200ms;
--duration-panel: 280ms;
```

Utility patterns:

```css
/* preferred replacements */
transition: transform var(--duration-press) var(--ease-out),
            opacity var(--duration-ui) var(--ease-out),
            background-color 150ms ease,
            color 150ms ease,
            border-color 150ms ease;

/* press feedback */
:active { transform: scale(0.97); }

/* hover motion only when real hover */
@media (hover: hover) and (pointer: fine) {
  /* gated hover transforms / opacity reveals */
}
```

Immediate duration trims in same PR (low risk):

- `.vault-enter` → **250ms** `var(--ease-out)`
- `.rising-helix-band` → **300ms** `var(--ease-out)`
- `--text-swap-ease` → `var(--ease-in-out)` (on-screen morph) or `var(--ease-out)` if treated as enter/exit
- `.animate-bin-receive` → **280ms** max + add `@media (prefers-reduced-motion: reduce) { animation: none }`
- Success check: `--check-*-dur: 320ms`; `--check-y-amount: 10px`; `--check-blur-from: 2px`; shorten `AddLinkCard` / `VaultInbox` `await … 1300` to ~400ms

## Repo conventions to follow

- Put tokens in `app/globals.css` `:root` next to existing `--text-swap-*` / `--digit-*` / `--check-*`.
- Prefer Tailwind explicit `transition-colors` / `transition-opacity` / `transition-transform` over new CSS classes when editing TSX.
- Do not invent a parallel token file.

## Steps

1. Add `--ease-out`, `--ease-in-out`, `--ease-drawer`, and duration tokens to `:root`.
2. Point existing custom properties (`--text-swap-ease`, digit/check/clear easings where touched) at those tokens.
3. Trim vault-enter, rising-helix, bin-shake, success-check as listed.
4. Replace `transition-all` on: `TrashBin`, `ui/button.tsx`, VaultInbox pill/delete/sidebar submit, settings nav/tabs/cards that only need color/opacity/transform.
5. Add a shared press recipe where `active:scale-95` already exists: `active:scale-[0.97]` + `transition-transform duration-160`.
6. Add one global or component-level `@media (hover: hover) and (pointer: fine)` helper for card dim / trash action reveal / pill X opacity — at minimum document the pattern and apply to `LinkCard` overlay + trash row actions.

## Boundaries

- Do NOT restyle the whole settings page visually.
- Do NOT add Framer Motion for press feedback.
- Do NOT animate masonry feed entrance.
- Stop if a `transition-all` is clearly intentional for a complex multi-property morph you cannot map — leave a TODO comment and report.

## Verification

- **Mechanical**: `rg "transition-all" components app` — remaining hits should be justified or zero in hotspots listed above.
- **Feel check**:
  - Pill hover/select: color changes only, no layout tween.
  - Button press: subtle 0.97 scale, ≤160ms.
  - Vault first paint: enter ≤250ms.
  - Drop to trash: feedback ≤280ms; reduced-motion kills shake.
- **Done when**: shared tokens exist; listed hotspots no longer use `transition-all`; over-budget vault/helix/bin/check durations match targets.
