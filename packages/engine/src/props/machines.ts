import { STRUCT, box, coneG, cyl, group, put, sph, torus, type PropBuilder } from "./helpers";

export const machines: Record<string, PropBuilder> = {
  piston: (c) =>
    group(
      // Crown with ring grooves.
      put(cyl(0.6, 0.6, 0.75, 24), c, { y: 1.62, tinted: true }, { metalness: 0.65, roughness: 0.3 }),
      put(torus(0.6, 0.025, 8, 28), STRUCT.dark, { y: 1.88, rx: Math.PI / 2 }),
      put(torus(0.6, 0.025, 8, 28), STRUCT.dark, { y: 1.74, rx: Math.PI / 2 }),
      // Skirt.
      put(cyl(0.56, 0.56, 0.3, 24), c, { y: 1.18, tinted: true }, { metalness: 0.55, roughness: 0.4 }),
      // Wrist pin through the skirt.
      put(cyl(0.12, 0.12, 0.7, 12), STRUCT.metal, { y: 1.18, rx: Math.PI / 2 }, { metalness: 0.8 }),
      // Connecting rod down to the big end.
      put(box(0.22, 1, 0.14), STRUCT.metal, { y: 0.72, rz: 0.12 }, { metalness: 0.7 }),
      put(torus(0.22, 0.08, 10, 18), STRUCT.dark, { y: 0.28 }),
      put(cyl(0.14, 0.14, 0.5, 12), STRUCT.metal, { y: 0.28, rx: Math.PI / 2 }, { metalness: 0.8 }),
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
      put(cyl(0.85, 0.85, 0.3, 32), c, { y: 1, rx: Math.PI / 2, tinted: true }, { metalness: 0.65, roughness: 0.35 }),
      put(cyl(0.26, 0.26, 0.38, 16), STRUCT.dark, { y: 1, rx: Math.PI / 2 }),
      put(torus(0.55, 0.045, 8, 28), STRUCT.dark, { y: 1 }),
    );
    // Teeth around the rim, in the same vertical plane as the disc.
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      g.add(put(box(0.22, 0.26, 0.3), c, {
        x: Math.cos(a) * 0.95, y: 1 + Math.sin(a) * 0.95, rz: a, tinted: true,
      }, { metalness: 0.65, roughness: 0.35 }));
    }
    // Spokes between hub and rim.
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 8;
      g.add(put(box(0.5, 0.12, 0.2), STRUCT.metal, {
        x: Math.cos(a) * 0.38, y: 1 + Math.sin(a) * 0.38, rz: a,
      }, { metalness: 0.7 }));
    }
    return g;
  },

  turbine: (c) => {
    const g = group(
      put(cyl(0.22, 0.22, 0.6, 14), STRUCT.dark, { y: 1, rx: Math.PI / 2 }),
      // Nose cone.
      put(coneG(0.2, 0.35, 14), STRUCT.metal, { y: 1, z: 0.42, rx: Math.PI / 2 }, { metalness: 0.75 }),
    );
    // Two stages of angled blades.
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      g.add(put(box(0.2, 0.72, 0.06), c, {
        x: Math.cos(a) * 0.52, y: 1 + Math.sin(a) * 0.52, rz: a + Math.PI / 2, ry: 0.55, tinted: true,
      }, { metalness: 0.7, roughness: 0.25 }));
      g.add(put(box(0.14, 0.3, 0.05), c, {
        x: Math.cos(a) * 0.92, y: 1 + Math.sin(a) * 0.92, rz: a + Math.PI / 2, ry: 0.35, tinted: true,
      }, { metalness: 0.7, roughness: 0.25 }));
    }
    // Shroud rings.
    g.add(put(torus(1, 0.08, 12, 36), STRUCT.metal, { y: 1 }, { metalness: 0.75 }));
    g.add(put(torus(1, 0.045, 8, 36), STRUCT.dark, { y: 1, z: 0.16 }));
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
