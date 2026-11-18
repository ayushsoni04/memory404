import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/*
 * A small procedural 3D brain for the wordmark: no model file. Two
 * hemispheres are folded sphere meshes (domain-warped Perlin ridges cut the
 * sulci, plus a lateral fissure), with a striped cerebellum and a brainstem.
 * Sulci are shaded darker through vertex colours so the folds still read at
 * logo size. Loaded on demand by BrainMark, so three.js stays out of the
 * first bundle.
 */

const GYRUS = new THREE.Color("#ece8ec");
const SULCUS = new THREE.Color("#57525f");

function smoothstep(a: number, b: number, x: number) {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
}

/** Classic 3D Perlin noise, seeded so the folds are the same every load. */
function createNoise3(seed: number) {
  const base = Array.from({ length: 256 }, (_, i) => i);
  let s = seed;
  const rand = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [base[i], base[j]] = [base[j], base[i]];
  }
  const p = new Uint8Array(512);
  for (let i = 0; i < 512; i++) p[i] = base[i & 255];

  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (a: number, b: number, t: number) => a + t * (b - a);
  const grad = (h: number, x: number, y: number, z: number) => {
    const hh = h & 15;
    const u = hh < 8 ? x : y;
    const v = hh < 4 ? y : hh === 12 || hh === 14 ? x : z;
    return ((hh & 1) === 0 ? u : -u) + ((hh & 2) === 0 ? v : -v);
  };

  return (x: number, y: number, z: number) => {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    z -= Math.floor(z);
    const u = fade(x);
    const v = fade(y);
    const w = fade(z);
    const A = p[X] + Y;
    const AA = p[A] + Z;
    const AB = p[A + 1] + Z;
    const B = p[X + 1] + Y;
    const BA = p[B] + Z;
    const BB = p[B + 1] + Z;
    return lerp(
      lerp(
        lerp(grad(p[AA], x, y, z), grad(p[BA], x - 1, y, z), u),
        lerp(grad(p[AB], x, y - 1, z), grad(p[BB], x - 1, y - 1, z), u),
        v,
      ),
      lerp(
        lerp(grad(p[AA + 1], x, y, z - 1), grad(p[BA + 1], x - 1, y, z - 1), u),
        lerp(grad(p[AB + 1], x, y - 1, z - 1), grad(p[BB + 1], x - 1, y - 1, z - 1), u),
        v,
      ),
      w,
    );
  };
}

type Noise = ReturnType<typeof createNoise3>;

/** An indexed unit sphere, so computed normals come out smooth. */
function unitSphere(detail: number) {
  const geo = new THREE.IcosahedronGeometry(1, detail);
  geo.deleteAttribute("normal");
  geo.deleteAttribute("uv");
  return mergeVertices(geo);
}

/** Mirroring flips winding; swap two corners of every face to undo it. */
function flipWinding(geo: THREE.BufferGeometry) {
  const index = geo.getIndex();
  if (!index) return;
  for (let i = 0; i < index.count; i += 3) {
    const b = index.getX(i + 1);
    index.setX(i + 1, index.getX(i + 2));
    index.setX(i + 2, b);
  }
  index.needsUpdate = true;
}

/** One cerebral hemisphere. +x is lateral for side 1; side -1 is mirrored. */
function hemisphere(side: 1 | -1, noise: Noise) {
  const geo = unitSphere(64);
  const pos = geo.getAttribute("position") as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  // Each side gets its own folds, like a real brain.
  const o = side > 0 ? 0 : 31.7;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);

    // Gyri: domain-warped noise; its zero set is a network of wormy grooves.
    const wx = noise(x * 1.4 + o, y * 1.4, z * 1.4) * 0.45;
    const wy = noise(x * 1.4 + o + 5.2, y * 1.4 + 1.3, z * 1.4) * 0.45;
    const wz = noise(x * 1.4 + o + 9.1, y * 1.4, z * 1.4 + 2.7) * 0.45;
    const v = noise((x + wx) * 3.7 + o, (y + wy) * 3.7, (z + wz) * 3.7);
    // Wide, soft grooves so the folds stay rounded instead of terraced.
    const groove = 1 - smoothstep(0.0, 0.2, Math.abs(v));

    // Lateral (Sylvian) fissure, running up and back on the outer face.
    const fd = y - (-0.1 + 0.3 * z);
    const fissure =
      Math.exp(-(fd * fd) / 0.004) *
      smoothstep(0.15, 0.55, x) *
      smoothstep(-0.45, -0.15, z) *
      smoothstep(0.8, 0.5, z);

    const depth = Math.max(groove, fissure);
    const medial = smoothstep(0.1, -0.35, x);
    const disp = (0.03 - 0.07 * depth + noise(x * 9 + o, y * 9, z * 9) * 0.008) * (1 - 0.6 * medial);

    // Ellipsoid, flat on the inner face, narrower at the front.
    let ex = x < 0 ? x * 0.12 : x * 0.5;
    let ey = y * 0.72 * (1 - 0.12 * Math.max(z, 0));
    const ez = z;
    // Temporal lobe: a bulge down and out at the lateral middle.
    const temporal = smoothstep(0.1, 0.6, x) * smoothstep(0.05, -0.4, y) * Math.exp(-((z - 0.1) ** 2) / 0.22);
    ey -= 0.12 * temporal;
    ex += 0.05 * temporal;
    // Flatter underside.
    if (ey < -0.3) ey = -0.3 + (ey + 0.3) * 0.45;

    pos.setXYZ(i, side * (ex + x * disp + 0.135), ey + y * disp, ez + z * disp);

    c.copy(SULCUS).lerp(GYRUS, 1 - depth * 0.85 - medial * 0.2);
    colors.set([c.r, c.g, c.b], i * 3);
  }

  if (side < 0) flipWinding(geo);
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

