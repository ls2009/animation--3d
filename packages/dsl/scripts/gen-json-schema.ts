/**
 * Generate schema.json (JSON Schema) from the Zod source of truth.
 * The pipeline embeds this in model prompts. Run: pnpm --filter @sinaa/dsl gen
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { zodToJsonSchema } from "zod-to-json-schema";
import { ScriptSchema } from "../src/schema";

const out = join(dirname(fileURLToPath(import.meta.url)), "..", "schema.json");
const jsonSchema = zodToJsonSchema(ScriptSchema, {
  name: "SceneScript",
  target: "jsonSchema7",
});
writeFileSync(out, JSON.stringify(jsonSchema, null, 2) + "\n");
console.log(`wrote ${out}`);
