/**
 * createPlayer(canvas, labelsEl) — deterministic Three.js playback of a
 * validated scene script. The engine never calls a model and makes zero
 * network calls; everything it needs is in the script object.
 *
 * Rendering is a thin shell over computeState + the shared stage module
 * (stage.ts), so playback, scrubbing and the headless keyframe renderer
 * agree by construction.
 */
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { Script } from "@sinaa/dsl";
import { computeState, type ControlValues, type SceneState } from "./state";
import {
  addStageFloor,
  addStageLights,
  applyActorVisuals,
  applyBackdrop,
  createFlowPool,
  mountStageActors,
  unmountStageActors,
  type StageActorNode,
} from "./stage";

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

  addStageLights(scene3);
  const floor = addStageFloor(scene3);
  const flowPool = createFlowPool(scene3);

  const orbit = new OrbitControls(camera, canvas);
  orbit.enableDamping = true;
  orbit.maxDistance = 120;
  orbit.minDistance = 4;
  let userOrbiting = false;
  orbit.addEventListener("start", () => {
    userOrbiting = true;
  });

  let script: Script | undefined;
  let actorNodes = new Map<string, StageActorNode>();
  let labelEls = new Map<string, HTMLDivElement>();
  let sceneIndex = 0;
  let sceneTime = 0;
  let playing = false;
  let voiceOn = options.voice ?? false;
  let controlValues: ControlValues = {};
  let spokenUpTo = -1;
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
    unmountStageActors(scene3, actorNodes);
    for (const el of labelEls.values()) el.remove();
    labelEls = new Map();
  }

  function mountScript(s: Script): void {
    clearActors();
    actorNodes = mountStageActors(scene3, s);
    for (const actor of s.actors) {
      const labelEl = document.createElement("div");
      labelEl.className = "sinaa-label";
      labelEl.style.position = "absolute";
      labelEl.style.transform = "translate(-50%, -100%)";
      labelEl.style.pointerEvents = "none";
      labelEl.style.whiteSpace = "nowrap";
      labelsEl.appendChild(labelEl);
      labelEls.set(actor.id, labelEl);
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
    applyBackdrop(scene3, floor, scene.backdrop);

    const rect = canvas.getBoundingClientRect();

    for (const [id, node] of actorNodes) {
      const a = state.actors[id];
      if (!a) continue;
      applyActorVisuals(node, a);

      // Label (HTML overlay).
      const el = labelEls.get(id);
      if (!el) continue;
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

    flowPool.apply(state.flows);

    // Scripted camera, unless the learner has grabbed the orbit.
    if (!userOrbiting) {
      camera.position.set(state.camera.x, state.camera.y, state.camera.z);
      orbit.target.set(state.camera.look.x, state.camera.look.y, state.camera.look.z);
    }
  }

  let lastFrame = 0;
  let lastTickScene = -1;
  let lastTickTime = -1;
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
    // Emit ticks only when the transport actually moved — otherwise a paused
    // player re-renders its host UI at 60fps for nothing.
    if (sceneIndex !== lastTickScene || Math.abs(sceneTime - lastTickTime) >= 0.04) {
      lastTickScene = sceneIndex;
      lastTickTime = sceneTime;
      emit("tick", sceneIndex, sceneTime, script.scenes[sceneIndex]!.duration);
    }
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
      flowPool.dispose();
      orbit.dispose();
      renderer.dispose();
    },
  };
}
