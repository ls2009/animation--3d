/**
 * Shared stage visuals: everything about HOW state is drawn lives here so
 * the interactive player and the headless keyframe renderer cannot drift
 * apart. computeState defines WHAT is true at time t; this module defines
 * what that looks like.
 *
 * Determinism rules: no Math.random (placement uses index-based trig), no
 * DOM requirements in geometry paths (sky gradients are vertex-coloured
 * domes, not canvas textures). Text sprites are the one DOM-dependent
 * nicety and degrade gracefully where `document` is absent (pure-Node gl
 * rendering) — see makeTextObject.
 */
import * as THREE from "three";
import { type Script, resolveColor } from "@sinaa/dsl";
import type { ActorState, FlowParticleState } from "./state";
import { buildProp, PROP_META } from "./props/registry";

// ---------------------------------------------------------------------------
// Renderer & lights
// ---------------------------------------------------------------------------

/** Apply the house look to any WebGLRenderer (player, keyframes, gl). */
export function configureRenderer(renderer: THREE.WebGLRenderer): void {
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
}

export function addStageLights(scene3: THREE.Scene): void {
  const hemi = new THREE.HemisphereLight(0xbdd4ff, 0x22262e, 0.65);
  const key = new THREE.DirectionalLight(0xffffff, 2.1);
  key.position.set(12, 22, 14);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -30;
  key.shadow.camera.right = 30;
  key.shadow.camera.top = 30;
  key.shadow.camera.bottom = -30;
  key.shadow.camera.far = 80;
  key.shadow.bias = -0.0004;
  key.shadow.radius = 4;
  const rim = new THREE.DirectionalLight(0x88aaff, 0.7);
  rim.position.set(-14, 10, -16);
  scene3.add(hemi, key, rim);
}

// ---------------------------------------------------------------------------
// Themed backdrops — the environment represents the topic.
// ---------------------------------------------------------------------------

export const BACKDROP_NAMES = [
  "lab",
  "nature",
  "space",
  "plain",
  "tech",
  "body",
  "finance",
  "factory",
  "sky",
  "ocean",
] as const;
export type BackdropName = (typeof BACKDROP_NAMES)[number];

interface Theme {
  skyTop: string;
  skyBottom: string;
  floor: string;
  grid?: [number, number];
  fog?: { color: string; density: number };
  build?: (scenery: THREE.Group) => void;
}

