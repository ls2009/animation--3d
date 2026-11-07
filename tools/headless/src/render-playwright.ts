/**
 * Playwright backend: bundle the engine + three into one script, load it in
 * a headless chromium page, render every scene to a canvas and bring the
 * PNGs back as data URLs. Used when headless-gl cannot build or cannot
 * create a context.
 */
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Script } from "@sinaa/dsl";

const here = dirname(fileURLToPath(import.meta.url));

/** Times are accepted for interface parity; the browser entry renders each
 *  scene at its midpoint, which is what the Inspector consumes. */
export async function renderWithPlaywright(
  script: Script,
  _times: number[],
  width: number,
  height: number,
): Promise<Buffer[]> {
  const esbuild = await import("esbuild");
  const bundleDir = mkdtempSync(join(tmpdir(), "sinaa-kf-"));
  const bundlePath = join(bundleDir, "bundle.js");
  await esbuild.build({
    entryPoints: [join(here, "browser-entry.ts")],
    bundle: true,
    format: "iife",
    outfile: bundlePath,
    platform: "browser",
    target: "chrome120",
    logLevel: "silent",
  });

  const { chromium } = await import("playwright");
  const launchArgs = ["--no-sandbox", "--disable-gpu-sandbox"];
  let browser;
  try {
    browser = await chromium.launch({ args: launchArgs });
  } catch (err) {
    // This package's pinned playwright may not have its own browser
    // download; fall back to a preinstalled chromium if one exists.
    const candidates = [
      process.env.SINAA_CHROMIUM,
      "/opt/pw-browsers/chromium",
    ].filter((p): p is string => !!p && existsSync(p));
    if (candidates.length === 0) throw err;
    browser = await chromium.launch({ executablePath: candidates[0], args: launchArgs });
  }

  try {
    const page = await browser.newPage({
      viewport: { width, height },
      deviceScaleFactor: 1,
    });
    const pageErrors: string[] = [];
    page.on("pageerror", (e) => pageErrors.push(String(e)));
    await page.setContent("<!doctype html><html><body></body></html>");
    await page.addScriptTag({ path: bundlePath });
    const dataUrls = (await page.evaluate(
      ([json, w, h]) =>
        (globalThis as unknown as {
          SinaaKeyframes: {
            renderAll: (j: string, w: number, h: number) => Promise<string[]>;
          };
        }).SinaaKeyframes.renderAll(json as string, w as number, h as number),
      [JSON.stringify(script), width, height] as const,
    )) as string[];
    if (pageErrors.length > 0) {
      throw new Error(`keyframe page errors: ${pageErrors.join(" | ")}`);
    }
    return dataUrls.map((u) => {
      const base64 = u.replace(/^data:image\/png;base64,/, "");
      return Buffer.from(base64, "base64");
    });
  } finally {
    await browser.close();
    // Leave the temp bundle for debugging; OS tmp cleanup handles it.
    writeFileSync(join(bundleDir, "done"), "");
  }
}
