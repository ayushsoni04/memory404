/** Soft border spotlight for cards near the pointer (not only the hovered one). */

const VICINITY_PX = 140;

interface CachedCard {
  shell: HTMLElement;
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

let cachedCards: CachedCard[] = [];
let lastScrollY = 0;
let lastScrollX = 0;

export function populateCardRectsCache(grid: HTMLElement) {
  const shells = grid.querySelectorAll<HTMLElement>(".mind-card-shell");
  cachedCards = [];
  lastScrollY = typeof window !== "undefined" ? window.scrollY : 0;
  lastScrollX = typeof window !== "undefined" ? window.scrollX : 0;

  for (const shell of shells) {
    const rect = shell.getBoundingClientRect();
    cachedCards.push({
      shell,
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height,
    });
  }
}

export function clearCardRectsCache() {
  cachedCards = [];
}

if (typeof window !== "undefined") {
  window.addEventListener("resize", clearCardRectsCache);
  window.addEventListener("scroll", () => {
    // If the cache is populated, we can keep it and just let applyVicinityCardStrokes compute the delta,
    // or clear it to rebuild on next mousemove if scrolling extensively.
    // Clearing on scroll is safe since scrolling moves elements relative to the viewport.
    clearCardRectsCache();
  }, { passive: true });
}

export function applyShellStroke(
  shell: HTMLElement,
  clientX: number,
  clientY: number,
) {
  const rect = shell.getBoundingClientRect();
  const clampedX = Math.max(rect.left, Math.min(clientX, rect.right));
  const clampedY = Math.max(rect.top, Math.min(clientY, rect.bottom));
  const dist = Math.hypot(clientX - clampedX, clientY - clampedY);

  if (dist > VICINITY_PX) {
    shell.style.setProperty("--stroke-opacity", "0");
    return;
  }

  const strength = Math.max(0, 1 - dist / VICINITY_PX);
  const xPct = ((clientX - rect.left) / Math.max(rect.width, 1)) * 100;
  const yPct = ((clientY - rect.top) / Math.max(rect.height, 1)) * 100;
  shell.style.setProperty("--glow-x", `${xPct}%`);
  shell.style.setProperty("--glow-y", `${yPct}%`);
  shell.style.setProperty("--stroke-opacity", String(strength));
}

export function clearShellStroke(shell: HTMLElement) {
  shell.style.setProperty("--stroke-opacity", "0");
  shell.style.setProperty("--glow-x", "50%");
  shell.style.setProperty("--glow-y", "50%");
}

export function applyVicinityCardStrokes(
  grid: HTMLElement,
  clientX: number,
  clientY: number,
) {
  if (cachedCards.length === 0) {
    populateCardRectsCache(grid);
  }

  const dY = typeof window !== "undefined" ? window.scrollY - lastScrollY : 0;
  const dX = typeof window !== "undefined" ? window.scrollX - lastScrollX : 0;

  for (const card of cachedCards) {
    const left = card.left - dX;
    const right = card.right - dX;
    const top = card.top - dY;
    const bottom = card.bottom - dY;

    const clampedX = Math.max(left, Math.min(clientX, right));
    const clampedY = Math.max(top, Math.min(clientY, bottom));
    const dist = Math.hypot(clientX - clampedX, clientY - clampedY);

    if (dist > VICINITY_PX) {
      card.shell.style.setProperty("--stroke-opacity", "0");
      continue;
    }

    const strength = Math.max(0, 1 - dist / VICINITY_PX);
    const xPct = ((clientX - left) / Math.max(card.width, 1)) * 100;
    const yPct = ((clientY - top) / Math.max(card.height, 1)) * 100;
    card.shell.style.setProperty("--glow-x", `${xPct}%`);
    card.shell.style.setProperty("--glow-y", `${yPct}%`);
    card.shell.style.setProperty("--stroke-opacity", String(strength));
  }
}

export function clearVicinityCardStrokes(grid: HTMLElement) {
  clearCardRectsCache();
  const shells = grid.querySelectorAll<HTMLElement>(".mind-card-shell");
  for (const shell of shells) {
    clearShellStroke(shell);
  }
}
