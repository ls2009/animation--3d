import { STRUCT, box, coneG, cyl, group, put, sph, type PropBuilder } from "./helpers";

export const nature: Record<string, PropBuilder> = {
  tree: (c) =>
    group(
      put(cyl(0.18, 0.25, 1.2), STRUCT.wood, { y: 0.6 }),
      put(sph(0.9), c, { y: 1.9, tinted: true }),
      put(sph(0.6), c, { x: 0.5, y: 2.3, tinted: true }),
      put(sph(0.55), c, { x: -0.5, y: 2.25, tinted: true }),
    ),

  leaf: (c) => {
    const blade = put(sph(0.8), c, { y: 1.3, tinted: true });
    blade.scale.set(1, 0.9, 0.25);
    return group(put(cyl(0.05, 0.05, 0.8), STRUCT.wood, { y: 0.4 }), blade);
  },

  flower: (c) => {
    const g = group(put(cyl(0.06, 0.06, 1.2), STRUCT.green, { y: 0.6 }));
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const petal = put(sph(0.28), c, { x: Math.cos(a) * 0.35, y: 1.45, z: Math.sin(a) * 0.35, tinted: true });
      petal.scale.set(1, 0.5, 1);
      g.add(petal);
    }
    g.add(put(sph(0.22), "#f7d84f", { y: 1.45 }));
    return g;
  },

  sun: (c) => {
    const g = group(put(sph(0.8), c, { y: 1.45, tinted: true }, { emissive: "#c88a1e", roughness: 0.3 }));
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      g.add(put(cyl(0.05, 0.05, 0.5), c, {
        x: Math.cos(a) * 1.15, y: 1.45 + Math.sin(a) * 1.15, rz: a + Math.PI / 2, tinted: true,
      }, { emissive: "#c88a1e" }));
    }
    return g;
  },

  cloud: (c) =>
    group(
      put(sph(0.7), c, { x: -0.7, y: 1.1, tinted: true }, { roughness: 0.9 }),
      put(sph(0.9), c, { y: 1.3, tinted: true }, { roughness: 0.9 }),
      put(sph(0.65), c, { x: 0.75, y: 1.1, tinted: true }, { roughness: 0.9 }),
    ),

  raindrop: (c) =>
    group(
      put(sph(0.35), c, { y: 0.4, tinted: true }, { opacity: 0.7 }),
      put(coneG(0.32, 0.5), c, { y: 0.85, tinted: true }, { opacity: 0.7 }),
    ),

  mountain: (c) =>
    group(
      put(coneG(1.8, 2.6, 5), c, { y: 1.3, tinted: true }, { roughness: 0.95 }),
      put(coneG(0.55, 0.8, 5), STRUCT.light, { y: 2.55 }),
    ),

  river: (c) => {
    const g = group();
    const bed = put(box(4, 0.15, 1.2), c, { y: 0.1, tinted: true }, { opacity: 0.75, roughness: 0.25 });
    g.add(bed);
    g.add(put(box(4, 0.1, 0.15), STRUCT.wood, { y: 0.1, z: 0.72 }));
    g.add(put(box(4, 0.1, 0.15), STRUCT.wood, { y: 0.1, z: -0.72 }));
    return g;
  },

  seed: (c) => {
    const s = put(sph(0.35), c, { y: 0.35, tinted: true });
    s.scale.set(1, 1.25, 0.8);
    return group(s);
  },

  root: (c) =>
    group(
      put(cyl(0.12, 0.2, 1), c, { y: 0.6, tinted: true }),
      put(cyl(0.06, 0.1, 0.7), c, { x: 0.25, y: 0.3, rz: 0.6, tinted: true }),
      put(cyl(0.06, 0.1, 0.7), c, { x: -0.25, y: 0.3, rz: -0.6, tinted: true }),
    ),

  "grass-patch": (c) => {
    const g = group(put(cyl(1.2, 1.2, 0.12, 16), STRUCT.wood, { y: 0.06 }));
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      g.add(put(coneG(0.07, 0.5, 6), c, {
        x: Math.cos(a) * 0.7, y: 0.37, z: Math.sin(a) * 0.7, tinted: true,
      }));
    }
    return g;
  },

  bee: (c) => {
    const body = put(sph(0.35), c, { y: 0.75, tinted: true });
    body.scale.set(1.3, 1, 1);
    const w1 = put(sph(0.22), STRUCT.light, { x: 0.1, y: 1.05, z: 0.22 }, { opacity: 0.6 });
    w1.scale.set(1.4, 0.3, 1);
    const w2 = put(sph(0.22), STRUCT.light, { x: 0.1, y: 1.05, z: -0.22 }, { opacity: 0.6 });
    w2.scale.set(1.4, 0.3, 1);
    return group(body, put(sph(0.2), STRUCT.dark, { x: 0.45, y: 0.75 }), w1, w2);
  },

  apple: (c) =>
    group(
      put(sph(0.5), c, { y: 0.5, tinted: true }),
      put(cyl(0.04, 0.04, 0.3), STRUCT.wood, { y: 1.05 }),
      put(sph(0.12), STRUCT.green, { x: 0.12, y: 1.15 }),
    ),
};
