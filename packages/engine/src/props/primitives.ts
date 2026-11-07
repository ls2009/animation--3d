import { box, coneG, cyl, group, put, sph, torus, type PropBuilder } from "./helpers";
import { Shape, ExtrudeGeometry } from "three";

export const primitives: Record<string, PropBuilder> = {
  block: (c) => group(put(box(1.6, 2, 1.6), c, { y: 1, tinted: true })),

  sphere: (c) => group(put(sph(1), c, { y: 1, tinted: true })),

  cylinder: (c) => group(put(cyl(0.8, 0.8, 2), c, { y: 1, tinted: true })),

  cone: (c) => group(put(coneG(1, 2), c, { y: 1, tinted: true })),

  ring: (c) => group(put(torus(0.8, 0.3), c, { y: 1.1, tinted: true })),

  disc: (c) => group(put(cyl(1, 1, 0.3), c, { y: 0.15, tinted: true })),

  slab: (c) => group(put(box(3, 0.4, 2), c, { y: 0.2, tinted: true })),

  rod: (c) => group(put(cyl(0.15, 0.15, 2), c, { y: 1, tinted: true })),

  tube: (c) =>
    group(put(cyl(0.5, 0.5, 2, 24), c, { y: 1, tinted: true }, { opacity: 0.45 })),

  wedge: (c) => {
    const shape = new Shape();
    shape.moveTo(-1, 0);
    shape.lineTo(1, 0);
    shape.lineTo(1, 2);
    shape.closePath();
    const geom = new ExtrudeGeometry(shape, { depth: 1.6, bevelEnabled: false });
    return group(put(geom, c, { z: -0.8, tinted: true }));
  },

  star: (c) => {
    const shape = new Shape();
    const R = 1, r = 0.45;
    for (let i = 0; i < 10; i++) {
      const rad = i % 2 === 0 ? R : r;
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(a) * rad, y = Math.sin(a) * rad;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    shape.closePath();
    const geom = new ExtrudeGeometry(shape, { depth: 0.3, bevelEnabled: false });
    return group(put(geom, c, { y: 1, z: -0.15, tinted: true }));
  },

  arrow: (c) =>
    group(
      put(cyl(0.12, 0.12, 1.3), c, { y: 0.65, tinted: true }),
      put(coneG(0.35, 0.7), c, { y: 1.65, tinted: true }),
    ),
};
