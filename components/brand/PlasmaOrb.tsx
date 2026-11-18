"use client";

import { useEffect, useRef } from "react";

/*
 * A lit plasma dome quantized to chunky dithered pixels, after designeer.xyz's
 * logo orb. Two WebGL layers of the same shader:
 *  - base: page-coloured ink, accent-coloured paper;
 *  - glaze: a wider, faster wave in a second colour, screen-blended on top.
 * Hovering plays a 2.2s "sweep": the orb brightens and the paper runs through
 * a colour ramp (mixed in OKLab), the glaze fades to the page colour, then it
 * all eases back.
 */

const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uP_speed, uP_spin, uP_radius, uP_cells, uP_levels, uP_scale,
  uP_plasma, uP_light, uP_rim, uP_gain, uP_contrast;
uniform vec3 uC_ink, uC_paper;

float bayer2(vec2 a) { a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }
float bayer8(vec2 a) { return bayer2(a * 0.25) * 0.0625 + bayer2(a * 0.5) * 0.25 + bayer2(a); }

void main() {
  float cellPx = max(min(uRes.x, uRes.y) / max(uP_cells, 8.0), 1.0);
  vec2 pix = floor(gl_FragCoord.xy / cellPx);
  vec2 cellCentre = (pix + 0.5) * cellPx;
  vec2 suv = (2.0 * cellCentre - uRes) / min(uRes.x, uRes.y);
  vec2 uv = suv / uP_radius;
  float r2 = dot(uv, uv);
  float mask = 1.0 - step(1.0, r2);
  float z = sqrt(max(1.0 - r2, 0.0));
  vec3 n = vec3(uv, z);

  float cr = cos(uP_spin);
  float sr = sin(uP_spin);
  vec3 sp = vec3(n.x * cr - n.z * sr, n.y, n.x * sr + n.z * cr);
  float t = uP_speed;
  float f = uP_scale;
  float v = sin(sp.x * f * 3.1 + t)
    + sin((sp.y * 0.85 + sp.z * 0.4) * f * 3.6 - t * 1.3)
    + sin((sp.x + sp.y + sp.z) * f * 2.2 + t * 0.7);
  vec2 src = 0.55 * vec2(cos(t * 0.5), sin(t * 0.5));
  v += sin(length(uv - src) * f * 5.0 - t * 2.2);
  v *= 0.25;

  float lambert = clamp(dot(n, normalize(vec3(-0.45, 0.55, 0.7))), 0.0, 1.0);
  float fres = pow(1.0 - z, 2.0);
  float lum = (0.5 + 0.5 * v * uP_plasma) * (0.3 + uP_light * lambert) + uP_rim * fres;
  lum = pow(clamp(lum * uP_gain, 0.0, 1.0), uP_contrast);

  float steps = max(uP_levels - 1.0, 1.0);
  float q = clamp(floor(lum * steps + bayer8(pix)) / steps, 0.0, 1.0);
  vec3 col = mix(uC_ink, uC_paper, q);
  gl_FragColor = vec4(col * mask, mask);
}
`;

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

type Params = {
  speed: number;
  spin: number;
  radius: number;
  cells: number;
  levels: number;
  scale: number;
  plasma: number;
  light: number;
  rim: number;
  gain: number;
  contrast: number;
};

const DEFAULTS: Params = {
  speed: 0.5,
  spin: 0.15,
  radius: 1,
  cells: 44,
  levels: 3,
  scale: 1.5,
  plasma: 0.9,
  light: 0.9,
  rim: 0.35,
  gain: 1,
  contrast: 1.1,
};
const BASE: Partial<Params> = { scale: 1.5, spin: 0.15 };
const GLAZE: Partial<Params> = { scale: 2.2, spin: 0.26, speed: 0.8 };
const SEED = 37;

/* ── colour helpers (sRGB hex ⇄ OKLab), as on designeer ───────────────── */

type Lab = [number, number, number];

function toLab(hex: string): Lab {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function fromLab([L, a, b]: Lab): string {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const rgb = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((v) => {
    const c = Math.min(1, Math.max(0, v));
    const e = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
    return Math.round(255 * Math.min(1, Math.max(0, e)))
      .toString(16)
      .padStart(2, "0");
  });
  return `#${rgb.join("")}`;
}

function mixHex(a: string, b: string, t: number): string {
  const A = toLab(a);
  const B = toLab(b);
  return fromLab([0, 1, 2].map((i) => A[i] + (B[i] - A[i]) * t) as Lab);
}

function hexToVec(hex: string): [number, number, number] {
  return [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16) / 255) as [
    number,
    number,
    number,
  ];
}

/** Resolve any CSS colour (var, rgb(), oklch()) to #rrggbb. */
function cssToHex(value: string, fallback: string): string {
  const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  if (!ctx || !value) return fallback;
  ctx.fillStyle = fallback;
  ctx.fillStyle = value;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
  if (a === 0) return fallback;
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

/* ── the hover sweep ──────────────────────────────────────────────────── */

const SWEEP_MS = 2200;
const RAMP = ["#F384FF", "#FF4400", "#FFCB5C", "#E1E1FE", "#00AAFF", "#00166D"];
const RAMP_DARK = [...RAMP].reverse();

/** cubic-bezier(.3,.1,.3,1) solved for y at x. */
function sweepEase(x: number): number {
  const p1x = 0.3, p1y = 0.1, p2x = 0.3, p2y = 1;
  const bez = (t: number, a: number, b: number) =>
    3 * (1 - t) ** 2 * t * a + 3 * (1 - t) * t ** 2 * b + t ** 3;
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  let lo = 0, hi = 1, t = x;
  for (let i = 0; i < 24; i++) {
    if (bez(t, p1x, p2x) < x) lo = t;
    else hi = t;
    t = (lo + hi) / 2;
  }
  return bez(t, p1y, p2y);
}

/** 0 → 1 → 0 over the sweep, with a 12% smooth ramp at each end. */
function envelope(x: number): number {
  const e = Math.min(1, Math.max(0, x));
  const v = e < 0.12 ? e / 0.12 : e > 0.88 ? (1 - e) / 0.12 : 1;
  return v * v * (3 - 2 * v);
}

function rampColour(x: number, dark: boolean, accent: string): string {
  const stops = dark ? RAMP_DARK : RAMP;
  const pos = ((Math.min(1 - 1e-9, Math.max(0, (x - 0.12) / 0.76)) % 1) + 1) % 1 * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(pos));
  return mixHex(accent, mixHex(stops[i], stops[i + 1], pos - i), envelope(x));
}

