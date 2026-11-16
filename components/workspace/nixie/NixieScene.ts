import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import {
  CATHODE_STACK,
  DEFAULT_NIXIE_TIMING,
  nixieDigitAt,
  nixieDigits,
  nixieDuration,
  planNixieTransition,
  type NixieMode,
  type NixieTiming,
  type NixieTrack,
} from "@/lib/nixie";

export type NixieOptions = {
  tubes: number;
  leadingZeros: boolean;
  mode: NixieMode;
  /** Bloom strength, 0–3. */
  glow: number;
  timing: NixieTiming;
};

/* Capsule housing, front-facing, in scene units. */
const CASE_W = 0.78;
const CASE_H = 1.62;
const CASE_D = 0.24;
const CASE_R = 0.2;
/** Recessed amber window inside the housing. */
const WIN_W = 0.54;
const WIN_H = 1.06;
const WIN_R = 0.14;
const SPACING = 0.9;
/** Extra space between groups of three digits, where the colon sits. */
const GROUP_GAP = 0.4;
const FRONT = CASE_D / 2;
export const NIXIE_BACKGROUND = "#0a0a0c";
/** Amber neon, pushed past 1 so bloom catches it. */
const HOT = new THREE.Color(1.0, 0.52, 0.16);
/** Unlit cathode wire, just visible behind the grid. */
const COLD = new THREE.Color(0.05, 0.032, 0.02);
/** Window when its digit is dark, and fully lit. */
const WINDOW_DARK = new THREE.Color(0.035, 0.022, 0.014);
const WINDOW_LIT = new THREE.Color(0.42, 0.2, 0.06);

type Tube = {
  root: THREE.Group;
  cathodes: THREE.MeshBasicMaterial[]; // indexed by digit 0–9
  intensity: Float32Array; // 0–1 per digit
  windowMat: THREE.MeshBasicMaterial;
  light: THREE.PointLight;
};

function roundedRect(w: number, h: number, r: number): THREE.Shape {
  const x = -w / 2;
  const y = -h / 2;
  const s = new THREE.Shape();
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

/** ShapeGeometry with UVs mapped 0–1 across its bounds, so textures fit. */
function shapePlane(w: number, h: number, r: number): THREE.ShapeGeometry {
  const geo = new THREE.ShapeGeometry(roundedRect(w, h, r), 12);
  const pos = geo.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = pos.getX(i) / w + 0.5;
    uv[i * 2 + 1] = pos.getY(i) / h + 0.5;
  }
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return geo;
}

function canvasTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  draw(ctx);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** Monospace numeral, slightly soft so it reads as glowing wire. */
function digitTexture(digit: number): THREE.CanvasTexture {
  return canvasTexture(256, 400, (ctx) => {
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "500 300px ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Consolas, monospace";
    ctx.shadowColor = "#fff";
    ctx.shadowBlur = 6;
    ctx.fillText(String(digit), 128, 212);
  });
}

/** The amber window: brightest in the middle, falling off to the rim. */
function windowTexture(): THREE.CanvasTexture {
  return canvasTexture(128, 256, (ctx) => {
    const g = ctx.createRadialGradient(64, 128, 8, 64, 128, 150);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(0.45, "#b8b8b8");
    g.addColorStop(1, "#1e1e1e");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 256);
  });
}

/** Fine square grid laid over the digits. */
function gridTexture(): THREE.CanvasTexture {
  const texture = canvasTexture(256, 512, (ctx) => {
    ctx.clearRect(0, 0, 256, 512);
    ctx.strokeStyle = "rgba(0,0,0,0.62)";
    ctx.lineWidth = 2;
    const step = 11;
    for (let x = 0; x <= 256; x += step) {
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, 512);
      ctx.stroke();
    }
    for (let y = 0; y <= 512; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(256, y + 0.5);
      ctx.stroke();
    }
  });
  texture.colorSpace = THREE.NoColorSpace;
  return texture;
}

/**
 * A row of nixie tubes in dark steel capsules. Imperative three.js so the
 * React side only passes a number and options.
 */
