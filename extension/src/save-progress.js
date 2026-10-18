/** How a slow single save tells you it is still working. */
export const SAVING_STAGES = [
  { afterMs: 0, text: "Saving…" },
  { afterMs: 2500, text: "Still working…" },
  { afterMs: 5500, text: "Almost there…" },
  { afterMs: 10000, text: "Taking a bit longer…" },
  { afterMs: 16000, text: "Hang tight…" },
];

/** The sentence for how long a save has been running. */
export function savingStageLabel(elapsedMs) {
  const elapsed = Math.max(0, Number(elapsedMs) || 0);
  let text = SAVING_STAGES[0].text;
  for (const stage of SAVING_STAGES) {
    if (elapsed >= stage.afterMs) text = stage.text;
  }
  return text;
}