/* ── one WebGL layer ──────────────────────────────────────────────────── */

type LayerState = {
  params: Params;
  ink: string;
  paper: string;
};

function startLayer(canvas: HTMLCanvasElement, read: () => LayerState, maxDpr: number) {
  const gl = canvas.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: false });
  if (!gl) return null;
  const compile = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  };
  const vs = compile(gl.VERTEX_SHADER, VERT);
  const fs = compile(gl.FRAGMENT_SHADER, FRAG);
  const prog = gl.createProgram()!;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "aPos");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const u = (name: string) => gl.getUniformLocation(prog, name);
  const keys = Object.keys(DEFAULTS) as (keyof Params)[];
  const uParams = Object.fromEntries(keys.map((k) => [k, u(`uP_${k}`)])) as Record<
    keyof Params,
    WebGLUniformLocation | null
  >;
  const uRes = u("uRes");
  const uInk = u("uC_ink");
  const uPaper = u("uC_paper");

  // Speed and spin are integrated clocks, so changing them never jumps the phase.
  let clockSpeed = SEED;
  let clockSpin = SEED * 0.1;

  const resize = () => {
    const dpr = Math.min(maxDpr, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
  };

  const draw = (dt: number) => {
    const { params, ink, paper } = read();
    clockSpeed += params.speed * dt;
    clockSpin += params.spin * dt;
    resize();
    gl.uniform2f(uRes, canvas.width, canvas.height);
    for (const k of keys) {
      const value = k === "speed" ? clockSpeed : k === "spin" ? clockSpin : params[k];
      gl.uniform1f(uParams[k], value);
    }
    gl.uniform3fv(uInk, hexToVec(ink));
    gl.uniform3fv(uPaper, hexToVec(paper));
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  const dispose = () => {
    gl.deleteProgram(prog);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    gl.deleteBuffer(buf);
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  };
  return { draw, dispose };
}

type Props = {
  /** CSS pixels. */
  size?: number;
  /** Paper colour of the base layer. Default: a soft white for the mono UI. */
  accent?: string;
  /** Paper colour of the screen-blended glaze. */
  glaze?: string;
  className?: string;
};

export function PlasmaOrb({
  size = 84,
  accent = "#d9dbe2",
  glaze = "#8a8d98",
  className = "",
}: Props) {
  const baseRef = useRef<HTMLCanvasElement | null>(null);
  const glazeRef = useRef<HTMLCanvasElement | null>(null);
  const sweepStart = useRef<number | null>(null);

  useEffect(() => {
    const base = baseRef.current;
    const top = glazeRef.current;
    if (!base || !top) return;
    const rootStyle = getComputedStyle(document.documentElement);
    const page = cssToHex(rootStyle.getPropertyValue("--background").trim(), "#0b0b0c");
    const dark = true;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    let x: number | null = null; // eased sweep progress, or null when idle
    const readBase = (): LayerState => {
      const h = x === null ? 0 : envelope(x);
      return {
        params: h > 0 ? { ...DEFAULTS, ...BASE, gain: 1 + 1.7 * h, contrast: 1.1 - 0.4 * h } : { ...DEFAULTS, ...BASE },
        ink: page,
        paper: x === null ? accent : rampColour(x, dark, accent),
      };
    };
    const readGlaze = (): LayerState => {
      const h = x === null ? 0 : envelope(x);
      return {
        params: { ...DEFAULTS, ...GLAZE },
        ink: page,
        paper: h > 0 ? mixHex(glaze, page, h) : glaze,
      };
    };

    const a = startLayer(base, readBase, 2);
    const b = startLayer(top, readGlaze, 2);
    if (!a || !b) {
      a?.dispose();
      b?.dispose();
      return;
    }

    let raf = 0;
    let last = performance.now();
    let visible = true;
    const io = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true;
    });
    io.observe(base);

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!visible || document.hidden) {
        last = now;
        return;
      }
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (sweepStart.current !== null) {
        const t = Math.min(1, (now - sweepStart.current) / SWEEP_MS);
        x = sweepEase(t);
        if (t >= 1) {
          sweepStart.current = null;
          x = null;
        }
      }
      a.draw(dt);
      b.draw(dt);
    };

    if (reduce) {
      a.draw(0);
      b.draw(0);
    } else {
      raf = requestAnimationFrame(frame);
    }

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      a.dispose();
      b.dispose();
    };
  }, [accent, glaze]);

  return (
    <div
      aria-hidden
      className={`relative isolate shrink-0 overflow-hidden rounded-full ${className}`}
      style={{ width: size, height: size }}
      onPointerEnter={() => {
        if (sweepStart.current === null && !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
          sweepStart.current = performance.now();
        }
      }}
    >
      <canvas ref={baseRef} className="absolute inset-0 block size-full" />
      <canvas ref={glazeRef} className="absolute inset-0 block size-full" style={{ mixBlendMode: "screen" }} />
    </div>
  );
}
