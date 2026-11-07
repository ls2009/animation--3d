/**
 * Actor colour palette. Scripts reference colours by one-letter key or by
 * literal #rrggbb. Keys are stable API: the crew prompts list them.
 */
export const PALETTE = {
  a: "#4f8ef7", // blue
  b: "#34c77b", // green
  c: "#f7b84f", // amber
  d: "#ef5b5b", // red
  e: "#9b6ef3", // purple
  f: "#8a929e", // steel (default)
  g: "#3dd6d0", // teal
  o: "#f97316", // orange
} as const;

export type PaletteKey = keyof typeof PALETTE;

export const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export function isPaletteKey(value: string): value is PaletteKey {
  return Object.prototype.hasOwnProperty.call(PALETTE, value);
}

/** Resolve a palette key or #rrggbb literal to a hex colour. */
export function resolveColor(value: string | undefined, fallback = PALETTE.f): string {
  if (!value) return fallback;
  if (isPaletteKey(value)) return PALETTE[value];
  if (HEX_RE.test(value)) return value.toLowerCase();
  return fallback;
}
