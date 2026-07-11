/** Soft border spotlight for cards near the pointer (not only the hovered one). */

const VICINITY_PX = 140;

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
  const shells = grid.querySelectorAll<HTMLElement>(".mind-card-shell");
  for (const shell of shells) {
    applyShellStroke(shell, clientX, clientY);
  }
}

export function clearVicinityCardStrokes(grid: HTMLElement) {
  const shells = grid.querySelectorAll<HTMLElement>(".mind-card-shell");
  for (const shell of shells) {
    clearShellStroke(shell);
  }
}