/** Deterministic pseudo-random in [0,1) from an index — placement helper. */
const det = (i: number, salt = 0) => {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const mat = (color: string, opts: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({ color, transparent: true, ...opts });

function ringPlace(scenery: THREE.Group, count: number, rMin: number, rMax: number,
  make: (i: number) => THREE.Object3D): void {
  for (let i = 0; i < count; i++) {
    const obj = make(i);
    const a = (i / count) * Math.PI * 2 + det(i) * 0.5;
    const r = rMin + det(i, 1) * (rMax - rMin);
    obj.position.x = Math.cos(a) * r;
    obj.position.z = Math.sin(a) * r;
    obj.rotation.y = det(i, 2) * Math.PI * 2;
    scenery.add(obj);
  }
}

function pointsCloud(count: number, spread: number, yMin: number, yMax: number,
  color: string, size: number, salt: number): THREE.Points {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (det(i, salt) - 0.5) * spread;
    positions[i * 3 + 1] = yMin + det(i, salt + 1) * (yMax - yMin);
    positions[i * 3 + 2] = (det(i, salt + 2) - 0.5) * spread;
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  return new THREE.Points(
    geom,
    new THREE.PointsMaterial({ color, size, transparent: true, opacity: 0.8, sizeAttenuation: true }),
  );
}

const THEMES: Record<BackdropName, Theme> = {
  lab: {
    skyTop: "#1b2434", skyBottom: "#0d1119", floor: "#232c3c", grid: [0x3a4a66, 0x283348],
    fog: { color: "#0d1119", density: 0.008 },
    build: (s) => {
      ringPlace(s, 6, 34, 44, (i) => {
        const g = new THREE.Group();
        g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 7 + det(i) * 3), mat("#2b3446")));
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.35), mat("#9fd0ff", { emissive: "#4a90d0" }));
        lamp.position.y = 7.4 + det(i) * 3;
        g.add(lamp);
        return g;
      });
    },
  },
  tech: {
    skyTop: "#101a30", skyBottom: "#05070f", floor: "#101828", grid: [0x2ee6c8, 0x14324a],
    fog: { color: "#05070f", density: 0.007 },
    build: (s) => {
      s.add(pointsCloud(260, 70, 2, 26, "#35e0ff", 0.22, 7));
      ringPlace(s, 8, 34, 46, (i) => {
        const h = 5 + det(i) * 9;
        const tower = new THREE.Mesh(new THREE.BoxGeometry(1.4, h, 1.4),
          mat("#0f1c2e", { emissive: "#0a4a5e", emissiveIntensity: 0.7 }));
        tower.position.y = h / 2;
        return tower;
      });
    },
  },
  nature: {
    skyTop: "#9fd4f5", skyBottom: "#3f7d52", floor: "#3c6b44",
    fog: { color: "#9ac8b0", density: 0.009 },
    build: (s) => {
      ringPlace(s, 14, 26, 40, (i) => {
        const g = new THREE.Group();
        const h = 2.5 + det(i) * 3;
        g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, h * 0.4), mat("#6b4a32")));
        const crown = new THREE.Mesh(new THREE.ConeGeometry(1.1 + det(i, 3), h, 7), mat("#2f7a3e"));
        crown.position.y = h * 0.4 + h / 2 - 0.4;
        g.children[0]!.position.y = h * 0.2;
        g.add(crown);
        return g;
      });
      const sun = new THREE.Mesh(new THREE.SphereGeometry(4),
        mat("#ffe9a8", { emissive: "#ffd34d", emissiveIntensity: 1.4, fog: false }));
      sun.position.set(-40, 34, -60);
      s.add(sun);
    },
  },
  space: {
    skyTop: "#05060f", skyBottom: "#02020a", floor: "#0b0d1c",
    build: (s) => {
      s.add(pointsCloud(900, 220, -10, 90, "#ffffff", 0.35, 11));
      s.add(pointsCloud(300, 160, -10, 80, "#9db5ff", 0.5, 13));
      const planet = new THREE.Mesh(new THREE.SphereGeometry(7), mat("#7a5cc9", { emissive: "#241a4a" }));
      planet.position.set(46, 30, -70);
      s.add(planet);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(10.5, 0.7, 10, 48), mat("#b8a8e8", { opacity: 0.6 }));
      ring.position.copy(planet.position);
      ring.rotation.x = 1.1;
      s.add(ring);
    },
  },
  body: {
    skyTop: "#5c1f33", skyBottom: "#2a0d18", floor: "#471a28",
    fog: { color: "#3a1020", density: 0.012 },
    build: (s) => {
      ringPlace(s, 10, 30, 44, (i) => {
        const blob = new THREE.Mesh(new THREE.SphereGeometry(1.2 + det(i) * 2.2, 12, 12),
          mat("#a33d55", { opacity: 0.35, roughness: 0.9 }));
        blob.position.y = 3 + det(i, 4) * 12;
        return blob;
      });
      s.add(pointsCloud(160, 60, 1, 20, "#ff8fa8", 0.3, 17));
    },
  },
  finance: {
    skyTop: "#2a3a63", skyBottom: "#120f1e", floor: "#1b2030", grid: [0x44507a, 0x262c42],
    fog: { color: "#141224", density: 0.008 },
    build: (s) => {
      ringPlace(s, 12, 36, 50, (i) => {
        const h = 6 + det(i) * 14;
        const g = new THREE.Group();
        const tower = new THREE.Mesh(new THREE.BoxGeometry(2 + det(i, 5) * 1.5, h, 2), mat("#10141f"));
        tower.position.y = h / 2;
        g.add(tower);
        for (let w = 0; w < 5; w++) {
          if (det(i, 6 + w) > 0.45) {
            const win = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5),
              mat("#ffd98a", { emissive: "#c9a040", side: THREE.DoubleSide }));
            win.position.set(0.4 - det(w, i) * 0.8, 1.5 + w * (h / 6), 1.02);
            g.add(win);
          }
        }
        return g;
      });
    },
  },
  factory: {
    skyTop: "#5a4a3a", skyBottom: "#201812", floor: "#2e2922",
    fog: { color: "#2a2018", density: 0.011 },
    build: (s) => {
      ringPlace(s, 8, 34, 46, (i) => {
        const g = new THREE.Group();
        const h = 8 + det(i) * 6;
        const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.1, h, 10), mat("#453a30"));
        stack.position.y = h / 2;
        g.add(stack);
        const smoke = new THREE.Mesh(new THREE.SphereGeometry(1.4, 8, 8), mat("#8a8378", { opacity: 0.35 }));
        smoke.position.y = h + 1;
        g.add(smoke);
        return g;
      });
      ringPlace(s, 5, 32, 42, (i) => {
        const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 10 + det(i) * 6, 10), mat("#5a4f42"));
        pipe.rotation.z = Math.PI / 2;
        pipe.position.y = 1.2 + det(i, 8) * 2;
        return pipe;
      });
    },
  },
  sky: {
    skyTop: "#6db3f2", skyBottom: "#dfeefc", floor: "#aecfe8",
    fog: { color: "#cfe6f8", density: 0.006 },
    build: (s) => {
      ringPlace(s, 9, 30, 48, (i) => {
        const g = new THREE.Group();
        for (let p = 0; p < 4; p++) {
          const puff = new THREE.Mesh(new THREE.SphereGeometry(1.5 + det(i, p) * 1.3, 10, 10),
            mat("#ffffff", { opacity: 0.9, roughness: 1 }));
          puff.position.set((p - 1.5) * 1.6, det(i, p + 4) * 0.8, det(i, p + 8) * 1.2);
          g.add(puff);
        }
        g.position.y = 8 + det(i, 9) * 14;
        return g;
      });
    },
  },
  ocean: {
    skyTop: "#0d4f72", skyBottom: "#031f30", floor: "#0a3348",
    fog: { color: "#06293d", density: 0.014 },
    build: (s) => {
      s.add(pointsCloud(220, 60, 0.5, 24, "#bfeaff", 0.28, 21));
      ringPlace(s, 7, 26, 40, (i) => {
        const g = new THREE.Group();
        const h = 2 + det(i) * 4;
        for (let b = 0; b < 3; b++) {
          const frond = new THREE.Mesh(new THREE.ConeGeometry(0.25, h, 6),
            mat("#1f7a5a", { opacity: 0.85 }));
          frond.position.set((b - 1) * 0.4, h / 2, 0);
          frond.rotation.z = (b - 1) * 0.25;
          g.add(frond);
        }
        return g;
      });
    },
  },
  plain: {
    skyTop: "#2a2f3a", skyBottom: "#15171d", floor: "#23262e",
  },
};

