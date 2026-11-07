/**
 * Generate props.catalog.json from the prop metadata (build-time artifact;
 * the pipeline embeds catalogue names grouped by domain in prompts).
 * Run: pnpm --filter @sinaa/engine gen:catalog
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PROP_LIBRARY_VERSION, PROP_META } from "../src/props/meta";

const out = join(dirname(fileURLToPath(import.meta.url)), "..", "props.catalog.json");
const catalog = {
  version: PROP_LIBRARY_VERSION,
  count: PROP_META.length,
  props: PROP_META.map(({ name, domain, aliases, height, footprint, transparent, tags }) => ({
    name,
    domain,
    aliases,
    height,
    footprint,
    transparent,
    tags,
  })),
};
writeFileSync(out, JSON.stringify(catalog, null, 2) + "\n");
console.log(`wrote ${out} (${catalog.count} props)`);
