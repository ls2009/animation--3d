/**
 * createPlayer(canvas, labelsEl) — deterministic Three.js playback of a
 * validated scene script. The engine never calls a model and makes zero
 * network calls; everything it needs is in the script object.
 *
 * Rendering is a thin shell over computeState: every frame maps the pure
 * state onto three.js objects, so playback, scrubbing and the headless
 * renderer all agree by construction.
 */
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { type Script, resolveColor } from "@sinaa/dsl";
import { computeState, type ControlValues, type SceneState } from "./state";
import { buildProp, PROP_META } from "./props/registry";

const BACKDROPS: Record<string, { bg: string; floor: string }> = {
  lab: { bg: "#10141c", floor: "#1c2330" },
  nature: { bg: "#0e1a14", floor: "#16271d" },
  space: { bg: "#070711", floor: "#101022" },
  plain: { bg: "#15151a", floor: "#202028" },
};

const metaHeight = new Map(PROP_META.map((m) => [m.name, m.height]));

export interface PlayerOptions {
  /** Start with narration spoken aloud (SpeechSynthesis). Default false. */
  voice?: boolean;
}

export interface PlayerEvents {
  /** Fired when the active scene changes. */
  scene: (index: number) => void;
  /** Fired every rendered frame with scene-local time. */
  tick: (sceneIndex: number, t: number, duration: number) => void;
  /** Fired when the last scene finishes playing. */
  ended: () => void;
}

export interface Player {
  load(script: Script): void;
  play(): void;
  pause(): void;
  readonly playing: boolean;
  /** Jump to a scene (and optional scene-local time) and keep play state. */
  seek(sceneIndex: number, t?: number): void;
  nextScene(): void;
  prevScene(): void;
  setControl(id: string, value: number): void;
  getControls(): ControlValues;
  setVoice(on: boolean): void;
  readonly voice: boolean;
  readonly sceneIndex: number;
  readonly sceneTime: number;
  on<K extends keyof PlayerEvents>(event: K, cb: PlayerEvents[K]): () => void;
  /** Re-fit the renderer to the canvas size. */
  resize(): void;
  dispose(): void;
}

interface ActorNode {
  group: THREE.Group;
  baseSize: number;
  nominal: number;
  labelEl: HTMLDivElement;
  kind: "prop" | "text";
}