/** Vertex-coloured dome — gradient sky with no canvas/DOM dependency. */
function makeSkyDome(top: string, bottom: string): THREE.Mesh {
  const geom = new THREE.SphereGeometry(220, 24, 16);
  const topC = new THREE.Color(top);
  const bottomC = new THREE.Color(bottom);
  const pos = geom.getAttribute("position");
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const t = Math.min(1, Math.max(0, (pos.getY(i) / 220 + 0.35) / 1.1));
    const c = bottomC.clone().lerp(topC, t);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geom.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return new THREE.Mesh(
    geom,
    new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false }),
  );
}

export interface StageEnvironment {
  floor: THREE.Mesh;
  grid: THREE.GridHelper;
  sky: THREE.Mesh;
  scenery: THREE.Group;
  current: string;
}

export function createStageEnvironment(scene3: THREE.Scene): StageEnvironment {
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(60, 56),
    new THREE.MeshStandardMaterial({ color: "#232c3c", roughness: 0.92, metalness: 0.05 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.01;
  floor.receiveShadow = true;
  const grid = new THREE.GridHelper(64, 32, 0x3a4a66, 0x283348);
  (grid.material as THREE.Material).transparent = true;
  (grid.material as THREE.Material).opacity = 0.5;
  const sky = makeSkyDome("#1b2434", "#0d1119");
  const scenery = new THREE.Group();
  scene3.add(floor, grid, sky, scenery);
  const env: StageEnvironment = { floor, grid, sky, scenery, current: "" };
  applyBackdrop(scene3, env, "lab");
  return env;
}

export function applyBackdrop(
  scene3: THREE.Scene,
  env: StageEnvironment,
  backdrop: string,
): void {
  if (env.current === backdrop) return;
  env.current = backdrop;
  const theme = THEMES[(backdrop as BackdropName)] ?? THEMES.lab;

  (env.floor.material as THREE.MeshStandardMaterial).color.set(theme.floor);
  env.grid.visible = Boolean(theme.grid);
  if (theme.grid) {
    const gridMat = env.grid.material as THREE.LineBasicMaterial;
    // GridHelper uses vertex colours for its two line sets; tint whole helper.
    gridMat.color.set(theme.grid[0]);
  }

  // Sky gradient.
  scene3.remove(env.sky);
  env.sky = makeSkyDome(theme.skyTop, theme.skyBottom);
  scene3.add(env.sky);
  scene3.background = new THREE.Color(theme.skyBottom);

  // Fog.
  scene3.fog = theme.fog
    ? new THREE.FogExp2(theme.fog.color, theme.fog.density)
    : null;

  // Scenery.
  env.scenery.clear();
  theme.build?.(env.scenery);
}

// ---------------------------------------------------------------------------
// Actors
// ---------------------------------------------------------------------------

const metaHeight = new Map(PROP_META.map((m) => [m.name, m.height]));

export interface StageActorNode {
  group: THREE.Group;
  baseSize: number;
  nominal: number;
  kind: "prop" | "text";
  /** For text actors: the currently rendered string (sprite refresh key). */
  textShown?: string;
}

/**
 * Text as a real stage object: a canvas-textured plane that moves, fades,
 * pulses and rotates exactly like any prop. In DOM-less environments
 * (pure-Node gl rendering) it degrades to an accent-coloured marker bar so
 * layout stays visible.
 */
function makeTextObject(text: string, colorHex: string): THREE.Group {
  const g = new THREE.Group();
  if (typeof document === "undefined") {
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(Math.max(1.5, text.length * 0.22), 0.5, 0.12),
      mat(colorHex, { emissive: colorHex, emissiveIntensity: 0.4 }),
    );
    bar.position.y = 1;
    bar.userData.tinted = true;
    g.add(bar);
    return g;
  }
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  const font = "700 64px 'Segoe UI', system-ui, sans-serif";
  ctx.font = font;
  const padX = 42;
  const width = Math.ceil(ctx.measureText(text).width) + padX * 2;
  canvas.width = Math.max(128, width);
  canvas.height = 128;
  ctx.font = font;
  ctx.textBaseline = "middle";
  // Pill background for contrast on any backdrop.
  ctx.fillStyle = "rgba(8,10,16,0.72)";
  const r = 40;
  ctx.beginPath();
  ctx.roundRect(2, 14, canvas.width - 4, 100, r);
  ctx.fill();
  ctx.strokeStyle = colorHex;
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.fillText(text, padX, 66);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const aspect = canvas.width / canvas.height;
  const h = 1; // nominal height 1 world unit; actor.size scales it
  const panel = new THREE.Mesh(
    new THREE.PlaneGeometry(h * aspect, h),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide }),
  );
  panel.position.y = h / 2 + 0.2;
  g.add(panel);
  return g;
}

