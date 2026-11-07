import { STRUCT, coneG, cyl, group, put, sph, torus, type PropBuilder } from "./helpers";

export const body: Record<string, PropBuilder> = {
  heart: (c) => {
    const left = put(sph(0.55), c, { x: -0.3, y: 1.35, tinted: true });
    const right = put(sph(0.55), c, { x: 0.3, y: 1.35, tinted: true });
    const tip = put(coneG(0.72, 1.1, 20), c, { y: 0.55, rx: Math.PI, tinted: true });
    return group(left, right, tip);
  },

  lungs: (c) => {
    const l = put(sph(0.55), c, { x: -0.55, y: 0.85, tinted: true });
    l.scale.set(0.8, 1.4, 0.7);
    const r = put(sph(0.55), c, { x: 0.55, y: 0.85, tinted: true });
    r.scale.set(0.8, 1.4, 0.7);
    return group(
      l, r,
      put(cyl(0.12, 0.12, 0.9), STRUCT.light, { y: 1.65 }),
      put(cyl(0.09, 0.09, 0.5), STRUCT.light, { x: -0.25, y: 1.25, rz: 0.8 }),
      put(cyl(0.09, 0.09, 0.5), STRUCT.light, { x: 0.25, y: 1.25, rz: -0.8 }),
    );
  },

  "red-blood-cell": (c) => {
    const disc = put(sph(0.45), c, { y: 0.35, tinted: true });
    disc.scale.set(1, 0.45, 1);
    const dent = put(torus(0.2, 0.08, 10, 18), c, { y: 0.48, rx: Math.PI / 2, tinted: true });
    return group(disc, dent);
  },

  "white-blood-cell": (c) => {
    const g = group(put(sph(0.5), c, { y: 0.55, tinted: true }, { roughness: 0.9 }));
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      g.add(put(sph(0.12), c, {
        x: Math.cos(a) * 0.5, y: 0.55 + Math.sin(a) * 0.5, z: Math.sin(a * 2) * 0.2, tinted: true,
      }, { roughness: 0.9 }));
    }
    return g;
  },

  virus: (c) => {
    const g = group(put(sph(0.42), c, { y: 0.62, tinted: true }, { roughness: 0.8 }));
    for (let i = 0; i < 10; i++) {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / 10);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      const x = Math.sin(phi) * Math.cos(theta), y = Math.cos(phi), z = Math.sin(phi) * Math.sin(theta);
      g.add(put(sph(0.07), STRUCT.dark, { x: x * 0.5, y: 0.62 + y * 0.5, z: z * 0.5 }));
    }
    return g;
  },

  antibody: (c) =>
    group(
      put(cyl(0.09, 0.09, 0.8), c, { y: 0.4, tinted: true }),
      put(cyl(0.09, 0.09, 0.6), c, { x: -0.21, y: 0.98, rz: 0.75, tinted: true }),
      put(cyl(0.09, 0.09, 0.6), c, { x: 0.21, y: 0.98, rz: -0.75, tinted: true }),
      put(sph(0.12), c, { x: -0.42, y: 1.19, tinted: true }),
      put(sph(0.12), c, { x: 0.42, y: 1.19, tinted: true }),
    ),

  cell: (c) =>
    group(
      put(sph(1), c, { y: 1, tinted: true }, { opacity: 0.4, roughness: 0.4 }),
      put(sph(0.4), c, { y: 1, tinted: true }, { roughness: 0.7 }),
      put(sph(0.12), STRUCT.mid, { x: 0.55, y: 1.3 }),
      put(sph(0.1), STRUCT.mid, { x: -0.5, y: 0.75, z: 0.3 }),
    ),

  neuron: (c) => {
    const g = group(put(sph(0.4), c, { y: 1, tinted: true }));
    const dirs = [
      [-0.8, 0.5, 0], [-0.6, -0.4, 0.4], [0.2, 0.9, -0.3], [-0.2, -0.8, -0.4],
    ] as const;
    for (const [dx, dy, dz] of dirs) {
      const len = Math.hypot(dx, dy, dz);
      g.add(put(cyl(0.05, 0.12, len), c, {
        x: dx / 2, y: 1 + dy / 2, z: dz / 2,
        rz: -Math.atan2(dx, dy), rx: Math.atan2(dz, Math.hypot(dx, dy)), tinted: true,
      }));
    }
    g.add(put(cyl(0.07, 0.07, 1.4), c, { x: 0.75, y: 1, rz: Math.PI / 2 - 0.2, tinted: true }));
    g.add(put(sph(0.12), c, { x: 1.45, y: 1.12, tinted: true }));
    return g;
  },

  bone: (c) =>
    group(
      put(cyl(0.16, 0.16, 1.3), c, { y: 1, rz: 0.3, tinted: true }, { roughness: 0.8 }),
      put(sph(0.26), c, { x: -0.3, y: 0.42, tinted: true }, { roughness: 0.8 }),
      put(sph(0.26), c, { x: -0.05, y: 0.3, tinted: true }, { roughness: 0.8 }),
      put(sph(0.26), c, { x: 0.3, y: 1.6, tinted: true }, { roughness: 0.8 }),
      put(sph(0.26), c, { x: 0.06, y: 1.72, tinted: true }, { roughness: 0.8 }),
    ),

  stomach: (c) => {
    const main = put(sph(0.7), c, { y: 1, tinted: true });
    main.scale.set(1, 1.15, 0.8);
    return group(
      main,
      put(cyl(0.18, 0.18, 0.8), c, { x: -0.5, y: 1.85, rz: 0.5, tinted: true }),
      put(cyl(0.15, 0.15, 0.6), c, { x: 0.62, y: 0.5, rz: -0.9, tinted: true }),
    );
  },

  brain: (c) => {
    const g = group();
    const main = put(sph(0.75), c, { y: 1, tinted: true }, { roughness: 0.9 });
    main.scale.set(1, 0.85, 1.15);
    g.add(main);
    for (let i = 0; i < 6; i++) {
      const t = put(torus(0.25, 0.07, 8, 14), c, {
        x: (i % 2 ? 0.3 : -0.3), y: 1.1 + (i % 3) * 0.15, z: -0.5 + i * 0.22,
        rx: 0.4 * i, ry: 0.6 * i, tinted: true,
      }, { roughness: 0.9 });
      g.add(t);
    }
    return g;
  },

  vein: (c) =>
    group(
      put(cyl(0.3, 0.3, 3, 16), c, { y: 0.4, rz: Math.PI / 2, tinted: true }, { opacity: 0.45 }),
      put(torus(0.3, 0.04, 10, 16), STRUCT.dark, { x: -1.5, y: 0.4, ry: Math.PI / 2 }),
      put(torus(0.3, 0.04, 10, 16), STRUCT.dark, { x: 1.5, y: 0.4, ry: Math.PI / 2 }),
    ),

  syringe: (c) =>
    group(
      put(cyl(0.02, 0.02, 0.5, 8), STRUCT.metal, { y: 0.25 }),
      put(cyl(0.2, 0.2, 1.1, 16), STRUCT.glass, { y: 1.05 }, { opacity: 0.35 }),
      put(cyl(0.17, 0.17, 0.5, 16), c, { y: 0.8, tinted: true }, { opacity: 0.85 }),
      put(cyl(0.06, 0.06, 0.5, 10), STRUCT.metal, { y: 1.75 }),
      put(cyl(0.26, 0.26, 0.08, 16), STRUCT.light, { y: 2.02 }),
    ),
};
