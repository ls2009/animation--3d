/**
 * Browser-side entry for the Playwright backend. Bundled with esbuild into
 * an IIFE exposing globalThis.SinaaKeyframes.renderAll.
 */
import * as THREE from "three";
import { ScriptSchema } from "@sinaa/dsl";
import { createOffscreenStage } from "@sinaa/engine";

export async function renderAll(
  scriptJson: string,
  width: number,
  height: number,
): Promise<string[]> {
  const script = ScriptSchema.parse(JSON.parse(scriptJson));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    preserveDrawingBuffer: true,
  });
  const stage = createOffscreenStage(renderer, width, height);
  const out: string[] = [];
  for (let i = 0; i < script.scenes.length; i++) {
    stage.render(script, i, script.scenes[i]!.duration / 2);
    out.push(canvas.toDataURL("image/png"));
  }
  stage.dispose();
  renderer.dispose();
  return out;
}

declare global {
  interface Window {
    SinaaKeyframes: { renderAll: typeof renderAll };
  }
}
(globalThis as unknown as Window).SinaaKeyframes = { renderAll };