export function mountStageActors(
  scene3: THREE.Scene,
  script: Script,
): Map<string, StageActorNode> {
  const nodes = new Map<string, StageActorNode>();
  for (const actor of script.actors) {
    const color = resolveColor(actor.color);
    const group =
      actor.kind === "prop" ? buildProp(actor.prop ?? "block", color) : makeTextObject(actor.label, color);
    const nominal = actor.kind === "prop" ? (metaHeight.get(actor.prop ?? "block") ?? 2) : 1;
    group.position.set(actor.x, actor.y, actor.z);
    group.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) (obj as THREE.Mesh).castShadow = true;
    });
    scene3.add(group);
    nodes.set(actor.id, {
      group,
      baseSize: actor.size,
      nominal,
      kind: actor.kind,
      textShown: actor.kind === "text" ? actor.label : undefined,
    });
  }
  return nodes;
}

export function unmountStageActors(
  scene3: THREE.Scene,
  nodes: Map<string, StageActorNode>,
): void {
  for (const node of nodes.values()) scene3.remove(node.group);
  nodes.clear();
}

/** Map one actor's pure state onto its three.js node. */
export function applyActorVisuals(node: StageActorNode, a: ActorState): void {
  node.group.position.set(a.x, a.y, a.z);
  node.group.rotation.set(a.rotation.x, a.rotation.y, a.rotation.z);
  node.group.scale.setScalar((node.baseSize / node.nominal) * a.scale);
  node.group.visible = a.opacity > 0.01;

  // Text actors re-render their panel when a `label` step changes the text.
  if (node.kind === "text" && node.textShown !== a.label) {
    node.textShown = a.label;
    const parent = node.group.parent;
    if (parent) {
      const fresh = makeTextObject(a.label, a.color);
      fresh.position.copy(node.group.position);
      fresh.rotation.copy(node.group.rotation);
      fresh.scale.copy(node.group.scale);
      fresh.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) (obj as THREE.Mesh).castShadow = true;
      });
      parent.remove(node.group);
      parent.add(fresh);
      node.group = fresh;
    }
  }

  node.group.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    const material = mesh.material as THREE.MeshStandardMaterial | THREE.MeshBasicMaterial;
    if (!material) return;
    if (material.userData.baseOpacity === undefined) material.userData.baseOpacity = material.opacity;
    material.opacity = a.opacity * (material.userData.baseOpacity as number);
    const std = material as THREE.MeshStandardMaterial;
    if (mesh.userData.tinted && std.emissive !== undefined) {
      std.color.set(a.color);
      if (std.userData.baseEmissive === undefined) {
        std.userData.baseEmissive = `#${std.emissive.getHexString()}`;
      }
      std.emissive.set(std.userData.baseEmissive as string);
      if (a.highlight > 0) {
        std.emissive.lerp(new THREE.Color("#ffffff"), a.highlight * 0.5);
      }
    }
  });
}

