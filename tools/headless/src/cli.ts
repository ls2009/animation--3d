/**
 * CLI: pnpm keyframes <script.json> <outDir> [--backend auto|gl|playwright]
 *                                            [--width 960] [--height 540]
 *
 * Validates the script (repairs are printed, never silent), renders one PNG
 * per scene at its midpoint, and writes scene-01.png … scene-NN.png.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import { validateScript } from "@sinaa/engine";
import { renderKeyframes, type Backend } from "./index";

function fail(msg: string): never {
  process.stderr.write(`keyframes: ${msg}\n`);
  process.exit(1);
}

const argv = process.argv.slice(2);
const positional: string[] = [];
const flags = new Map<string, string>();
for (let i = 0; i < argv.length; i++) {
  const a = argv[i]!;
  if (a.startsWith("--")) {
    flags.set(a.slice(2), argv[++i] ?? "");
  } else {
    positional.push(a);
  }
}

if (positional.length !== 2) {
  fail("usage: pnpm keyframes <script.json> <outDir> [--backend auto|gl|playwright] [--width N] [--height N]");
}

// pnpm runs package scripts from the package dir; resolve user paths from
// where the command was typed.
const base = process.env.INIT_CWD ?? process.cwd();
const abs = (p: string) => (isAbsolute(p) ? p : resolve(base, p));

const scriptPath = abs(positional[0]!);
const outDir = abs(positional[1]!);
const backend = (flags.get("backend") ?? "auto") as Backend | "auto";
const width = Number(flags.get("width") ?? 960);
const height = Number(flags.get("height") ?? 540);

let raw: unknown;
try {
  raw = JSON.parse(readFileSync(scriptPath, "utf8"));
} catch (err) {
  fail(`cannot read ${scriptPath}: ${(err as Error).message}`);
}

const { script, warnings, stats } = validateScript(raw);
if (warnings.length > 0) {
  process.stderr.write(`validator repairs (${warnings.length}):\n`);
  for (const w of warnings) {
    process.stderr.write(`  [${w.code}] ${w.path}: ${w.message}\n`);
  }
}

const started = Date.now();
const result = await renderKeyframes(script, { backend, width, height });
mkdirSync(outDir, { recursive: true });
result.pngs.forEach((png, i) => {
  const file = join(outDir, `scene-${String(i + 1).padStart(2, "0")}.png`);
  writeFileSync(file, png);
  process.stdout.write(`${file} (${png.length} bytes)\n`);
});
process.stdout.write(
  `rendered ${result.pngs.length} scenes via ${result.backend} in ${Date.now() - started}ms ` +
    `(${stats.repairCount} repairs)\n`,
);
