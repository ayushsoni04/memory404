import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/*
 * A small procedural 3D brain for the wordmark: no model file. Two
 * hemispheres are folded sphere meshes (domain-warped Perlin ridges cut the
 * sulci, plus a lateral fissure), with a striped cerebellum and a brainstem.
 * It is drawn as a pencil sketch rather than shaded: the silhouette and the
 * sulci are inked as lines, shadowed sides get diagonal hatching, and the
 * strokes "boil" a few times a second like hand-drawn animation. The fill is
 * transparent but still writes depth, so far-side lines stay hidden. Loaded
 * on demand by BrainMark, so three.js stays out of the first bundle.
 */

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
  const depths = new Float32Array(pos.count);
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

    depths[i] = depth;
  }

  if (side < 0) flipWinding(geo);
  geo.setAttribute("depth", new THREE.BufferAttribute(depths, 1));
  geo.computeVertexNormals();
  return geo;
}

/** The cerebellum: two lobes with fine horizontal folia. */
function cerebellum(noise: Noise) {
  const geo = unitSphere(24);
  const pos = geo.getAttribute("position") as THREE.BufferAttribute;
  const depths = new Float32Array(pos.count);

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const s = Math.sin(y * 24 + noise(x * 3, y * 3, z * 3) * 2.5);
    const groove = smoothstep(0.55, 1, -s);
    const disp = 0.012 - 0.03 * groove;
    const pinch = 1 - 0.3 * Math.exp(-(x * x) / 0.02);
    pos.setXYZ(i, x * 0.4 + x * disp, (y * 0.21 + y * disp) * pinch, z * 0.28 + z * disp);
    depths[i] = groove;
  }

  geo.setAttribute("depth", new THREE.BufferAttribute(depths, 1));
  geo.computeVertexNormals();
  return geo;
}

/**
 * Glitch modes. The brain idles as a sketch, then at random moments snaps
 * into one of these for a split second and snaps back, like a bad signal.
 */
const GLITCH = {
  none: 0,
  neon: 1, // strokes flip to neon
  tear: 2, // horizontal slices jump sideways
  scan: 3, // the inside fills with neon scanlines
  noise: 4, // the inside turns to corrupted data blocks
  invert: 5, // solid neon body, strokes knocked out
  split: 6, // RGB split: magenta and cyan copies, offset
  crunch: 7, // vertices snap to a coarse grid
  blackout: 8, // the signal drops for a frame or two
} as const;
const GLITCH_MODES = 8;

/** Cyberpunk neons, plus the app's own orange. */
const NEONS = ["#00f0ff", "#ff2bd6", "#f5ff3b", "#7cff6b", "#ee6a3a"].map(
  (hex) => new THREE.Color(hex),
);

const SKETCH_VERTEX = /* glsl */ `
  attribute float depth;
  uniform float uGlitch;
  uniform float uSeed;
  varying float vDepth;
  varying vec3 vNormal;
  varying vec3 vView;

  float vhash(float x) {
    return fract(sin(x * 91.7 + uSeed * 47.3) * 43758.5453);
  }

  void main() {
    vDepth = depth;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vView = -mv.xyz;
    gl_Position = projectionMatrix * mv;

    if (abs(uGlitch - 2.0) < 0.5) {
      // Tear: cut the screen into bands and throw some of them sideways.
      float band = floor((gl_Position.y / gl_Position.w) * 7.0 + uSeed * 13.0);
      float h = vhash(band);
      float shift = h > 0.5 ? (h - 0.5) * 0.7 * sign(vhash(band + 3.1) - 0.5) : 0.0;
      gl_Position.x += shift * gl_Position.w;
    } else if (abs(uGlitch - 7.0) < 0.5) {
      // Crunch: snap every vertex to a coarse screen grid.
      vec2 ndc = gl_Position.xy / gl_Position.w;
      ndc = floor(ndc * 7.0 + 0.5) / 7.0;
      gl_Position.xy = ndc * gl_Position.w;
    }
  }
`;

