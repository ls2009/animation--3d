/**
 * @sinaa/headless — keyframe renderer.
 *
 * Renders one PNG per scene (at the scene's midpoint, from its scripted
 * camera) for the Inspector. Backend order per the mission: headless-gl
 * first; Playwright (bundled chromium page) as the fallback when gl cannot
 * build or cannot create a context.
 */
import type { Script } from "@sinaa/dsl";

export type Backend = "gl" | "playwright";

export interface RenderOptions {
  width?: number;
  height?: number;
  /** "auto" tries gl, then playwright. */
  backend?: Backend | "auto";
  /** Scene-local times; defaults to each scene's midpoint. */
  times?: number[];
}

export interface RenderResult {
  backend: Backend;
  /** One PNG buffer per scene, in scene order. */
  pngs: Buffer[];
}

export const DEFAULT_WIDTH = 960;
export const DEFAULT_HEIGHT = 540;

export async function renderKeyframes(
  script: Script,
  options: RenderOptions = {},
): Promise<RenderResult> {
  const width = options.width ?? DEFAULT_WIDTH;
  const height = options.height ?? DEFAULT_HEIGHT;
  const times =
    options.times ?? script.scenes.map((scene) => scene.duration / 2);
  const backend = options.backend ?? "auto";

  if (backend === "gl" || backend === "auto") {
    try {
      const { renderWithGl } = await import("./render-gl");
      const pngs = await renderWithGl(script, times, width, height);
      return { backend: "gl", pngs };
    } catch (err) {
      if (backend === "gl") throw err;
      process.stderr.write(
        `keyframes: headless-gl unavailable (${(err as Error).message}); falling back to playwright\n`,
      );
    }
  }
  const { renderWithPlaywright } = await import("./render-playwright");
  const pngs = await renderWithPlaywright(script, times, width, height);
  return { backend: "playwright", pngs };
}
