/**
 * Draws the stand-in images for links whose page can't be screenshotted.
 * Each one is an ordered-dither field in the Signal palette, written to
 * public/placeholders/dither-<n>.png.
 *
 *   node scripts/generate-dither-placeholders.mjs
 *
 * Deterministic: the same script always writes the same pixels.
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const OUT_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "public",
  "placeholders",
);

/** Dither grid (16:10) and how many real pixels each cell covers. */
const COLS = 320;
const ROWS = 200;
const CELL = 4;

const INK = [4, 5, 10];
const NAVY = [16, 28, 82];
const COBALT = [44, 76, 182];
const BLUE = [90, 134, 222];
const SKY = [169, 200, 240];
const LILAC = [205, 185, 238];
const ORANGE = [238, 106, 58];
const CORAL = [244, 161, 139];
const WHITE = [245, 247, 252];

const BAYER_8 = [
  0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36,
  14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22, 3, 35, 11, 43, 1, 33, 9, 41,
  51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23,
  61, 29, 53, 21,
].map((value) => (value + 0.5) / 64);

const clamp01 = (value) => Math.min(1, Math.max(0, value));
const smooth = (edge0, edge1, value) => {
  const t = clamp01((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};

/** Repeatable noise, so the terrain image never changes between runs. */
function hash2(x, y, seed) {
  let h = (x * 374761393 + y * 668265263 + seed * 1442695041) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function valueNoise(x, y, seed) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const top = hash2(x0, y0, seed) * (1 - sx) + hash2(x0 + 1, y0, seed) * sx;
  const bottom = hash2(x0, y0 + 1, seed) * (1 - sx) + hash2(x0 + 1, y0 + 1, seed) * sx;
  return top * (1 - sy) + bottom * sy;
}

function fbm(x, y, seed) {
  let total = 0;
  let amp = 0.5;
  let freq = 1;
  for (let octave = 0; octave < 4; octave++) {
    total += amp * valueNoise(x * freq, y * freq, seed + octave * 17);
    amp *= 0.5;
    freq *= 2;
  }
  return total / 0.9375;
}

/**
 * Each field takes a point (x across 0..1.6, y down 0..1) and returns a
 * brightness 0..1. The ramp lists the colours that brightness dithers through,
 * dark to light.
 */
const FIELDS = [
  {
    name: "eclipse",
    ramp: [INK, NAVY, COBALT, SKY],
    accent: { color: ORANGE, at: (x, y) => smooth(0.05, 0, Math.abs(Math.hypot(x - 0.8, y - 1.18) - 0.86)) * 0.9 },
    value: (x, y) => {
      const d = Math.hypot(x - 0.8, y - 1.18);
      const inside = smooth(0.86, 0.82, d);
      return inside * clamp01(1 - (y - 0.3) * 2.1) * 0.95 + (1 - inside) * clamp01(0.5 - y * 0.6) * 0.35;
    },
  },
  {
    name: "sun",
    ramp: [INK, NAVY, BLUE, LILAC],
    accent: { color: CORAL, at: (x, y) => smooth(0.2, 0.17, Math.hypot(x - 1.05, y - 0.42)) },
    value: (x, y) => {
      const glow = smooth(0.75, 0.15, Math.hypot(x - 1.05, y - 0.42));
      const horizon = smooth(0.62, 0.66, y);
      const water = horizon * (0.25 + 0.2 * Math.sin((y - 0.64) * 180) * smooth(0.5, 0, Math.abs(x - 1.05)));
      return (1 - horizon) * (0.12 + glow * 0.78) + water;
    },
  },
  {
    name: "waves",
    ramp: [INK, NAVY, COBALT, SKY],
    value: (x, y) => {
      const a = Math.sin(x * 9 + Math.sin(y * 5) * 1.6);
      const b = Math.sin(y * 13 - x * 3.5);
      return clamp01(0.5 + 0.28 * a + 0.22 * b) * (0.35 + 0.65 * (1 - y));
    },
  },
  {
    name: "rings",
    ramp: [INK, NAVY, BLUE, WHITE],
    accent: { color: ORANGE, at: (x, y) => smooth(0.045, 0.03, Math.hypot(x - 0.52, y - 0.56)) },
    value: (x, y) => {
      const d = Math.hypot(x - 0.52, y - 0.56);
      return clamp01(0.5 + 0.5 * Math.cos(d * 34)) * smooth(1.25, 0.05, d);
    },
  },
  {
    name: "terrain",
    ramp: [INK, NAVY, COBALT, LILAC],
    value: (x, y) => {
      const n = fbm(x * 3.2, y * 3.2, 11);
      return clamp01((n - 0.28) * 1.9) * (0.4 + 0.6 * smooth(1, 0.1, y));
    },
  },
  {
    name: "beam",
    ramp: [INK, NAVY, BLUE, SKY],
    accent: { color: CORAL, at: (x, y) => smooth(0.022, 0, Math.abs(y - (0.95 - x * 0.42))) * smooth(0.1, 0.6, x) * 0.9 },
    value: (x, y) => {
      const beam = smooth(0.34, 0, Math.abs(y - (0.95 - x * 0.42)));
      return clamp01(beam * (0.25 + x * 0.55) + 0.08 * (1 - y));
    },
  },
  {
    name: "orbs",
    ramp: [INK, NAVY, COBALT, SKY],
    accent: { color: CORAL, at: (x, y) => smooth(0.2, 0.185, Math.hypot(x - 1.18, y - 0.36)) * smooth(0.1, 0.2, Math.hypot(x - 1.12, y - 0.3)) * 0.85 },
    value: (x, y) => {
      const ball = (cx, cy, r) => {
        const d = Math.hypot(x - cx, y - cy);
        if (d > r) return 0;
        return clamp01(0.25 + 0.75 * (1 - Math.hypot(x - cx + r * 0.35, y - cy + r * 0.35) / (r * 1.5)));
      };
      return Math.max(ball(0.5, 0.6, 0.34), ball(1.18, 0.36, 0.2), ball(1.22, 0.82, 0.11), 0.06 * (1 - y));
    },
  },
  {
    name: "dunes",
    ramp: [INK, NAVY, BLUE, LILAC],
    value: (x, y) => {
      let shade = clamp01(0.55 - y * 0.6) * 0.6;
      for (let layer = 0; layer < 5; layer++) {
        const crest = 0.34 + layer * 0.14 + 0.07 * Math.sin(x * (2.4 + layer * 0.9) + layer * 1.7);
        if (y > crest) shade = clamp01(0.82 - layer * 0.15 - (y - crest) * 2.4);
      }
      return shade;
    },
  },
  {
    name: "spiral",
    ramp: [INK, NAVY, COBALT, WHITE],
    accent: { color: ORANGE, at: (x, y) => smooth(0.05, 0.035, Math.hypot(x - 0.8, y - 0.5)) },
    value: (x, y) => {
      const dx = x - 0.8;
      const dy = y - 0.5;
      const d = Math.hypot(dx, dy);
      return clamp01(0.5 + 0.5 * Math.sin(Math.atan2(dy, dx) * 3 + d * 20)) * smooth(1.05, 0.08, d);
    },
  },
  {
    name: "lattice",
    ramp: [INK, NAVY, BLUE, SKY],
    value: (x, y) => {
      // A floor grid running to a vanishing point, lit from the horizon.
      const depth = 0.16 / Math.max(0.02, y - 0.38);
      if (y < 0.4) return clamp01(0.5 - Math.abs(y - 0.4) * 1.6) * 0.75;
      const lineX = Math.abs((((x - 0.8) * depth * 5) % 1 + 1) % 1 - 0.5);
      const lineZ = Math.abs(((depth * 5) % 1) - 0.5);
      const line = Math.max(smooth(0.42, 0.5, lineX), smooth(0.4, 0.5, lineZ));
      return clamp01(line * (0.25 + depth * 0.5) + depth * 0.1);
    },
  },
];

function drawField(field) {
  const pixels = Buffer.alloc(COLS * CELL * ROWS * CELL * 3);
  const steps = field.ramp.length - 1;
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const x = ((col + 0.5) / COLS) * 1.6;
      const y = (row + 0.5) / ROWS;
      const threshold = BAYER_8[(row % 8) * 8 + (col % 8)];
      const scaled = clamp01(field.value(x, y)) * steps;
      const base = Math.min(steps - 1, Math.floor(scaled));
      let color = field.ramp[scaled - base > threshold ? base + 1 : base];
      if (field.accent && clamp01(field.accent.at(x, y)) > threshold) color = field.accent.color;
      for (let dy = 0; dy < CELL; dy++) {
        let offset = ((row * CELL + dy) * COLS * CELL + col * CELL) * 3;
        for (let dx = 0; dx < CELL; dx++) {
          pixels[offset++] = color[0];
          pixels[offset++] = color[1];
          pixels[offset++] = color[2];
        }
      }
    }
  }
  return pixels;
}

await mkdir(OUT_DIR, { recursive: true });
for (const [index, field] of FIELDS.entries()) {
  const file = path.join(OUT_DIR, `dither-${index + 1}.png`);
  const info = await sharp(drawField(field), {
    raw: { width: COLS * CELL, height: ROWS * CELL, channels: 3 },
  })
    .png({ palette: true, colours: 8, compressionLevel: 9, effort: 10 })
    .toFile(file);
  console.log(`${path.basename(file)}  ${field.name.padEnd(8)} ${(info.size / 1024).toFixed(1)} KB`);
}