const SKETCH_FRAGMENT = /* glsl */ `
  uniform vec3 uInk;
  uniform float uBoil;
  uniform float uScale;
  uniform float uGlitch;
  uniform float uSeed;
  uniform vec3 uNeon;
  uniform vec3 uNeon2;
  uniform vec3 uChannel;
  varying float vDepth;
  varying vec3 vNormal;
  varying vec3 vView;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  void main() {
    vec3 n = normalize(vNormal);
    vec3 v = normalize(vView);
    float ndv = clamp(dot(n, v), 0.0, 1.0);
    // Pencil grain, re-rolled on each boil step so strokes shimmer.
    vec2 cell = floor(gl_FragCoord.xy / uScale);
    float grain = hash(cell + uBoil * 17.0);

    // Contour: where the surface turns away from the eye.
    float contour = 1.0 - smoothstep(0.16, 0.34, ndv + (grain - 0.5) * 0.08);

    // Sulci: the groove field, cut at a level into thin wobbly lines.
    float d = vDepth + (grain - 0.5) * 0.18;
    float fw = fwidth(vDepth) + 1e-4;
    float groove = smoothstep(0.55 - fw, 0.55 + fw, d);

    // Hatching on the side away from the light, at a slant like a right hand.
    float light = max(dot(n, normalize(vec3(0.55, 0.75, 0.45))), 0.0);
    vec2 fc = gl_FragCoord.xy / uScale + vec2(uBoil * 1.7, 0.0);
    float stripe = abs(fract((fc.x + fc.y * 0.7) / 3.2) - 0.5) * 2.0;
    float hatch = (1.0 - smoothstep(0.22, 0.5, stripe)) * smoothstep(0.5, 0.05, light);

    float ink = max(max(contour, groove * 0.85), hatch * 0.5);
    ink *= 0.7 + 0.3 * grain;

    vec3 col = uInk;
    float alpha = ink;
    if (uGlitch > 0.5) {
      // Every glitch goes neon; the grooves take the second colour.
      col = mix(uNeon, uNeon2, groove);
    }
    if (abs(uGlitch - 3.0) < 0.5) {
      // Scanlines fill the inside; the strokes stay bright over them.
      float row = mod(floor(gl_FragCoord.y / (2.0 * uScale) + uSeed * 9.0), 2.0);
      float fill = row * 0.6;
      alpha = max(ink, fill);
      col = ink > fill ? vec3(1.0) : uNeon;
    } else if (abs(uGlitch - 4.0) < 0.5) {
      // Corrupted data: random blocks switch on inside the outline.
      vec2 b = floor(gl_FragCoord.xy / (3.0 * uScale));
      float r = hash(b + uSeed * 31.0);
      alpha = max(ink * 0.5, step(0.6, r));
      col = r > 0.86 ? uNeon2 : uNeon;
    } else if (abs(uGlitch - 5.0) < 0.5) {
      // Invert: a solid body with the strokes cut out of it.
      alpha = 1.0 - ink * 0.9;
      col = uNeon;
    }
    col *= uChannel;
    // Premultiplied: the fill is clear, only the strokes show.
    gl_FragColor = vec4(col * alpha, alpha);
  }
`;

