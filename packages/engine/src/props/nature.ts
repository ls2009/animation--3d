import { STRUCT, box, coneG, cyl, group, put, sph, torus, type PropBuilder } from "./helpers";

export const nature: Record<string, PropBuilder> = {
  tree: (c) => {
    const g = group(
      // Flared trunk and two branches.
      put(cyl(0.16, 0.3, 1.3, 10), STRUCT.wood, { y: 0.65 }),
      put(cyl(0.07, 0.1, 0.7, 8), STRUCT.wood, { x: 0.28, y: 1.45, rz: -0.7 }),
      put(cyl(0.06, 0.09, 0.6, 8), STRUCT.wood, { x: -0.25, y: 1.35, rz: 0.8 }),
    );
    // Clustered canopy puffs instead of one blob.
    const puffs: [number, number, number, number][] = [
      [0, 2.1, 0, 0.85], [0.55, 2.35, 0.1, 0.6], [-0.55, 2.3, -0.05, 0.62],
      [0.15, 2.7, -0.2, 0.55], [-0.2, 1.85, 0.45, 0.5], [0.3, 1.9, -0.45, 0.5],
    ];
    for (const [x, y, z, r] of puffs) {
      g.add(put(sph(r, 16), c, { x, y, z, tinted: true }, { roughness: 0.8 }));
    }
    return g;
  },

  leaf: (c) => {
    const blade = put(sph(0.85, 20), c, { y: 1.35, tinted: true }, { roughness: 0.6 });
    blade.scale.set(0.95, 1.05, 0.22);
    const g = group(
      put(cyl(0.05, 0.07, 0.8, 8), STRUCT.wood, { y: 0.4, rz: 0.08 }),
      blade,
      // Midrib up the front face.
      put(cyl(0.025, 0.035, 1.6, 6), "#2e5c38", { y: 1.35, z: 0.2 }),
    );
    // Paired side veins.
    for (let i = 0; i < 3; i++) {
      const y = 0.95 + i * 0.38;
      const len = 0.7 - i * 0.14;
      g.add(put(cyl(0.018, 0.022, len, 6), "#2e5c38", { x: len / 2 - 0.05, y, z: 0.2, rz: Math.PI / 2 - 0.5 }));
      g.add(put(cyl(0.018, 0.022, len, 6), "#2e5c38", { x: -len / 2 + 0.05, y, z: 0.2, rz: 0.5 - Math.PI / 2 }));
    }
    const tip = put(sph(0.2, 10), c, { y: 2.25, tinted: true }, { roughness: 0.6 });
    tip.scale.set(0.5, 0.8, 0.2);
    g.add(tip);
    return g;
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
    const g = group(
      put(sph(0.85, 24), c, { y: 1.45, tinted: true }, { emissive: "#e8960f", emissiveIntensity: 0.85, roughness: 0.25 }),
    );
    // Alternating long/short tapered rays.
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const long = i % 2 === 0;
      const r = long ? 1.2 : 1.08;
      g.add(put(coneG(long ? 0.09 : 0.07, long ? 0.5 : 0.3, 6), c, {
        x: Math.cos(a) * r, y: 1.45 + Math.sin(a) * r, rz: a - Math.PI / 2, tinted: true,
      }, { emissive: "#e8960f", emissiveIntensity: 0.7 }));
    }
    // Faint corona ring.
    g.add(put(torus(1.02, 0.025, 8, 32), c, { y: 1.45, tinted: true }, { emissive: "#e8960f", opacity: 0.35 }));
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
