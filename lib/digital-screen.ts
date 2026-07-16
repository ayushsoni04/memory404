/** Shared types + bitmap font for configurable LED digital screens. */

export type DigitalScreenContentMode = "marquee" | "paint" | "both";

export type DigitalScreenConfig = {
  cols: number;
  rows: number;
  cellSize: number;
  /** Fraction of cell carved out as padding (larger = smaller dots). */
  cellPaddingRatio: number;
  background: string;
  inactive: string;
  active: string;
  framePadding: number;
  frameRadius: number;
  frameBg: string;
  showStroke: boolean;
  glow: boolean;
  glowBlur: number;
  glowHighlight: boolean;
  contentMode: DigitalScreenContentMode;
  marqueeText: string;
  marqueeSpeed: number;
  fps: number;
  charSpacing: number;
  /** Row-major painted cells; length should be cols * rows. */
  painted: boolean[];
};

export type Glyph = { width: number; data: number[] };

const FONT_HEIGHT = 7;

/** 7-row bitmap glyphs for custom marquee text. */
export const DIGITAL_FONT: Record<string, Glyph> = {
  " ": { width: 3, data: [0, 0, 0, 0, 0, 0, 0] },
  A: {
    width: 5,
    data: [0b01110, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001],
  },
  B: {
    width: 5,
    data: [0b11110, 0b10001, 0b10001, 0b11110, 0b10001, 0b10001, 0b11110],
  },
  C: {
    width: 5,
    data: [0b01110, 0b10001, 0b10000, 0b10000, 0b10000, 0b10001, 0b01110],
  },
  D: {
    width: 5,
    data: [0b11110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b11110],
  },
  E: {
    width: 5,
    data: [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b11111],
  },
  F: {
    width: 5,
    data: [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b10000],
  },
  G: {
    width: 5,
    data: [0b01110, 0b10001, 0b10000, 0b10111, 0b10001, 0b10001, 0b01110],
  },
  H: {
    width: 5,
    data: [0b10001, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001],
  },
  I: {
    width: 3,
    data: [0b111, 0b010, 0b010, 0b010, 0b010, 0b010, 0b111],
  },
  J: {
    width: 5,
    data: [0b00111, 0b00010, 0b00010, 0b00010, 0b00010, 0b10010, 0b01100],
  },
  K: {
    width: 5,
    data: [0b10001, 0b10010, 0b10100, 0b11000, 0b10100, 0b10010, 0b10001],
  },
  L: {
    width: 5,
    data: [0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b11111],
  },
  M: {
    width: 5,
    data: [0b10001, 0b11011, 0b10101, 0b10001, 0b10001, 0b10001, 0b10001],
  },
  N: {
    width: 5,
    data: [0b10001, 0b11001, 0b10101, 0b10011, 0b10001, 0b10001, 0b10001],
  },
  O: {
    width: 5,
    data: [0b01110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
  },
  P: {
    width: 5,
    data: [0b11110, 0b10001, 0b10001, 0b11110, 0b10000, 0b10000, 0b10000],
  },
  Q: {
    width: 5,
    data: [0b01110, 0b10001, 0b10001, 0b10001, 0b10101, 0b10010, 0b01101],
  },
  R: {
    width: 5,
    data: [0b11110, 0b10001, 0b10001, 0b11110, 0b10100, 0b10010, 0b10001],
  },
  S: {
    width: 5,
    data: [0b01111, 0b10000, 0b10000, 0b01110, 0b00001, 0b00001, 0b11110],
  },
  T: {
    width: 5,
    data: [0b11111, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100],
  },
  U: {
    width: 5,
    data: [0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
  },
  V: {
    width: 5,
    data: [0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01010, 0b00100],
  },
  W: {
    width: 5,
    data: [0b10001, 0b10001, 0b10001, 0b10101, 0b10101, 0b10101, 0b01010],
  },
  X: {
    width: 5,
    data: [0b10001, 0b10001, 0b01010, 0b00100, 0b01010, 0b10001, 0b10001],
  },
  Y: {
    width: 5,
    data: [0b10001, 0b10001, 0b01010, 0b00100, 0b00100, 0b00100, 0b00100],
  },
  Z: {
    width: 5,
    data: [0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b10000, 0b11111],
  },
  "0": {
    width: 5,
    data: [0b01110, 0b10001, 0b10011, 0b10101, 0b11001, 0b10001, 0b01110],
  },
  "1": {
    width: 3,
    data: [0b010, 0b110, 0b010, 0b010, 0b010, 0b010, 0b111],
  },
  "2": {
    width: 5,
    data: [0b01110, 0b10001, 0b00001, 0b00110, 0b01000, 0b10000, 0b11111],
  },
  "3": {
    width: 5,
    data: [0b01110, 0b10001, 0b00001, 0b00110, 0b00001, 0b10001, 0b01110],
  },
  "4": {
    width: 5,
    data: [0b00010, 0b00110, 0b01010, 0b10010, 0b11111, 0b00010, 0b00010],
  },
  "5": {
    width: 5,
    data: [0b11111, 0b10000, 0b11110, 0b00001, 0b00001, 0b10001, 0b01110],
  },
  "6": {
    width: 5,
    data: [0b01110, 0b10000, 0b10000, 0b11110, 0b10001, 0b10001, 0b01110],
  },
  "7": {
    width: 5,
    data: [0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b01000, 0b01000],
  },
  "8": {
    width: 5,
    data: [0b01110, 0b10001, 0b10001, 0b01110, 0b10001, 0b10001, 0b01110],
  },
  "9": {
    width: 5,
    data: [0b01110, 0b10001, 0b10001, 0b01111, 0b00001, 0b00001, 0b01110],
  },
  ".": { width: 2, data: [0, 0, 0, 0, 0, 0b10, 0b10] },
  ",": { width: 2, data: [0, 0, 0, 0, 0b10, 0b10, 0b100] },
  "!": { width: 1, data: [0b1, 0b1, 0b1, 0b1, 0b1, 0, 0b1] },
  "?": {
    width: 5,
    data: [0b01110, 0b10001, 0b00001, 0b00110, 0b00100, 0, 0b00100],
  },
  "-": { width: 3, data: [0, 0, 0, 0b111, 0, 0, 0] },
  _: { width: 5, data: [0, 0, 0, 0, 0, 0, 0b11111] },
  ":": { width: 1, data: [0, 0b1, 0b1, 0, 0b1, 0b1, 0] },
  "/": {
    width: 5,
    data: [0b00001, 0b00010, 0b00100, 0b01000, 0b10000, 0, 0],
  },
};

export const DEFAULT_SCREEN_CONFIG: DigitalScreenConfig = {
  cols: 48,
  rows: 7,
  cellSize: 10,
  cellPaddingRatio: 0.22,
  background: "#080808",
  inactive: "#292929",
  active: "#e9e9e2",
  framePadding: 4,
  frameRadius: 8,
  frameBg: "#000000",
  showStroke: true,
  glow: true,
  glowBlur: 1.2,
  glowHighlight: true,
  contentMode: "marquee",
  marqueeText: "LOADING",
  marqueeSpeed: -0.55,
  fps: 24,
  charSpacing: 2,
  painted: Array.from({ length: 48 * 7 }, () => false),
};

export function emptyPainted(cols: number, rows: number): boolean[] {
  return Array.from({ length: Math.max(1, cols) * Math.max(1, rows) }, () => false);
}

/** Preserve overlapping paint when the grid size changes. */
export function resizePainted(
  prev: boolean[],
  prevCols: number,
  prevRows: number,
  nextCols: number,
  nextRows: number,
): boolean[] {
  const next = emptyPainted(nextCols, nextRows);
  const copyCols = Math.min(prevCols, nextCols);
  const copyRows = Math.min(prevRows, nextRows);
  for (let r = 0; r < copyRows; r++) {
    for (let c = 0; c < copyCols; c++) {
      next[r * nextCols + c] = prev[r * prevCols + c] ?? false;
    }
  }
  return next;
}

export function buildGlyphs(text: string): Glyph[] {
  const gap = DIGITAL_FONT[" "]!;
  return Array.from(text.toUpperCase()).map((ch) => DIGITAL_FONT[ch] ?? gap);
}

export function measureBitmapWidth(chars: Glyph[], charSpacing: number) {
  return chars.reduce((acc, c) => acc + c.width + charSpacing, 0);
}

export function screenPixelSize(config: DigitalScreenConfig) {
  return {
    width: config.cols * config.cellSize,
    height: config.rows * config.cellSize,
  };
}

export { FONT_HEIGHT };
