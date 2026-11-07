/**
 * Prop registry: name -> builder, with the glTF upgrade path.
 *
 * Loader order per contract: a .glb under packages/engine/assets/<name>.glb
 * takes precedence over composed primitives — same name, same contract, so
 * scripts never change when a prop is upgraded. No models are bundled in
 * this build; the assets folder ships empty and `registerGltfResolver` is
 * the hook apps use to serve .glb files when they exist.
 */
import type { Group } from "three";
import { PROP_META, PROP_NAMES, PROP_ALIASES, PROP_LIBRARY_VERSION } from "./meta";
import type { PropBuilder } from "./helpers";
import { primitives } from "./primitives";
import { nature } from "./nature";
import { science } from "./science";
import { machines } from "./machines";
import { business } from "./business";
import { tech } from "./tech";
import { body } from "./body";

export { PROP_META, PROP_NAMES, PROP_ALIASES, PROP_LIBRARY_VERSION };
export type { PropBuilder };

export const PROP_BUILDERS: Readonly<Record<string, PropBuilder>> = {
  ...primitives,
  ...nature,
  ...science,
  ...machines,
  ...business,
  ...tech,
  ...body,
};

export type GltfResolver = (name: string) => Group | undefined;

let gltfResolver: GltfResolver | undefined;

/**
 * Apps that pre-load .glb assets register a resolver here. When it returns a
 * Group for a name, that model is used instead of composed primitives.
 */
export function registerGltfResolver(resolver: GltfResolver | undefined): void {
  gltfResolver = resolver;
}

/** Canonical name for a requested prop: exact, alias, or undefined. */
export function resolvePropName(requested: string): string | undefined {
  const name = requested.toLowerCase().trim();
  if (PROP_NAMES.has(name)) return name;
  return PROP_ALIASES.get(name);
}

/**
 * Build a prop group. Unknown names fall back to "block" — callers that need
 * to log a repair should resolve via the validator first.
 */
export function buildProp(name: string, colorHex: string): Group {
  const canonical = resolvePropName(name) ?? "block";
  const fromGltf = gltfResolver?.(canonical);
  if (fromGltf) return fromGltf;
  const builder = PROP_BUILDERS[canonical] ?? PROP_BUILDERS.block!;
  return builder(colorHex);
}
