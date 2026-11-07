import { STRUCT, box, coneG, cyl, group, put, sph, torus, type PropBuilder } from "./helpers";

export const tech: Record<string, PropBuilder> = {
  laptop: (c) =>
    group(
      put(box(1.9, 0.1, 1.3), c, { y: 0.05, tinted: true }),
      put(box(1.9, 1.2, 0.08), c, { y: 0.65, z: -0.6, rx: -0.2, tinted: true }),
      put(box(1.7, 1, 0.02), "#2d3b55", { y: 0.66, z: -0.55, rx: -0.2 }, { emissive: "#1a2438" }),
    ),

  server: (c) => {
    const g = group(put(box(1.2, 2.5, 1.1), c, { y: 1.25, tinted: true }));
    for (let i = 0; i < 4; i++) {
      g.add(put(box(1, 0.3, 0.05), STRUCT.dark, { y: 0.5 + i * 0.55, z: 0.56 }));
      g.add(put(sph(0.05), "#58e07a", { x: 0.35, y: 0.5 + i * 0.55, z: 0.6 }, { emissive: "#2a7a40" }));
    }
    return g;
  },

  router: (c) =>
    group(
      put(box(1.8, 0.4, 1.1), c, { y: 0.2, tinted: true }),
      put(cyl(0.04, 0.04, 0.8), STRUCT.dark, { x: -0.6, y: 0.8 }),
      put(cyl(0.04, 0.04, 0.8), STRUCT.dark, { x: 0.6, y: 0.8 }),
      put(sph(0.06), "#58e07a", { x: 0, y: 0.42, z: 0.4 }, { emissive: "#2a7a40" }),
    ),

  packet: (c) =>
    group(
      put(box(0.7, 0.7, 0.7), c, { y: 0.45, ry: Math.PI / 4, tinted: true }, { emissive: "#1c2a44", roughness: 0.4 }),
    ),

  database: (c) =>
    group(
      put(cyl(0.8, 0.8, 0.55, 24), c, { y: 0.3, tinted: true }),
      put(cyl(0.8, 0.8, 0.55, 24), c, { y: 0.95, tinted: true }),
      put(cyl(0.8, 0.8, 0.55, 24), c, { y: 1.6, tinted: true }),
      put(torus(0.8, 0.045, 10, 26), STRUCT.light, { y: 1.9 }),
    ),

  antenna: (c) =>
    group(
      put(cyl(0.5, 0.7, 0.25, 4), STRUCT.dark, { y: 0.12, ry: Math.PI / 4 }),
      put(cyl(0.06, 0.1, 2.4), c, { y: 1.45, tinted: true }),
      put(sph(0.12), c, { y: 2.75, tinted: true }, { emissive: "#553333" }),
      put(torus(0.35, 0.03), STRUCT.light, { y: 2.75, rx: Math.PI / 2 }),
    ),

  satellite: (c) =>
    group(
      put(box(0.7, 0.7, 0.7), c, { y: 1.2, tinted: true }, { metalness: 0.6 }),
      put(box(1, 0.05, 0.6), "#28418a", { x: -0.95, y: 1.2 }, { metalness: 0.4, roughness: 0.3 }),
      put(box(1, 0.05, 0.6), "#28418a", { x: 0.95, y: 1.2 }, { metalness: 0.4, roughness: 0.3 }),
      put(coneG(0.3, 0.35, 16), STRUCT.light, { y: 1.75 }),
    ),

  chip: (c) => {
    const g = group(put(box(1.1, 0.18, 1.1), c, { y: 0.2, tinted: true }));
    for (let i = -1; i <= 1; i++) {
      g.add(put(box(0.08, 0.08, 1.4), STRUCT.metal, { x: i * 0.4, y: 0.12 }));
      g.add(put(box(1.4, 0.08, 0.08), STRUCT.metal, { z: i * 0.4, y: 0.12 }));
    }
    g.add(put(box(0.5, 0.08, 0.5), STRUCT.dark, { y: 0.32 }));
    return g;
  },

  smartphone: (c) =>
    group(
      put(box(0.9, 1.7, 0.12), c, { y: 0.85, tinted: true }),
      put(box(0.78, 1.5, 0.02), "#2d3b55", { y: 0.85, z: 0.07 }, { emissive: "#1a2438" }),
    ),

  cable: (c) =>
    group(
      put(cyl(0.07, 0.07, 2.6), c, { y: 0.25, rz: Math.PI / 2, tinted: true }),
      put(box(0.35, 0.22, 0.2), STRUCT.dark, { x: -1.45, y: 0.25 }),
      put(box(0.35, 0.22, 0.2), STRUCT.dark, { x: 1.45, y: 0.25 }),
    ),

  "cloud-server": (c) =>
    group(
      put(sph(0.65), c, { x: -0.6, y: 1.3, tinted: true }, { roughness: 0.85 }),
      put(sph(0.85), c, { y: 1.5, tinted: true }, { roughness: 0.85 }),
      put(sph(0.6), c, { x: 0.7, y: 1.3, tinted: true }, { roughness: 0.85 }),
      put(box(0.9, 0.5, 0.5), STRUCT.light, { y: 0.55 }),
      put(sph(0.045), "#58e07a", { x: 0.25, y: 0.6, z: 0.26 }, { emissive: "#2a7a40" }),
    ),

  shield: (c) => {
    const g = group();
    const body = put(sph(0.85), c, { y: 1.05, tinted: true }, { metalness: 0.4 });
    body.scale.set(1, 1.15, 0.35);
    g.add(body);
    const rim = put(torus(0.85, 0.07, 12, 24), STRUCT.metal, { y: 1.05 });
    rim.scale.set(1, 1.15, 1);
    g.add(rim);
    return g;
  },

  globe: (c) =>
    group(
      put(cyl(0.45, 0.6, 0.15, 20), STRUCT.dark, { y: 0.07 }),
      put(cyl(0.06, 0.06, 0.4), STRUCT.metal, { y: 0.3 }),
      put(sph(0.8), "#2d5f9e", { y: 1.25 }, { roughness: 0.4 }),
      put(sph(0.805), c, { y: 1.25, tinted: true }, { roughness: 0.8, opacity: 0.9 }),
      put(torus(0.82, 0.03), STRUCT.light, { y: 1.25, rx: Math.PI / 2.4 }),
    ),
};
