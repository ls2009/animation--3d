import { STRUCT, box, coneG, cyl, group, put, sph, torus, type PropBuilder } from "./helpers";

export const science: Record<string, PropBuilder> = {
  atom: (c) => {
    const g = group(put(sph(0.35), c, { y: 1, tinted: true }, { emissive: "#223355" }));
    g.add(put(torus(0.85, 0.04), STRUCT.metal, { y: 1 }));
    g.add(put(torus(0.85, 0.04), STRUCT.metal, { y: 1, rx: Math.PI / 3 }));
    g.add(put(torus(0.85, 0.04), STRUCT.metal, { y: 1, rx: -Math.PI / 3 }));
    g.add(put(sph(0.1), STRUCT.light, { x: 0.85, y: 1 }));
    return g;
  },

  molecule: (c) =>
    group(
      put(sph(0.42), c, { x: -0.5, y: 0.9, tinted: true }),
      put(sph(0.32), STRUCT.light, { x: 0.55, y: 1.25 }),
      put(sph(0.32), STRUCT.light, { x: 0.45, y: 0.45 }),
      put(cyl(0.07, 0.07, 1), STRUCT.metal, { y: 1.08, rz: -1.2 }),
      put(cyl(0.07, 0.07, 1), STRUCT.metal, { y: 0.68, rz: 1.15 }),
    ),

  electron: (c) =>
    group(put(sph(0.4), c, { y: 0.4, tinted: true }, { emissive: "#2a3f66", roughness: 0.3 })),

  beaker: (c) =>
    group(
      put(cyl(0.65, 0.65, 1.6, 20), STRUCT.glass, { y: 0.8 }, { opacity: 0.3 }),
      put(cyl(0.58, 0.58, 0.8, 20), c, { y: 0.45, tinted: true }, { opacity: 0.8 }),
      put(torus(0.65, 0.04), STRUCT.glass, { y: 1.6, rx: Math.PI / 2 }, { opacity: 0.5 }),
    ),

  flask: (c) =>
    group(
      put(coneG(0.8, 1.3, 20), STRUCT.glass, { y: 0.65 }, { opacity: 0.3 }),
      put(cyl(0.18, 0.18, 0.7, 16), STRUCT.glass, { y: 1.65 }, { opacity: 0.3 }),
      put(coneG(0.72, 0.9, 20), c, { y: 0.45, tinted: true }, { opacity: 0.8 }),
    ),

  "test-tube": (c) =>
    group(
      put(cyl(0.22, 0.22, 1.7, 16), STRUCT.glass, { y: 0.95 }, { opacity: 0.3 }),
      put(sph(0.22), STRUCT.glass, { y: 0.12 }, { opacity: 0.3 }),
      put(cyl(0.18, 0.18, 0.7, 16), c, { y: 0.55, tinted: true }, { opacity: 0.85 }),
    ),

  magnet: (c) => {
    const g = group();
    g.add(put(box(0.5, 1.4, 0.5), c, { x: -0.55, y: 0.9, tinted: true }));
    g.add(put(box(0.5, 1.4, 0.5), c, { x: 0.55, y: 0.9, tinted: true }));
    const arcPart = put(torus(0.55, 0.26, 14, 20), c, { y: 1.6, rz: 0, tinted: true });
    arcPart.scale.set(1, 0.8, 1);
    g.add(arcPart);
    g.add(put(box(0.52, 0.3, 0.52), STRUCT.light, { x: -0.55, y: 0.35 }));
    g.add(put(box(0.52, 0.3, 0.52), STRUCT.light, { x: 0.55, y: 0.35 }));
    return g;
  },

  prism: (c) => {
    const g = group(put(coneG(1, 1.8, 3), c, { y: 0.9, tinted: true }, { opacity: 0.55, roughness: 0.2 }));
    return g;
  },

  "dna-helix": (c) => {
    const g = group();
    const turns = 2, steps = 16, H = 2.8;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const a = t * turns * Math.PI * 2;
      const y = 0.15 + t * (H - 0.3);
      g.add(put(sph(0.14), c, { x: Math.cos(a) * 0.5, y, z: Math.sin(a) * 0.5, tinted: true }));
      g.add(put(sph(0.14), c, { x: -Math.cos(a) * 0.5, y, z: -Math.sin(a) * 0.5, tinted: true }));
      if (i % 2 === 0) {
        g.add(put(cyl(0.045, 0.045, 1), STRUCT.light, { y, rz: Math.PI / 2, ry: -a }));
      }
    }
    return g;
  },

  microscope: (c) =>
    group(
      put(cyl(0.7, 0.8, 0.25, 20), STRUCT.dark, { y: 0.125 }),
      put(cyl(0.12, 0.12, 1.2), c, { x: -0.25, y: 0.9, rz: 0.35, tinted: true }),
      put(cyl(0.16, 0.16, 0.9), c, { x: 0.18, y: 1.55, rz: -0.5, tinted: true }),
      put(box(0.8, 0.08, 0.6), STRUCT.metal, { y: 0.8 }),
    ),

  thermometer: (c) =>
    group(
      put(cyl(0.14, 0.14, 1.6, 16), STRUCT.glass, { y: 1.05 }, { opacity: 0.35 }),
      put(sph(0.26), c, { y: 0.26, tinted: true }),
      put(cyl(0.06, 0.06, 1.2), c, { y: 0.95, tinted: true }),
    ),

  battery: (c) =>
    group(
      put(cyl(0.55, 0.55, 1.8, 24), c, { y: 0.9, tinted: true }),
      put(cyl(0.56, 0.56, 0.35, 24), STRUCT.dark, { y: 0.2 }),
      put(cyl(0.18, 0.18, 0.2, 16), STRUCT.metal, { y: 1.9 }),
    ),

  lightbulb: (c) =>
    group(
      put(cyl(0.22, 0.26, 0.5, 16), STRUCT.metal, { y: 0.25 }),
      put(sph(0.55), c, { y: 1.05, tinted: true }, { opacity: 0.65, emissive: "#5a5230", roughness: 0.2 }),
    ),
};