/** The cerebellum: two lobes with fine horizontal folia. */
function cerebellum(noise: Noise) {
  const geo = unitSphere(24);
  const pos = geo.getAttribute("position") as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const s = Math.sin(y * 24 + noise(x * 3, y * 3, z * 3) * 2.5);
    const groove = smoothstep(0.55, 1, -s);
    const disp = 0.012 - 0.03 * groove;
    const pinch = 1 - 0.3 * Math.exp(-(x * x) / 0.02);
    pos.setXYZ(i, x * 0.4 + x * disp, (y * 0.21 + y * disp) * pinch, z * 0.28 + z * disp);
    c.copy(SULCUS).lerp(GYRUS, 1 - groove * 0.8 - 0.08);
    colors.set([c.r, c.g, c.b], i * 3);
  }

  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

export type BrainScene = {
  resize: (width: number, height: number) => void;
  /** Draws one frame. `spin` false holds the brain still (reduced motion). */
  frame: (now: number, spin: boolean) => void;
  /** Lift and tilt, then settle. */
  pulse: (now: number) => void;
  dispose: () => void;
};

const PULSE_MS = 1150;

export function createBrainScene(canvas: HTMLCanvasElement): BrainScene {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: "low-power",
  });
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 20);
  camera.position.set(0, 0.5, 4.4);
  camera.lookAt(0, 0, 0);

  scene.add(new THREE.AmbientLight(0xffffff, 0.45));
  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(2, 3, 4);
  scene.add(key);
  // A cool rim from behind, like the page's sky.
  const rim = new THREE.DirectionalLight(0x9cbcff, 2);
  rim.position.set(-3, 1.5, -3.5);
  scene.add(rim);

  const noise = createNoise3(7);
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0 });
  const stemMaterial = new THREE.MeshStandardMaterial({ color: 0xb9b4bc, roughness: 0.7 });

  const geometries = [hemisphere(1, noise), hemisphere(-1, noise), cerebellum(noise)];
  const stemGeo = new THREE.CylinderGeometry(0.085, 0.065, 0.26, 16);

  // tilt (tap lift/tilt) > spin (idle turn) > brain (centred meshes)
  const tilt = new THREE.Group();
  const spin = new THREE.Group();
  const brain = new THREE.Group();
  scene.add(tilt);
  tilt.add(spin);
  spin.add(brain);
  brain.position.y = 0.04;

  brain.add(new THREE.Mesh(geometries[0], material));
  brain.add(new THREE.Mesh(geometries[1], material));
  const cb = new THREE.Mesh(geometries[2], material);
  cb.position.set(0, -0.36, -0.6);
  cb.rotation.x = -0.25;
  brain.add(cb);
  const stem = new THREE.Mesh(stemGeo, stemMaterial);
  stem.position.set(0, -0.44, -0.3);
  stem.rotation.x = 0.35;
  brain.add(stem);

  let angle = 0.7;
  let last = 0;
  let pulseAt = -Infinity;

  return {
    resize(width, height) {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    },
    frame(now, doSpin) {
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
      last = now;
      const p = (now - pulseAt) / PULSE_MS;
      // Rises fast, hangs, settles: a skewed sine bump.
      const env = p >= 0 && p < 1 ? Math.sin(Math.PI * Math.pow(p, 0.7)) : 0;
      if (doSpin) angle += dt * (0.55 + 2.2 * env);
      spin.rotation.y = angle;
      tilt.position.y = 0.12 * env;
      tilt.rotation.z = -0.22 * env;
      tilt.rotation.x = -0.14 * env;
      renderer.render(scene, camera);
    },
    pulse(now) {
      pulseAt = now;
    },
    dispose() {
      for (const g of geometries) g.dispose();
      stemGeo.dispose();
      material.dispose();
      stemMaterial.dispose();
      renderer.dispose();
    },
  };
}
