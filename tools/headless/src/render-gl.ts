/**
 * headless-gl backend: a real WebGL1 context in-process, no browser.
 * Requires the optional `gl` native module and a GL-capable environment
 * (on a bare server, run under `xvfb-run -a`).
 */
import { PNG } from "pngjs";
import * as THREE from "three";
import type { Script } from "@sinaa/dsl";
import { createOffscreenStage } from "@sinaa/engine";

type GlFactory = (
  w: number,
  h: number,
  opts?: Record<string, unknown>,
) => WebGLRenderingContext | null;

export async function renderWithGl(
  script: Script,
  times: number[],
  width: number,
  height: number,
): Promise<Buffer[]> {
  let factory: GlFactory;
  try {
    const mod = (await import("gl")) as { default?: GlFactory } & GlFactory;
    factory = (mod.default ?? mod) as GlFactory;
  } catch {
    throw new Error("gl module not installed");
  }

  const gl = factory(width, height, { preserveDrawingBuffer: true, antialias: true });
  if (!gl) {
    throw new Error("could not create a GL context (try xvfb-run -a)");
  }

  // Minimal canvas stand-in; three only touches these members when a
  // ready-made context is supplied.
  const canvas = {
    width,
    height,
    style: {},
    addEventListener() {},
    removeEventListener() {},
    getContext: () => gl,
  } as unknown as HTMLCanvasElement;

  const renderer = new THREE.WebGLRenderer({ canvas, context: gl, antialias: true });
  const stage = createOffscreenStage(renderer, width, height);

  const pngs: Buffer[] = [];
  for (let i = 0; i < script.scenes.length; i++) {
    stage.render(script, i, times[i] ?? script.scenes[i]!.duration / 2);
    const pixels = new Uint8Array(width * height * 4);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

    // GL reads bottom-up; PNG wants top-down.
    const png = new PNG({ width, height });
    const rowBytes = width * 4;
    for (let y = 0; y < height; y++) {
      const src = (height - 1 - y) * rowBytes;
      pixels.subarray(src, src + rowBytes).forEach((v, k) => {
        png.data[y * rowBytes + k] = v;
      });
    }
    pngs.push(PNG.sync.write(png));
  }

  stage.dispose();
  try {
    renderer.dispose();
  } catch {
    // three's dispose assumes browser animation-loop globals; in Node the
    // context teardown below is what actually frees resources.
  }
  const ext = gl.getExtension("STACKGL_destroy_context") as
    | { destroy(): void }
    | null;
  ext?.destroy();
  return pngs;
}