/** The ink colour: the element's CSS text colour, so it follows the theme. */
function inkColour(canvas: HTMLCanvasElement) {
  const colour = new THREE.Color("#f5f5f5");
  try {
    const css = getComputedStyle(canvas).color;
    if (/^rgba?\(/.test(css)) colour.setStyle(css, THREE.NoColorSpace);
  } catch {
    // keep the default
  }
  return colour;
}

/** Hand-drawn animation redraws a few times a second; so do the strokes. */
const BOIL_MS = 140;

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

  const noise = createNoise3(7);
  const uniforms = {
    uInk: { value: inkColour(canvas) },
    uBoil: { value: 0 },
    uScale: { value: 1 },
    uGlitch: { value: 0 },
    uSeed: { value: 0 },
    uNeon: { value: NEONS[0].clone() },
    uNeon2: { value: NEONS[1].clone() },
    uChannel: { value: new THREE.Color(1, 1, 1) },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: SKETCH_VERTEX,
    fragmentShader: SKETCH_FRAGMENT,
  });
  // The RGB split draws the brain twice and adds the copies together.
  const splitMaterial = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: SKETCH_VERTEX,
    fragmentShader: SKETCH_FRAGMENT,
    blending: THREE.AdditiveBlending,
    premultipliedAlpha: true,
  });

  const geometries = [hemisphere(1, noise), hemisphere(-1, noise), cerebellum(noise)];
  const stemGeo = new THREE.CylinderGeometry(0.085, 0.065, 0.26, 16);
  stemGeo.setAttribute("depth", new THREE.BufferAttribute(new Float32Array(stemGeo.getAttribute("position").count), 1));

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
  const stem = new THREE.Mesh(stemGeo, material);
  stem.position.set(0, -0.44, -0.3);
  stem.rotation.x = 0.35;
  brain.add(stem);

  const meshes = brain.children as THREE.Mesh[];
  const setMaterial = (m: THREE.Material) => {
    for (const mesh of meshes) mesh.material = m;
  };

  let angle = 0.7;
  let last = 0;
  let pulseAt = -Infinity;

  // Glitch scheduler: long calm stretches, then a hit, sometimes a short burst of them.
  let gMode: number = GLITCH.none;
  let gUntil = 0;
  let gNext = -1;
  let gSeed = 0;
  let gBurst = 0;
  let gSplit = 0.1;
  const rand = (a: number, b: number) => a + Math.random() * (b - a);

  const startGlitch = (now: number) => {
    gMode = 1 + Math.floor(Math.random() * GLITCH_MODES);
    gUntil = now + (gMode === GLITCH.blackout ? rand(40, 90) : rand(70, 280));
    gSeed = Math.random() * 100;
    gSplit = rand(0.07, 0.15);
    const a = Math.floor(Math.random() * NEONS.length);
    const b = (a + 1 + Math.floor(Math.random() * (NEONS.length - 1))) % NEONS.length;
    uniforms.uNeon.value.copy(NEONS[a]);
    uniforms.uNeon2.value.copy(NEONS[b]);
    if (gBurst === 0 && Math.random() < 0.35) gBurst = 1 + Math.floor(Math.random() * 3);
    // Sometimes it comes back facing a different way: an abrupt cut, no turn.
    if (Math.random() < 0.3) angle += (Math.random() < 0.5 ? -1 : 1) * rand(0.4, 1.1);
  };

  const stepGlitch = (now: number) => {
    if (gNext < 0) gNext = now + rand(600, 1800);
    if (gMode !== GLITCH.none && now >= gUntil) {
      gMode = GLITCH.none;
      if (gBurst > 0) {
        gBurst--;
        gNext = now + rand(30, 120);
      } else {
        gNext = now + rand(500, 2800);
      }
    }
    if (gMode === GLITCH.none && now >= gNext) startGlitch(now);
    uniforms.uGlitch.value = gMode;
    // Re-rolls every few frames so tears and noise flicker while they last.
    uniforms.uSeed.value = gSeed + Math.floor(now / 60) * 0.137;
  };

  const render = () => {
    if (gMode === GLITCH.blackout) {
      renderer.clear();
      return;
    }
    if (gMode !== GLITCH.split) {
      renderer.render(scene, camera);
      return;
    }
    // Magenta copy to one side, cyan to the other, added together.
    const baseX = tilt.position.x;
    renderer.autoClear = false;
    renderer.clear();
    setMaterial(splitMaterial);
    uniforms.uChannel.value.setRGB(1, 0.15, 0.85);
    tilt.position.x = baseX - gSplit;
    renderer.render(scene, camera);
    renderer.clearDepth();
    uniforms.uChannel.value.setRGB(0, 0.95, 1);
    tilt.position.x = baseX + gSplit;
    renderer.render(scene, camera);
    tilt.position.x = baseX;
    uniforms.uChannel.value.setRGB(1, 1, 1);
    setMaterial(material);
    renderer.autoClear = true;
  };

  return {
    resize(width, height) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      renderer.setPixelRatio(dpr);
      uniforms.uScale.value = dpr;
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
      if (doSpin) {
        uniforms.uBoil.value = Math.floor(now / BOIL_MS) % 7;
        stepGlitch(now);
      }
      render();
    },
    pulse(now) {
      pulseAt = now;
      // A tap kicks off a burst straight away.
      gMode = GLITCH.none;
      gBurst = 2;
      gNext = now;
    },
    dispose() {
      for (const g of geometries) g.dispose();
      stemGeo.dispose();
      material.dispose();
      splitMaterial.dispose();
      renderer.dispose();
    },
  };
}
