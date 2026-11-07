import { CylinderGeometry } from "three";
import { STRUCT, box, coneG, cyl, group, put, sph, torus, type PropBuilder } from "./helpers";

export const business: Record<string, PropBuilder> = {
  coin: (c) =>
    group(
      put(cyl(0.6, 0.6, 0.3, 24), c, { y: 0.15, tinted: true }, { metalness: 0.8, roughness: 0.3 }),
      put(torus(0.5, 0.04), c, { y: 0.31, rx: Math.PI / 2, tinted: true }, { metalness: 0.8 }),
    ),

  banknote: (c) =>
    group(
      put(box(1.9, 0.06, 1), c, { y: 0.03, tinted: true }),
      put(cyl(0.22, 0.22, 0.08, 16), STRUCT.light, { y: 0.07 }),
    ),

  "bar-chart": (c) =>
    group(
      put(box(2.2, 0.1, 1), STRUCT.light, { y: 0.05 }),
      put(box(0.4, 0.7, 0.4), c, { x: -0.7, y: 0.45, tinted: true }),
      put(box(0.4, 1.2, 0.4), c, { y: 0.7, tinted: true }),
      put(box(0.4, 1.8, 0.4), c, { x: 0.7, y: 1, tinted: true }),
    ),

  "pie-chart": (c) => {
    const g = group(put(cyl(1, 1, 0.3, 24), STRUCT.light, { y: 0.15 }));
    const sliceGeom = new CylinderGeometry(1.02, 1.02, 0.34, 24, 1, false, 0, Math.PI * 0.6);
    g.add(put(sliceGeom, c, { y: 0.15, tinted: true }));
    return g;
  },

  "graph-line": (c) => {
    const g = group(
      put(box(0.08, 1.8, 0.08), STRUCT.dark, { x: -1.1, y: 0.9 }),
      put(box(2.3, 0.08, 0.08), STRUCT.dark, { y: 0.06 }),
    );
    const pts = [
      [-0.9, 0.35], [-0.3, 0.8], [0.3, 0.6], [0.95, 1.5],
    ] as const;
    for (let i = 0; i < pts.length - 1; i++) {
      const [x1, y1] = pts[i]!, [x2, y2] = pts[i + 1]!;
      const dx = x2 - x1, dy = y2 - y1;
      const len = Math.hypot(dx, dy);
      g.add(put(box(len, 0.09, 0.09), c, {
        x: (x1 + x2) / 2, y: (y1 + y2) / 2, rz: Math.atan2(dy, dx), tinted: true,
      }));
    }
    return g;
  },

  briefcase: (c) =>
    group(
      put(box(1.7, 1.1, 0.5), c, { y: 0.55, tinted: true }),
      put(torus(0.28, 0.06, 10, 18), STRUCT.dark, { y: 1.25 }),
      put(box(1.7, 0.08, 0.52), STRUCT.dark, { y: 0.85 }),
    ),

  building: (c) => {
    const g = group(put(box(1.6, 3.8, 1.6), c, { y: 1.9, tinted: true }));
    for (let fy = 0; fy < 5; fy++) {
      for (let fx = -1; fx <= 1; fx++) {
        g.add(put(box(0.3, 0.35, 0.05), "#f3e9b0", { x: fx * 0.5, y: 0.6 + fy * 0.68, z: 0.81 }, { emissive: "#6a6030" }));
      }
    }
    return g;
  },

  factory: (c) =>
    group(
      put(box(2.8, 1.4, 1.8), c, { y: 0.7, tinted: true }),
      put(cyl(0.22, 0.26, 1.3, 12), STRUCT.dark, { x: -0.9, y: 2 }),
      put(cyl(0.22, 0.26, 1, 12), STRUCT.dark, { x: -0.3, y: 1.85 }),
      put(coneG(0.6, 0.7, 4), STRUCT.mid, { x: 0.9, y: 1.75, ry: Math.PI / 4 }),
    ),

  "shopping-cart": (c) =>
    group(
      put(box(1.3, 0.7, 0.9), c, { y: 0.75, tinted: true }, { opacity: 0.85 }),
      put(cyl(0.16, 0.16, 0.1, 12), STRUCT.dark, { x: -0.45, y: 0.16, rx: Math.PI / 2 }),
      put(cyl(0.16, 0.16, 0.1, 12), STRUCT.dark, { x: 0.45, y: 0.16, rx: Math.PI / 2 }),
      put(cyl(0.05, 0.05, 0.9), STRUCT.metal, { x: 0.75, y: 0.9, rz: -0.5 }),
    ),

  "scale-balance": (c) =>
    group(
      put(cyl(0.3, 0.45, 0.15, 16), STRUCT.dark, { y: 0.08 }),
      put(cyl(0.07, 0.07, 1.5), STRUCT.metal, { y: 0.9 }),
      put(box(2, 0.08, 0.12), c, { y: 1.65, rz: 0.12, tinted: true }),
      put(cyl(0.4, 0.4, 0.08, 16), c, { x: -0.95, y: 1.45, tinted: true }),
      put(cyl(0.4, 0.4, 0.08, 16), c, { x: 0.95, y: 1.75, tinted: true }),
    ),

  vault: (c) =>
    group(
      put(box(1.8, 1.8, 1.4), c, { y: 0.9, tinted: true }, { metalness: 0.5 }),
      put(cyl(0.45, 0.45, 0.1, 20), STRUCT.metal, { y: 0.95, z: 0.73, rx: Math.PI / 2 }, { metalness: 0.8 }),
      put(torus(0.28, 0.05, 10, 16), STRUCT.dark, { y: 0.95, z: 0.8 }),
    ),

  package: (c) =>
    group(
      put(box(1.3, 1.1, 1.3), c, { y: 0.55, tinted: true }, { roughness: 0.85 }),
      put(box(1.34, 0.18, 0.4), STRUCT.light, { y: 0.55 }),
      put(box(0.4, 0.18, 1.34), STRUCT.light, { y: 0.55 }),
    ),

  person: (c) =>
    group(
      put(cyl(0.32, 0.42, 1.1, 16), c, { y: 0.95, tinted: true }),
      put(sph(0.34), "#e8c39e", { y: 1.95 }),
      put(cyl(0.1, 0.1, 0.7, 10), c, { x: -0.45, y: 1.2, rz: 0.35, tinted: true }),
      put(cyl(0.1, 0.1, 0.7, 10), c, { x: 0.45, y: 1.2, rz: -0.35, tinted: true }),
      put(cyl(0.12, 0.12, 0.45, 10), STRUCT.dark, { x: -0.16, y: 0.22 }),
      put(cyl(0.12, 0.12, 0.45, 10), STRUCT.dark, { x: 0.16, y: 0.22 }),
    ),
};
