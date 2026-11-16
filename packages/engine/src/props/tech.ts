import { STRUCT, box, coneG, cyl, group, put, sph, torus, type PropBuilder } from "./helpers";

export const tech: Record<string, PropBuilder> = {
  laptop: (c) => {
    const g = group(
      put(box(1.9, 0.09, 1.3), c, { y: 0.05, tinted: true }, { metalness: 0.45, roughness: 0.4 }),
      // Keyboard well and trackpad.
      put(box(1.6, 0.02, 0.72), STRUCT.dark, { y: 0.1, z: -0.15 }),
      put(box(0.6, 0.015, 0.35), STRUCT.mid, { y: 0.1, z: 0.42 }),
      // Screen lid, slightly reclined, with glowing display and webcam.
      put(box(1.9, 1.25, 0.07), c, { y: 0.62, z: -0.63, rx: -0.18, tinted: true }, { metalness: 0.45, roughness: 0.4 }),
      put(box(1.72, 1.08, 0.02), "#35507f", { y: 0.63, z: -0.58, rx: -0.18 }, { emissive: "#24395e", emissiveIntensity: 0.8 }),
      put(sph(0.025), STRUCT.dark, { y: 1.2, z: -0.52 }),
    );
    // Key grid.
    for (let r = 0; r < 4; r++) {
      for (let k = 0; k < 8; k++) {
        g.add(put(box(0.16, 0.02, 0.13), STRUCT.mid, { x: -0.63 + k * 0.18, y: 0.115, z: -0.39 + r * 0.17 }));
      }
    }
    return g;
  },

  server: (c) => {
    const g = group(
      put(box(1.25, 2.45, 1.1), c, { y: 1.32, tinted: true }, { roughness: 0.5 }),
      // Feet.
      put(box(0.5, 0.1, 0.9), STRUCT.dark, { x: -0.35, y: 0.05 }),
      put(box(0.5, 0.1, 0.9), STRUCT.dark, { x: 0.35, y: 0.05 }),
    );
    // Six rack units, each with status LEDs and vent slits.
    for (let i = 0; i < 6; i++) {
      const y = 0.45 + i * 0.36;
      g.add(put(box(1.05, 0.26, 0.06), STRUCT.dark, { y, z: 0.56 }));
      g.add(put(sph(0.04), "#58e07a", { x: 0.38, y: y + 0.05, z: 0.6 }, { emissive: "#2a7a40", emissiveIntensity: 1.6 }));
      g.add(put(sph(0.04), "#f2c14e", { x: 0.28, y: y + 0.05, z: 0.6 }, { emissive: "#9a7420", emissiveIntensity: 1.4 }));
      g.add(put(box(0.5, 0.03, 0.05), STRUCT.metal, { x: -0.18, y: y - 0.06, z: 0.585 }));
      g.add(put(box(0.5, 0.03, 0.05), STRUCT.metal, { x: -0.18, y: y + 0.02, z: 0.585 }));
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

  packet: (c) => {
    const g = group(
      put(box(0.68, 0.68, 0.68), c, { y: 0.45, ry: Math.PI / 4, tinted: true }, { emissive: "#1c2a44", emissiveIntensity: 0.7, roughness: 0.35 }),
      // Header band around the top.
      put(box(0.7, 0.16, 0.7), STRUCT.light, { y: 0.66, ry: Math.PI / 4 }, { opacity: 0.9 }),
    );
    // Orbiting data bits.
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      g.add(put(sph(0.045), c, {
        x: Math.cos(a) * 0.62, y: 0.45 + Math.sin(a * 2) * 0.12, z: Math.sin(a) * 0.62, tinted: true,
      }, { emissive: "#2b4d82", emissiveIntensity: 1.4 }));
    }
    return g;
  },

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

  globe: (c) => {
    const g = group(
      put(cyl(0.5, 0.65, 0.15, 20), STRUCT.dark, { y: 0.07 }),
      put(cyl(0.06, 0.06, 0.4), STRUCT.metal, { y: 0.3 }),
      put(sph(0.82, 28), "#1d4e8f", { y: 1.3 }, { roughness: 0.35 }),
      put(torus(0.85, 0.025), STRUCT.light, { y: 1.3, rx: Math.PI / 2.4 }),
      put(torus(0.85, 0.02), STRUCT.light, { y: 1.3 }),
    );
    // Continent patches: flattened green blobs hugging the sphere.
    const spots: [number, number, number][] = [
      [0.5, 0.55, 0.45], [-0.6, 0.3, 0.5], [0.1, -0.5, 0.65], [-0.4, -0.35, -0.6],
      [0.65, 0.1, -0.5], [0, 0.78, -0.2],
    ];
    for (const [x, y, z] of spots) {
      const n = Math.hypot(x, y, z);
      const patch = put(sph(0.3, 10), c, {
        x: (x / n) * 0.78, y: 1.3 + (y / n) * 0.78, z: (z / n) * 0.78, tinted: true,
      }, { roughness: 0.8 });
      patch.scale.set(1, 1, 0.35);
      patch.lookAt(0, 1.3, 0);
      g.add(patch);
    }
    return g;
  },

  "neural-network": (c) => {
    const g = group();
    const layers = [[-1.1, 3], [0, 4], [1.1, 2]] as const;
    const nodePos: [number, number, number][][] = layers.map(([x, n]) => {
      const col: [number, number, number][] = [];
      for (let i = 0; i < n; i++) col.push([x, 0.6 + i * (2 / Math.max(1, n - 1)), 0]);
      return col;
    });
    nodePos.forEach((col, li) => {
      for (const [x, y, z] of col) {
        g.add(put(sph(0.2, 14), c, { x, y, z, tinted: true },
          { emissive: "#1f3f66", emissiveIntensity: 0.9, roughness: 0.3 }));
      }
      if (li < nodePos.length - 1) {
        for (const [x1, y1] of col) for (const [x2, y2] of nodePos[li + 1]!) {
          const len = Math.hypot(x2 - x1, y2 - y1);
          g.add(put(cyl(0.02, 0.02, len, 6), STRUCT.light, {
            x: (x1 + x2) / 2, y: (y1 + y2) / 2, rz: Math.PI / 2 - Math.atan2(y2 - y1, x2 - x1),
          }, { opacity: 0.55 }));
        }
      }
    });
    return g;
  },

  robot: (c) =>
    group(
      put(box(0.9, 0.5, 0.7), STRUCT.dark, { y: 0.25 }),
      put(cyl(0.18, 0.22, 0.35, 10), STRUCT.metal, { y: 0.6 }),
      put(box(1.1, 1.1, 0.8), c, { y: 1.3, tinted: true }, { metalness: 0.5, roughness: 0.35 }),
      put(box(0.7, 0.6, 0.65), c, { y: 2.25, tinted: true }, { metalness: 0.5 }),
      put(sph(0.09), "#7ef5ff", { x: -0.17, y: 2.3, z: 0.34 }, { emissive: "#2bd9ea", emissiveIntensity: 1.6 }),
      put(sph(0.09), "#7ef5ff", { x: 0.17, y: 2.3, z: 0.34 }, { emissive: "#2bd9ea", emissiveIntensity: 1.6 }),
      put(cyl(0.03, 0.03, 0.35, 6), STRUCT.metal, { y: 2.7 }),
      put(sph(0.07), "#ff5d5d", { y: 2.9 }, { emissive: "#c23", emissiveIntensity: 1.4 }),
      put(cyl(0.11, 0.11, 0.9, 10), STRUCT.metal, { x: -0.72, y: 1.25, rz: 0.15 }),
      put(cyl(0.11, 0.11, 0.9, 10), STRUCT.metal, { x: 0.72, y: 1.25, rz: -0.15 }),
      put(sph(0.16), c, { x: -0.8, y: 0.78, tinted: true }),
      put(sph(0.16), c, { x: 0.8, y: 0.78, tinted: true }),
    ),

  "circuit-board": (c) => {
    const g = group(put(box(2.4, 0.12, 1.8), c, { y: 0.1, tinted: true }, { roughness: 0.5 }));
    const chips: [number, number, number, number][] = [
      [-0.6, 0.35, 0.55, 0.55], [0.55, -0.4, 0.75, 0.5], [0.6, 0.45, 0.4, 0.4], [-0.55, -0.45, 0.45, 0.3],
    ];
    for (const [x, z, w, d] of chips) {
      g.add(put(box(w, 0.14, d), STRUCT.dark, { x, y: 0.23, z }));
    }
    for (let i = 0; i < 6; i++) {
      g.add(put(box(0.05, 0.03, 1.5), "#d8b44a", { x: -1 + i * 0.4, y: 0.18, z: 0 }, { metalness: 0.7 }));
    }
    for (let i = 0; i < 4; i++) {
      g.add(put(sph(0.05), "#58e07a", { x: -0.9 + i * 0.6, y: 0.2, z: 0.78 }, { emissive: "#2a7a40", emissiveIntensity: 1.5 }));
    }
    return g;
  },

  sensor: (c) =>
    group(
      put(cyl(0.3, 0.42, 0.14, 14), STRUCT.dark, { y: 0.07 }),
      put(cyl(0.06, 0.06, 0.7, 8), STRUCT.metal, { y: 0.5 }),
      put(box(0.7, 0.55, 0.55), c, { y: 1.1, tinted: true }, { metalness: 0.4 }),
      put(cyl(0.2, 0.24, 0.2, 16), STRUCT.dark, { y: 1.1, z: 0.36, rx: Math.PI / 2 }),
      put(sph(0.13), "#9fe8ff", { y: 1.1, z: 0.46 }, { emissive: "#38b6d8", emissiveIntensity: 1.6, roughness: 0.2 }),
      put(torus(0.2, 0.02, 8, 18), "#9fe8ff", { y: 1.1, z: 0.47 }, { emissive: "#38b6d8" }),
    ),

  drone: (c) => {
    const g = group(
      put(box(0.8, 0.3, 0.8), c, { y: 0.85, tinted: true }, { metalness: 0.45 }),
      put(sph(0.16), STRUCT.dark, { y: 0.66, z: 0.2 }),
    );
    const arms: [number, number][] = [[-0.85, -0.85], [0.85, -0.85], [-0.85, 0.85], [0.85, 0.85]];
    for (const [x, z] of arms) {
      g.add(put(box(1.2, 0.08, 0.1), STRUCT.metal, { x: x / 2, y: 0.9, z: z / 2, ry: -Math.atan2(z, x) }));
      g.add(put(cyl(0.07, 0.09, 0.18, 8), STRUCT.dark, { x, y: 0.95, z }));
      g.add(put(torus(0.42, 0.035, 8, 20), c, { x, y: 1.02, z, rx: Math.PI / 2, tinted: true }));
      g.add(put(box(0.75, 0.02, 0.09), STRUCT.light, { x, y: 1.03, z }, { opacity: 0.85 }));
      g.add(put(cyl(0.035, 0.035, 0.75, 6), STRUCT.dark, { x: x * 0.85, y: 0.45, z: z * 0.85, rx: z > 0 ? -0.2 : 0.2 }));
    }
    // Landing skids.
    g.add(put(cyl(0.04, 0.04, 1.7, 6), STRUCT.dark, { x: -0.72, y: 0.06, rx: Math.PI / 2 }));
    g.add(put(cyl(0.04, 0.04, 1.7, 6), STRUCT.dark, { x: 0.72, y: 0.06, rx: Math.PI / 2 }));
    return g;
  },
};
