# Animation improvement plans

Audit commit: `bca7ba5`  
Sources: review-animations + find-animation-opportunities + improve-animations (Emil Kowalski bar)

## Status

| # | Plan | Severity | Status | Depends on |
| --- | --- | --- | --- | --- |
| 001 | Fix overlay easing, keyboard path, reduced motion | HIGH | DONE | — |
| 002 | Shorten or delete search-clear dissolve | HIGH | DONE | 005 tokens helpful |
| 003 | Stop NumberPopIn on continuous slider input | HIGH | DONE | 005 tokens helpful |
| 004 | Wire real modal enter (settings) + kill contribution hover scale | HIGH | DONE | 005 tokens helpful |
| 005 | Add shared motion tokens; replace `transition-all` hotspots | MEDIUM | DONE | — |

## Recommended execution order

1. **005** — tokens first so later plans reuse exact curves.
2. **001** — biggest daily feel win (detail overlay).
3. **002** — search clear is frequent and currently 1s.
4. **003** — workspace/settings sliders fire dozens of pops per drag.
5. **004** — settings polish + dead modal classes.

## Out of scope (rejected)

- Staggered masonry card entrance on every filter/sort
- Animating group pill selection / Escape / arrow next-prev
- Extra card hover lift/tilt beyond existing stroke + dim
- Celebratory empty-state confetti
