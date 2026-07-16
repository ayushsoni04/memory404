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
  lastOpacity?: string;
}

let cachedCards: CachedCard[] = [];
let lastScrollY = 0;
let lastScrollX = 0;
/** Prevents re-populating the cache more than once per frame (16ms guard). */
let lastPopulateTime = 0;

export function populateCardRectsCache(grid: HTMLElement) {
  const shells = grid.querySelectorAll<HTMLElement>(".mind-card-shell");
  cachedCards = [];
  lastScrollY = typeof window !== "undefined" ? window.scrollY : 0;
  lastScrollX = typeof window !== "undefined" ? window.scrollX : 0;
  lastPopulateTime = Date.now();

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
    // Clear so the delta logic in applyVicinityCardStrokes picks up new positions.
    // The 16ms guard in applyVicinityCardStrokes prevents an immediate expensive
    // repopulate — it'll rebuild on the next mousemove after the guard expires.
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
    // Guard: don't repopulate more than once per ~frame (16ms).
    // This prevents layout-reflow thrashing when cache is cleared on scroll
    // and the user immediately moves the mouse before the frame settles.
    if (Date.now() - lastPopulateTime < 16) return;
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
      if (card.lastOpacity !== "0") {
        card.shell.style.setProperty("--stroke-opacity", "0");
        card.lastOpacity = "0";
      }
      continue;
    }

    const strength = Math.max(0, 1 - dist / VICINITY_PX);
    const strengthStr = strength.toFixed(3);
    const xPct = (((clientX - left) / Math.max(card.width, 1)) * 100).toFixed(1);
    const yPct = (((clientY - top) / Math.max(card.height, 1)) * 100).toFixed(1);

    card.shell.style.setProperty("--glow-x", `${xPct}%`);
    card.shell.style.setProperty("--glow-y", `${yPct}%`);
    if (card.lastOpacity !== strengthStr) {
      card.shell.style.setProperty("--stroke-opacity", strengthStr);
      card.lastOpacity = strengthStr;
    }
  }
}

export function clearVicinityCardStrokes(grid: HTMLElement) {
  clearCardRectsCache();
  const shells = grid.querySelectorAll<HTMLElement>(".mind-card-shell");
  for (const shell of shells) {
    clearShellStroke(shell);
  }
}
