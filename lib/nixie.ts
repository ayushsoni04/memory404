/**
 * Timing for the nixie-tube counter (Workspace → Nixie counter).
 *
 * A change from one number to another becomes, per tube, a list of
 * "light this cathode at t ms" events. The renderer only follows those events;
 * how a cathode heats up and how the old one cools (afterglow) is physics in
 * the renderer, so every mode below looks like real tubes.
 */

/** null = tube dark (a blanked leading zero). */
export type NixieDigit = number | null;

export type NixieMode = "slot" | "cascade" | "afterglow" | "instant";

export type NixieEvent = { at: number; digit: NixieDigit };
/** Events for one tube, sorted by time. The last one is where it settles. */
export type NixieTrack = NixieEvent[];

export const NIXIE_MODES: { id: NixieMode; label: string; hint: string }[] = [
  {
    id: "slot",
    label: "Slot",
    hint: "Changed tubes shuffle through random cathodes, left to right, then lock in.",
  },
  {
    id: "cascade",
    label: "Cascade",
    hint: "Every tube runs its whole cathode stack, front to back, like an anti-poisoning cycle.",
  },
  {
    id: "afterglow",
    label: "Afterglow",
    hint: "Straight swap; the old digit fades slowly while the new one strikes.",
  },
  { id: "instant", label: "Instant", hint: "Plain switch, no motion." },
];

/**
 * Real tubes stack their cathodes in a fixed order, front to back. This is the
 * common IN-14 order; cascade mode walks it so the glow steps through depth.
 */
export const CATHODE_STACK = [1, 6, 2, 7, 5, 0, 4, 9, 8, 3] as const;

/** Digits for `value` across `tubes` tubes. Overflow keeps the low digits. */
export function nixieDigits(value: number, tubes: number, leadingZeros = true): NixieDigit[] {
  const safe = Math.max(0, Math.floor(Number.isFinite(value) ? value : 0));
  const text = String(safe).padStart(tubes, "0").slice(-tubes);
  const firstSignificant = text.search(/[1-9]/);
  return [...text].map((ch, i) => {
    if (!leadingZeros && (firstSignificant === -1 ? i < tubes - 1 : i < firstSignificant)) {
      return null;
    }
    return Number(ch);
  });
}

/** Small seeded RNG so a transition is repeatable in tests. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type NixieTiming = {
  /** Delay between one tube starting and the next, left to right. */
  staggerMs: number;
  /** How long each flashed cathode stays lit in slot / cascade. */
  stepMs: number;
  /** Random cathodes flashed per changed tube in slot mode. */
  slotSteps: number;
};

export const DEFAULT_NIXIE_TIMING: NixieTiming = {
  staggerMs: 70,
  stepMs: 38,
  slotSteps: 9,
};

/** How long a planned transition runs before every tube has settled. */
export function nixieDuration(tracks: NixieTrack[]): number {
  return tracks.reduce((max, track) => Math.max(max, track.at(-1)?.at ?? 0), 0);
}

export function planNixieTransition(
  from: NixieDigit[],
  to: NixieDigit[],
  mode: NixieMode,
  timing: NixieTiming = DEFAULT_NIXIE_TIMING,
  random: () => number = Math.random,
): NixieTrack[] {
  return to.map((target, i) => {
    const start = from[i] ?? null;
    const changed = start !== target;
    if (mode === "instant" || mode === "afterglow") {
      return [{ at: 0, digit: target }];
    }

    if (mode === "slot") {
      if (!changed) return [{ at: 0, digit: target }];
      const t0 = i * timing.staggerMs;
      const track: NixieTrack = [{ at: 0, digit: start }];
      let last = start;
      for (let s = 0; s < timing.slotSteps; s++) {
        let d = Math.floor(random() * 10);
        if (d === last) d = (d + 1 + Math.floor(random() * 9)) % 10;
        // Steps slow down toward the end, like a reel coming to rest.
        const ease = 1 + (s / timing.slotSteps) ** 2 * 1.6;
        track.push({ at: Math.round(t0 + s * timing.stepMs * ease), digit: d });
        last = d;
      }
      const lastAt = track.at(-1)!.at;
      track.push({ at: Math.round(lastAt + timing.stepMs * 2.4), digit: target });
      return track;
    }

    // cascade: every tube walks the whole stack, then lands on its digit.
    const t0 = i * timing.staggerMs;
    const track: NixieTrack = [{ at: 0, digit: start }];
    CATHODE_STACK.forEach((d, s) => {
      track.push({ at: t0 + s * timing.stepMs, digit: d });
    });
    track.push({ at: t0 + CATHODE_STACK.length * timing.stepMs, digit: target });
    return track;
  });
}

/** Which cathode a track has lit at `elapsed` ms. */
export function nixieDigitAt(track: NixieTrack, elapsed: number): NixieDigit {
  let digit: NixieDigit = track[0]?.digit ?? null;
  for (const event of track) {
    if (event.at > elapsed) break;
    digit = event.digit;
  }
  return digit;
}
