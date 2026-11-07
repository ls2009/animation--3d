/**
 * One-shot keyframe rendering: give it a WebGLRenderer (browser canvas or
 * headless-gl context — the caller owns it), and it renders any scene of a
 * script at any time t. Built on computeState + the shared stage module, so
 * keyframes show exactly what the player shows.
 */
import * as THREE from "three";
import type { Script } from "@sinaa/dsl";
import { computeState } from "./state";
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

export interface OffscreenStage {
  /** Render one frame of scene `sceneIndex` at scene-local time `t`. */
  render(script: Script, sceneIndex: number, t: number): void;
  dispose(): void;
}

export function createOffscreenStage(
  renderer: THREE.WebGLRenderer,
  width: number,
  height: number,
): OffscreenStage {
  renderer.setSize(width, height, false);
  const scene3 = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 500);
  addStageLights(scene3);
  const floor = addStageFloor(scene3);
  const flowPool = createFlowPool(scene3);

  let mounted: Script | undefined;
  let nodes: Map<string, StageActorNode> = new Map();

  return {
    render(script: Script, sceneIndex: number, t: number): void {
      if (mounted !== script) {
        unmountStageActors(scene3, nodes);
        nodes = mountStageActors(scene3, script);
        mounted = script;
      }
      const scene = script.scenes[sceneIndex];
      if (!scene) throw new RangeError(`scene ${sceneIndex} out of range`);
      applyBackdrop(scene3, floor, scene.backdrop);

      const state = computeState(script, sceneIndex, t);
      for (const [id, node] of nodes) {
        const a = state.actors[id];
        if (a) applyActorVisuals(node, a);
      }
      flowPool.apply(state.flows);

      camera.position.set(state.camera.x, state.camera.y, state.camera.z);
      camera.lookAt(state.camera.look.x, state.camera.look.y, state.camera.look.z);
      renderer.render(scene3, camera);
    },
    dispose(): void {
      unmountStageActors(scene3, nodes);
      flowPool.dispose();
    },
  };
}
