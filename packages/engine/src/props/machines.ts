import { STRUCT, box, coneG, cyl, group, put, sph, torus, type PropBuilder } from "./helpers";

export const machines: Record<string, PropBuilder> = {
  piston: (c) =>
    group(
      put(cyl(0.6, 0.6, 0.7, 24), c, { y: 1.65, tinted: true }, { metalness: 0.6, roughness: 0.35 }),
      put(cyl(0.16, 0.16, 1.1), STRUCT.metal, { y: 0.75 }, { metalness: 0.7 }),
      put(sph(0.22), STRUCT.dark, { y: 0.22 }),
    ),

  "engine-cylinder": (c) =>
    group(
      put(cyl(0.8, 0.8, 2.6, 24), c, { y: 1.3, tinted: true }, { opacity: 0.35, roughness: 0.25 }),
      put(cyl(0.9, 0.9, 0.25, 24), STRUCT.dark, { y: 2.85 }),
      put(cyl(0.9, 0.9, 0.2, 24), STRUCT.dark, { y: 0.1 }),
    ),

  crankshaft: (c) =>
    group(
      put(cyl(0.16, 0.16, 2.4), STRUCT.metal, { y: 0.75, rz: Math.PI / 2 }, { metalness: 0.7 }),
      put(box(0.25, 0.9, 0.5), c, { x: -0.5, y: 0.75, tinted: true }, { metalness: 0.5 }),
      put(box(0.25, 0.9, 0.5), c, { x: 0.5, y: 0.75, tinted: true }, { metalness: 0.5 }),
      put(cyl(0.14, 0.14, 0.5), STRUCT.metal, { y: 1.15, rz: Math.PI / 2 }, { metalness: 0.7 }),
    ),

  valve: (c) =>
    group(
      put(cyl(0.08, 0.08, 0.9), STRUCT.metal, { y: 0.75 }, { metalness: 0.7 }),
      put(cyl(0.35, 0.3, 0.12, 20), c, { y: 0.26, tinted: true }, { metalness: 0.6 }),
      put(cyl(0.14, 0.14, 0.12), STRUCT.dark, { y: 1.2 }),
    ),

  "spark-plug": (c) =>
    group(
      put(cyl(0.1, 0.1, 0.3, 12), STRUCT.metal, { y: 0.15 }),
      put(cyl(0.16, 0.16, 0.35, 6), STRUCT.metal, { y: 0.47 }, { metalness: 0.6 }),
      put(cyl(0.14, 0.14, 0.45, 12), c, { y: 0.85, tinted: true }),
      put(cyl(0.06, 0.06, 0.25, 8), STRUCT.dark, { y: 1.15 }),
    ),

  gear: (c) => {
    const g = group(
      put(cyl(0.8, 0.8, 0.3, 24), c, { y: 1, rx: Math.PI / 2, tinted: true }, { metalness: 0.6 }),
      put(cyl(0.2, 0.2, 0.34, 16), STRUCT.dark, { y: 1, rx: Math.PI / 2 }),
    );
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      g.add(put(box(0.25, 0.3, 0.25), c, {
        x: Math.cos(a) * 0.9, y: 1, z: Math.sin(a) * 0.9, ry: -a, tinted: true,
      }, { metalness: 0.6 }));
    }
    return g;
  },

  turbine: (c) => {
    const g = group(put(cyl(0.18, 0.18, 0.5, 12), STRUCT.dark, { y: 1, rx: Math.PI / 2 }));
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const blade = put(box(0.18, 0.75, 0.05), c, {
        x: Math.cos(a) * 0.45, y: 1 + Math.sin(a) * 0.45, rz: a + Math.PI / 2, ry: 0.5, tinted: true,
      }, { metalness: 0.65, roughness: 0.3 });
      g.add(blade);
    }
    g.add(put(torus(0.95, 0.07), STRUCT.metal, { y: 1 }));
    return g;
  },

  fan: (c) => {
    const g = group(
      put(cyl(0.3, 0.4, 0.4, 16), STRUCT.dark, { y: 0.2 }),
      put(cyl(0.08, 0.08, 0.8), STRUCT.metal, { y: 0.7 }),
      put(sph(0.16), STRUCT.dark, { y: 1.1 }),
    );
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const blade = put(box(0.5, 0.8, 0.04), c, {
        x: Math.cos(a) * 0.42, y: 1.1 + Math.sin(a) * 0.42, rz: a + Math.PI / 2, ry: 0.4, tinted: true,
      });
      g.add(blade);
    }
    return g;
  },

  spring: (c) => {
    const g = group();
    const coils = 6, H = 1.8;
    for (let i = 0; i < coils; i++) {
      g.add(put(torus(0.35, 0.07), c, { y: 0.2 + (i * H) / coils, rx: Math.PI / 2, tinted: true }, { metalness: 0.6 }));
    }
    return g;
  },

  wheel: (c) => {
    const g = group(
      put(torus(0.75, 0.25, 16, 28), STRUCT.dark, { y: 1 }),
      put(cyl(0.18, 0.18, 0.3, 16), c, { y: 1, rx: Math.PI / 2, tinted: true }, { metalness: 0.6 }),
    );
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      g.add(put(cyl(0.05, 0.05, 1.3), c, { y: 1, rz: a, tinted: true }, { metalness: 0.6 }));
    }
    return g;
  },

  lever: (c) =>
    group(
      put(coneG(0.4, 0.6, 4), STRUCT.dark, { y: 0.3 }),
      put(box(3, 0.12, 0.35), c, { y: 0.68, rz: 0.18, tinted: true }),
    ),

  pulley: (c) =>
    group(
      put(box(0.15, 1.6, 0.15), STRUCT.metal, { y: 0.8 }),
      put(cyl(0.5, 0.5, 0.2, 20), c, { x: 0.0, y: 1.45, rx: Math.PI / 2, tinted: true }),
      put(torus(0.5, 0.05), STRUCT.dark, { y: 1.45 }),
      put(cyl(0.04, 0.04, 1.4), STRUCT.dark, { x: 0.5, y: 0.75 }),
    ),

  pump: (c) =>
    group(
      put(box(1.2, 0.8, 0.9), c, { y: 0.4, tinted: true }),
      put(cyl(0.3, 0.3, 0.6, 16), STRUCT.metal, { y: 1.1 }),
      put(cyl(0.16, 0.16, 0.9), STRUCT.metal, { x: 0.8, y: 0.55, rz: Math.PI / 2 }),
      put(sph(0.3), STRUCT.dark, { y: 1.5 }),
    ),
};