export class NixieScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(22, 1, 0.1, 100);
  private composer: EffectComposer;
  private bloom: UnrealBloomPass;
  private board = new THREE.Group();
  private tubes: Tube[] = [];
  private separators: THREE.MeshBasicMaterial[] = [];
  private digitTextures: THREE.CanvasTexture[];
  private windowTex: THREE.CanvasTexture;
  private gridTex: THREE.CanvasTexture;
  private disposables: { dispose: () => void }[] = [];
  private resizeObserver: ResizeObserver;
  private raf = 0;
  private lastFrame = 0;
  private tracks: NixieTrack[] = [];
  private trackStart = 0;
  private trackEnd = 0;
  private pointer = { x: 0, y: 0 };
  private opts: NixieOptions;
  private value = 0;
  private reducedMotion: boolean;
  private onSettle?: () => void;

  constructor(
    private container: HTMLElement,
    options: Partial<NixieOptions> & { value?: number; onSettle?: () => void } = {},
  ) {
    this.opts = {
      tubes: options.tubes ?? 6,
      leadingZeros: options.leadingZeros ?? true,
      mode: options.mode ?? "slot",
      glow: options.glow ?? 0.7,
      timing: options.timing ?? DEFAULT_NIXIE_TIMING,
    };
    this.value = options.value ?? 0;
    this.onSettle = options.onSettle;
    this.reducedMotion =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;
    this.renderer.domElement.style.display = "block";
    this.renderer.domElement.style.width = "100%";
    this.renderer.domElement.style.height = "100%";
    container.appendChild(this.renderer.domElement);

    this.scene.background = new THREE.Color(NIXIE_BACKGROUND);
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const room = new RoomEnvironment();
    const envTarget = pmrem.fromScene(room, 0.04);
    this.scene.environment = envTarget.texture;
    this.scene.environmentIntensity = 0.55;
    room.dispose();
    pmrem.dispose();
    this.disposables.push(envTarget);

    // Cool key light from above: the blue-grey sheen on the steel.
    const key = new THREE.DirectionalLight(0xbfd0ff, 0.9);
    key.position.set(-2, 6, 5);
    this.scene.add(key);
    this.scene.add(new THREE.AmbientLight(0x8090b0, 0.12));
    this.scene.add(this.board);

    this.digitTextures = Array.from({ length: 10 }, (_, d) => digitTexture(d));
    this.windowTex = windowTexture();
    this.gridTex = gridTexture();
    this.disposables.push(...this.digitTextures, this.windowTex, this.gridTex);

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), this.opts.glow, 0.4, 0.72);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    this.build();
    this.resetTo(this.value);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    container.addEventListener("pointermove", this.onPointerMove);
    container.addEventListener("pointerleave", this.onPointerLeave);
    this.resize();
    this.lastFrame = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  /** Shows a new number, animated with the current mode. */
  setValue(value: number, animate = true) {
    this.value = value;
    const next = nixieDigits(value, this.opts.tubes, this.opts.leadingZeros);
    const now = performance.now();
    const from = this.tubes.map((_, i) => nixieDigitAt(this.tracks[i] ?? [], now - this.trackStart));
    const mode = !animate || this.reducedMotion ? "instant" : this.opts.mode;
    this.tracks = planNixieTransition(from, next, mode, this.opts.timing);
    this.trackStart = now;
    this.trackEnd = now + nixieDuration(this.tracks);
  }

  /** Runs the current mode again from a different start, to preview it. */
  replay(from: number) {
    const target = this.value;
    this.resetTo(from);
    this.setValue(target);
  }

  setOptions(next: Partial<NixieOptions>) {
    const rebuild =
      (next.tubes !== undefined && next.tubes !== this.opts.tubes) ||
      (next.leadingZeros !== undefined && next.leadingZeros !== this.opts.leadingZeros);
    this.opts = { ...this.opts, ...next };
    this.bloom.strength = this.opts.glow;
    if (rebuild) {
      this.build();
      this.resetTo(this.value);
      this.resize();
    }
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.resizeObserver.disconnect();
    this.container.removeEventListener("pointermove", this.onPointerMove);
    this.container.removeEventListener("pointerleave", this.onPointerLeave);
    this.clearBoard();
    for (const d of this.disposables) d.dispose();
    this.composer.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  /** Lights `value` with no transition. */
  private resetTo(value: number) {
    const digits = nixieDigits(value, this.opts.tubes, this.opts.leadingZeros);
    this.tracks = digits.map((digit) => [{ at: 0, digit }]);
    this.trackStart = performance.now();
    this.tubes.forEach((tube, i) => {
      tube.intensity.fill(0);
      const d = digits[i];
      if (d !== null && d !== undefined) tube.intensity[d] = 1;
    });
  }

  private onPointerMove = (event: PointerEvent) => {
    const rect = this.container.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = ((event.clientY - rect.top) / rect.height) * 2 - 1;
  };

  private onPointerLeave = () => {
    this.pointer.x = 0;
    this.pointer.y = 0;
  };

  /** Number of group gaps before tube k, counted from the right in threes. */
  private gapsBefore(k: number): number {
    const n = this.opts.tubes;
    return Math.floor((n - 1) / 3) - Math.floor((n - 1 - k) / 3);
  }

  private tubeX(i: number): number {
    const n = this.opts.tubes;
    const x = i * SPACING + this.gapsBefore(i) * GROUP_GAP;
    const width = (n - 1) * SPACING + this.gapsBefore(n - 1) * GROUP_GAP;
    return x - width / 2;
  }

  private clearBoard() {
    this.board.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
        materials.forEach((m) => m.dispose());
      }
    });
    this.board.clear();
    this.tubes = [];
    this.separators = [];
  }

  private build() {
    this.clearBoard();
    const n = this.opts.tubes;

    const caseGeo = new RoundedBoxGeometry(CASE_W, CASE_H, CASE_D, 6, CASE_R);
    const bezelGeo = shapePlane(WIN_W + 0.05, WIN_H + 0.05, WIN_R + 0.025);
    const windowGeo = shapePlane(WIN_W, WIN_H, WIN_R);
    const digitGeo = new THREE.PlaneGeometry(WIN_W * 0.82, WIN_W * 0.82 * (400 / 256));
    const glassGeo = shapePlane(WIN_W, WIN_H, WIN_R);

    for (let i = 0; i < n; i++) {
      const root = new THREE.Group();
      root.position.x = this.tubeX(i);
      this.board.add(root);

      // Dark steel capsule with a cool sheen along its rounded edges.
      const housing = new THREE.Mesh(
        caseGeo,
        new THREE.MeshPhysicalMaterial({
          color: 0x1b2232,
          metalness: 0.75,
          roughness: 0.32,
          clearcoat: 0.6,
          clearcoatRoughness: 0.25,
        }),
      );
      root.add(housing);

      // Recess: a darker rim around the window.
      const bezel = new THREE.Mesh(
        bezelGeo,
        new THREE.MeshStandardMaterial({ color: 0x07080b, roughness: 0.6, metalness: 0.3 }),
      );
      bezel.position.z = FRONT + 0.001;
      root.add(bezel);

      // Amber window behind the cathodes; brightens with the lit digit.
      const windowMat = new THREE.MeshBasicMaterial({
        map: this.windowTex,
        color: WINDOW_DARK.clone(),
        toneMapped: false,
      });
      const win = new THREE.Mesh(windowGeo, windowMat);
      win.position.z = FRONT + 0.002;
      root.add(win);

      // Ten cathodes stacked front to back.
      const cathodes: THREE.MeshBasicMaterial[] = new Array(10);
      CATHODE_STACK.forEach((digit, depth) => {
        const material = new THREE.MeshBasicMaterial({
          map: this.digitTextures[digit],
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          toneMapped: false,
          color: COLD.clone(),
        });
        const plate = new THREE.Mesh(digitGeo, material);
        plate.position.set(0, -0.01, FRONT + 0.003 + (CATHODE_STACK.length - depth) * 0.0004);
        plate.renderOrder = 2;
        root.add(plate);
        cathodes[digit] = material;
      });

      // The grid in front of the cathodes.
      const grid = new THREE.Mesh(
        windowGeo,
        new THREE.MeshBasicMaterial({
          map: this.gridTex,
          transparent: true,
          depthWrite: false,
          toneMapped: false,
        }),
      );
      grid.position.z = FRONT + 0.009;
      grid.renderOrder = 3;
      root.add(grid);

      // Glass over the window: reflections only.
      const glass = new THREE.Mesh(
        glassGeo,
        new THREE.MeshPhysicalMaterial({
          color: 0xffffff,
          roughness: 0.08,
          metalness: 0,
          transparent: true,
          opacity: 0.07,
          clearcoat: 1,
          depthWrite: false,
          envMapIntensity: 1.4,
        }),
      );
      glass.position.z = FRONT + 0.012;
      glass.renderOrder = 4;
      root.add(glass);

      // A little amber spill onto the steel around the window.
      const light = new THREE.PointLight(0xff8a2a, 0, 0.9, 2);
      light.position.set(0, 0, FRONT + 0.12);
      root.add(light);

      this.tubes.push({ root, cathodes, intensity: new Float32Array(10), windowMat, light });
    }

    // Colon dots in each group gap.
    const dotGeo = new THREE.CircleGeometry(0.028, 20);
    for (let i = 1; i < n; i++) {
      if (this.gapsBefore(i) === this.gapsBefore(i - 1)) continue;
      const x = (this.tubeX(i) + this.tubeX(i - 1)) / 2;
      for (const y of [0.12, -0.12]) {
        const material = new THREE.MeshBasicMaterial({ color: HOT.clone(), toneMapped: false });
        const dot = new THREE.Mesh(dotGeo, material);
        dot.position.set(x, y - 0.04, FRONT);
        this.board.add(dot);
        this.separators.push(material);
      }
    }
  }

  private resize() {
    const { clientWidth: w, clientHeight: h } = this.container;
    if (w === 0 || h === 0) return;
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    this.bloom.resolution.set(w, h);
    this.camera.aspect = w / h;
    // Fit the whole row, with room on the sides.
    const span = this.tubeX(this.opts.tubes - 1) - this.tubeX(0) + CASE_W + 0.9;
    const vFov = THREE.MathUtils.degToRad(this.camera.fov);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * this.camera.aspect);
    const byWidth = span / 2 / Math.tan(hFov / 2);
    const byHeight = (CASE_H + 0.7) / 2 / Math.tan(vFov / 2);
    const distance = Math.max(byWidth, byHeight);
    this.camera.position.set(0, 0.18, distance);
    this.camera.lookAt(0, 0, 0);
    this.camera.updateProjectionMatrix();
  }

  private frame = (now: number) => {
    this.raf = requestAnimationFrame(this.frame);
    const dt = Math.min(64, now - this.lastFrame);
    this.lastFrame = now;
    const elapsed = now - this.trackStart;

    // Cathodes strike fast and cool slowly; afterglow mode lingers longer.
    const rise = 1 - Math.exp(-dt / 14);
    const fall = Math.exp(-dt / (this.opts.mode === "afterglow" ? 190 : 46));

    this.tubes.forEach((tube, i) => {
      const lit = nixieDigitAt(this.tracks[i] ?? [], elapsed);
      let total = 0;
      for (let d = 0; d < 10; d++) {
        const target = d === lit ? 1 : 0;
        const cur = tube.intensity[d];
        const next = target > cur ? cur + (1 - cur) * rise : cur * fall;
        tube.intensity[d] = next;
        total += next;
      }
      // A faint, uneven shimmer, a little different per tube.
      const flicker = 1 + Math.sin(now * 0.031 + i * 1.7) * 0.012 + (Math.random() - 0.5) * 0.02;
      for (let d = 0; d < 10; d++) {
        const k = tube.intensity[d] * flicker;
        tube.cathodes[d].color.setRGB(
          COLD.r + HOT.r * k * 2.1,
          COLD.g + HOT.g * k * 2.1,
          COLD.b + HOT.b * k * 2.1,
        );
      }
      const glow = Math.min(1, total) * flicker;
      tube.windowMat.color.copy(WINDOW_DARK).lerp(WINDOW_LIT, glow);
      tube.light.intensity = glow * 0.5;
    });

    // Colons breathe slowly.
    const pulse = 0.55 + Math.sin(now * 0.0025) * 0.08;
    for (const m of this.separators) m.color.setRGB(HOT.r * pulse, HOT.g * pulse, HOT.b * pulse);

    // Gentle parallax toward the pointer.
    const targetY = this.reducedMotion ? 0 : this.pointer.x * 0.1;
    const targetX = this.reducedMotion ? 0 : this.pointer.y * 0.05;
    this.board.rotation.y += (targetY - this.board.rotation.y) * 0.06;
    this.board.rotation.x += (targetX - this.board.rotation.x) * 0.06;

    this.composer.render();

    if (this.trackEnd && now > this.trackEnd + 120) {
      this.trackEnd = 0;
      this.onSettle?.();
    }
  };
}