// ---------------------------------------------------------------------------
// Flow particles
// ---------------------------------------------------------------------------

export interface FlowPool {
  apply(flows: FlowParticleState[]): void;
  dispose(): void;
}

export function createFlowPool(scene3: THREE.Scene, size = 80): FlowPool {
  const geoms = {
    sphere: new THREE.SphereGeometry(0.22, 12, 12),
    cube: new THREE.BoxGeometry(0.32, 0.32, 0.32),
    drop: new THREE.ConeGeometry(0.2, 0.45, 10),
  };
  const meshes: THREE.Mesh[] = [];
  for (let i = 0; i < size; i++) {
    const m = new THREE.Mesh(
      geoms.sphere,
      new THREE.MeshStandardMaterial({
        transparent: true,
        opacity: 0.95,
        roughness: 0.35,
        emissiveIntensity: 0.6,
      }),
    );
    m.visible = false;
    scene3.add(m);
    meshes.push(m);
  }
  return {
    apply(flows: FlowParticleState[]): void {
      let fi = 0;
      for (const particle of flows) {
        if (fi >= size) break;
        const m = meshes[fi++]!;
        m.visible = true;
        m.geometry = geoms[particle.shape];
        m.position.set(particle.x, particle.y, particle.z);
        const material = m.material as THREE.MeshStandardMaterial;
        material.color.set(particle.color);
        material.emissive.set(particle.color);
        material.opacity = 0.3 + 0.7 * Math.sin(particle.progress * Math.PI);
      }
      for (; fi < size; fi++) meshes[fi]!.visible = false;
    },
    dispose(): void {
      for (const m of meshes) scene3.remove(m);
      for (const g of Object.values(geoms)) g.dispose();
    },
  };
}

/** Theme colour summary (dashboards, docs). */
export const BACKDROPS: Record<string, { bg: string; floor: string }> = Object.fromEntries(
  BACKDROP_NAMES.map((name) => [name, { bg: THEMES[name].skyBottom, floor: THEMES[name].floor }]),
);