export function createPlayer(
  canvas: HTMLCanvasElement,
  labelsEl: HTMLElement,
  options: PlayerOptions = {},
): Player {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio ?? 1, 2));

  const scene3 = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 500);
  camera.position.set(14, 12, 30);

  const ambient = new THREE.AmbientLight(0xffffff, 0.55);
  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(10, 18, 12);
  const fill = new THREE.DirectionalLight(0x8899ff, 0.4);
  fill.position.set(-12, 8, -10);
  scene3.add(ambient, key, fill);

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(34, 48),
    new THREE.MeshStandardMaterial({ color: "#1c2330", roughness: 0.95 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.01;
  const grid = new THREE.GridHelper(60, 30, 0x2c3648, 0x222a3a);
  scene3.add(floor, grid);

  const orbit = new OrbitControls(camera, canvas);
  orbit.enableDamping = true;
  orbit.maxDistance = 120;
  orbit.minDistance = 4;
  let userOrbiting = false;
  orbit.addEventListener("start", () => {
    userOrbiting = true;
  });

  // Flow particle pool.
  const FLOW_POOL = 80;
  const flowGeoms = {
    sphere: new THREE.SphereGeometry(0.22, 10, 10),
    cube: new THREE.BoxGeometry(0.32, 0.32, 0.32),
    drop: new THREE.ConeGeometry(0.2, 0.45, 10),
  };
  const flowMeshes: THREE.Mesh[] = [];
  for (let i = 0; i < FLOW_POOL; i++) {
    const m = new THREE.Mesh(
      flowGeoms.sphere,
      new THREE.MeshStandardMaterial({ transparent: true, opacity: 0.9, roughness: 0.4 }),
    );
    m.visible = false;
    scene3.add(m);
    flowMeshes.push(m);
  }

  let script: Script | undefined;
  let actorNodes = new Map<string, ActorNode>();
  let sceneIndex = 0;
  let sceneTime = 0;
  let playing = false;
  let voiceOn = options.voice ?? false;
  let controlValues: ControlValues = {};
  let spokenUpTo = -1;
  let lastBackdrop = "";
  let disposed = false;

  const listeners: { [K in keyof PlayerEvents]: Set<PlayerEvents[K]> } = {
    scene: new Set(),
    tick: new Set(),
    ended: new Set(),
  };
  const emit = <K extends keyof PlayerEvents>(ev: K, ...args: Parameters<PlayerEvents[K]>) => {
    for (const cb of listeners[ev]) (cb as (...a: Parameters<PlayerEvents[K]>) => void)(...args);
  };

  function clearActors(): void {
    for (const node of actorNodes.values()) {
      scene3.remove(node.group);
      node.labelEl.remove();
    }
    actorNodes = new Map();
  }

  function mountScript(s: Script): void {
    clearActors();
    for (const actor of s.actors) {
      const group = actor.kind === "prop" ? buildProp(actor.prop ?? "block", resolveColor(actor.color)) : new THREE.Group();
      const nominal = actor.kind === "prop" ? (metaHeight.get(actor.prop ?? "block") ?? 2) : 1;
      group.position.set(actor.x, actor.y, actor.z);
      scene3.add(group);

      const labelEl = document.createElement("div");
      labelEl.className = "sinaa-label";
      labelEl.style.position = "absolute";
      labelEl.style.transform = "translate(-50%, -100%)";
      labelEl.style.pointerEvents = "none";
      labelEl.style.whiteSpace = "nowrap";
      labelsEl.appendChild(labelEl);

      actorNodes.set(actor.id, {
        group,
        baseSize: actor.size,
        nominal,
        labelEl,
        kind: actor.kind,
      });
    }
  }

  function speakNarration(upTo: number): void {
    if (!voiceOn || !script) return;
    const synth = globalThis.speechSynthesis;
    if (!synth) return;
    const scene = script.scenes[sceneIndex];
    if (!scene) return;
    scene.narration.forEach((n, i) => {
      if (n.t <= upTo && i > spokenUpTo) {
        spokenUpTo = i;
        const u = new SpeechSynthesisUtterance(n.text);
        u.lang = script!.language;
        u.rate = 1.0;
        synth.speak(u);
      }
    });
  }

  function cancelSpeech(): void {
    globalThis.speechSynthesis?.cancel();
  }

  function applyState(state: SceneState): void {
    if (!script) return;
    const scene = script.scenes[sceneIndex]!;

    if (scene.backdrop !== lastBackdrop) {
      lastBackdrop = scene.backdrop;
      const bd = BACKDROPS[scene.backdrop] ?? BACKDROPS.lab!;
      scene3.background = new THREE.Color(bd.bg);
      (floor.material as THREE.MeshStandardMaterial).color.set(bd.floor);
    }

    const rect = canvas.getBoundingClientRect();

    for (const [id, node] of actorNodes) {
      const a = state.actors[id];
      if (!a) continue;
      node.group.position.set(a.x, a.y, a.z);
      node.group.rotation.set(a.rotation.x, a.rotation.y, a.rotation.z);
      const factor = (node.baseSize / node.nominal) * a.scale;
      node.group.scale.setScalar(factor);
      node.group.visible = a.opacity > 0.01;

      node.group.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (!mesh.isMesh) return;
        const mat = mesh.material as THREE.MeshStandardMaterial;
        if (!mat) return;
        mat.opacity = a.opacity * (mat.userData.baseOpacity ?? storeBaseOpacity(mat));
        if (mesh.userData.tinted) {
          mat.color.set(a.color);
          mat.emissiveIntensity = 1;
          const base = mat.userData.baseEmissive ?? storeBaseEmissive(mat);
          mat.emissive.set(base);
          if (a.highlight > 0) {
            mat.emissive.lerp(new THREE.Color("#ffffff"), a.highlight * 0.45);
          }
        }
      });

      // Label (HTML overlay).
      const el = node.labelEl;
      const text = a.labelValue ? `${a.label} ${a.labelValue}`.trim() : a.label;
      if (!text || a.opacity < 0.05) {
        el.style.display = "none";
      } else {
        const topY = node.baseSize * a.scale + 0.5;
        const pos = new THREE.Vector3(a.x, a.y + topY, a.z).project(camera);
        if (pos.z > 1) {
          el.style.display = "none";
        } else {
          el.style.display = "block";
          el.textContent = text;
          el.style.left = `${((pos.x + 1) / 2) * rect.width}px`;
          el.style.top = `${((1 - pos.y) / 2) * rect.height}px`;
          el.style.opacity = String(Math.min(1, a.opacity));
        }
      }
    }

    // Flows.
    let fi = 0;
    for (const particle of state.flows) {
      if (fi >= FLOW_POOL) break;
      const m = flowMeshes[fi++]!;
      m.visible = true;
      m.geometry = flowGeoms[particle.shape];
      m.position.set(particle.x, particle.y, particle.z);
      const mat = m.material as THREE.MeshStandardMaterial;
      mat.color.set(particle.color);
      mat.opacity = 0.25 + 0.75 * Math.sin(particle.progress * Math.PI);
    }
    for (; fi < FLOW_POOL; fi++) flowMeshes[fi]!.visible = false;

    // Scripted camera, unless the learner has grabbed the orbit.
    if (!userOrbiting) {
      camera.position.set(state.camera.x, state.camera.y, state.camera.z);
      orbit.target.set(state.camera.look.x, state.camera.look.y, state.camera.look.z);
    }
  }

  function storeBaseOpacity(mat: THREE.MeshStandardMaterial): number {
    mat.userData.baseOpacity = mat.opacity;
    return mat.opacity;
  }
  function storeBaseEmissive(mat: THREE.MeshStandardMaterial): string {
    const hex = `#${mat.emissive.getHexString()}`;
    mat.userData.baseEmissive = hex;
    return hex;
  }

  let lastFrame = 0;
  function frame(now: number): void {
    if (disposed) return;
    requestAnimationFrame(frame);
    const dt = lastFrame ? Math.min(0.1, (now - lastFrame) / 1000) : 0;
    lastFrame = now;
    if (!script) return;

    const scene = script.scenes[sceneIndex]!;
    if (playing) {
      sceneTime += dt;
      speakNarration(sceneTime);
      if (sceneTime >= scene.duration) {
        if (sceneIndex < script.scenes.length - 1) {
          setScene(sceneIndex + 1, 0, true);
        } else {
          sceneTime = scene.duration;
          playing = false;
          emit("ended");
        }
      }
    }

    const state = computeState(script, sceneIndex, sceneTime, controlValues);
    applyState(state);
    orbit.update();
    renderer.render(scene3, camera);
    emit("tick", sceneIndex, sceneTime, script.scenes[sceneIndex]!.duration);
  }

  function setScene(i: number, t: number, keepPlaying: boolean): void {
    if (!script) return;
    const clamped = Math.min(Math.max(0, i), script.scenes.length - 1);
    const changed = clamped !== sceneIndex;
    sceneIndex = clamped;
    sceneTime = Math.min(Math.max(0, t), script.scenes[clamped]!.duration);
    spokenUpTo = -1;
    userOrbiting = false;
    cancelSpeech();
    playing = keepPlaying;
    if (changed) emit("scene", sceneIndex);
  }

  function resize(): void {
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width));
    const h = Math.max(1, Math.floor(rect.height));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  resize();
  requestAnimationFrame(frame);

  return {
    load(s: Script): void {
      script = s;
      controlValues = Object.fromEntries(s.controls.map((c) => [c.id, c.default]));
      lastBackdrop = "";
      mountScript(s);
      setScene(0, 0, false);
      emit("scene", 0);
    },
    play(): void {
      if (!script) return;
      const scene = script.scenes[sceneIndex]!;
      if (sceneIndex === script.scenes.length - 1 && sceneTime >= scene.duration) {
        setScene(0, 0, true);
      } else {
        playing = true;
      }
    },
    pause(): void {
      playing = false;
      cancelSpeech();
    },
    get playing(): boolean {
      return playing;
    },
    seek(i: number, t = 0): void {
      setScene(i, t, playing);
    },
    nextScene(): void {
      setScene(sceneIndex + 1, 0, playing);
    },
    prevScene(): void {
      setScene(sceneIndex - 1, 0, playing);
    },
    setControl(id: string, value: number): void {
      controlValues = { ...controlValues, [id]: value };
    },
    getControls(): ControlValues {
      return { ...controlValues };
    },
    setVoice(on: boolean): void {
      voiceOn = on;
      if (!on) cancelSpeech();
    },
    get voice(): boolean {
      return voiceOn;
    },
    get sceneIndex(): number {
      return sceneIndex;
    },
    get sceneTime(): number {
      return sceneTime;
    },
    on(event, cb) {
      listeners[event].add(cb);
      return () => listeners[event].delete(cb);
    },
    resize,
    dispose(): void {
      disposed = true;
      cancelSpeech();
      clearActors();
      orbit.dispose();
      renderer.dispose();
    },
  };
}
