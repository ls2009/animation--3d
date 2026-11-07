/**
 * Validator bridge for non-TS callers (the Python pipeline). Reads a raw
 * script JSON from stdin, runs validateScript, writes a structured JSON
 * result to stdout. Always exits 0 with a structured body unless the
 * process itself crashes — callers branch on `ok`.
 *
 * Usage: node_modules/.bin/tsx packages/engine/scripts/validate-cli.ts < script.json
 */
import { validateScript } from "../src/validator";
import { BadInputError, NoScenesError } from "../src/repairs";

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

const input = await readStdin();
let raw: unknown;
try {
  raw = JSON.parse(input);
} catch (err) {
  process.stdout.write(
    JSON.stringify({ ok: false, error: { code: "bad_json", message: (err as Error).message } }),
  );
  process.exit(0);
}

try {
  const { script, warnings, stats } = validateScript(raw);
  process.stdout.write(JSON.stringify({ ok: true, script, warnings, stats }));
} catch (err) {
  const code =
    err instanceof NoScenesError ? "no_scenes" : err instanceof BadInputError ? "bad_input" : "internal";
  process.stdout.write(
    JSON.stringify({ ok: false, error: { code, message: (err as Error).message } }),
  );
}
process.exit(0);
