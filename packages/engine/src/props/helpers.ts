/**
 * Builder utilities for composed-primitive props.
 *
 * Contract per prop: (colorHex) => THREE.Group, origin at the floor
 * (bounding box min.y ≈ 0), nominal height per catalogue meta, materials
 * transparent-capable, meshes where the actor colour applies tagged
 * userData.tinted = true.
 */
import * as THREE from "three";

export type PropBuilder = (colorHex: string) => THREE.Group;

/** Fixed structural colours (not tinted by the actor colour). */
export const STRUCT = {
  dark: "#3a3f45",
  mid: "#6b7280",
  light: "#d8dde3",
  glass: "#bcd6e8",
  metal: "#9aa3ad",
  wood: "#8a6b4f",
  green: "#3e9e5f",
} as const;

export interface MatOpts {
  tinted?: boolean;
  opacity?: number;
  metalness?: number;
  roughness?: number;
  emissive?: string;
}

export function makeMat(color: string, opts: MatOpts = {}): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    metalness: opts.metalness ?? 0.15,
    roughness: opts.roughness ?? 0.65,
    transparent: true, // transparent-capable per contract
    opacity: opts.opacity ?? 1,
  });
  if (opts.emissive) m.emissive = new THREE.Color(opts.emissive);
  return m;
}

export interface Placement {
  x?: number;
  y?: number;
  z?: number;
  rx?: number;
  ry?: number;
  rz?: number;
  /** Mark this mesh as receiving the actor colour. */
  tinted?: boolean;
}

export function put(
  geom: THREE.BufferGeometry,
  color: string,
  at: Placement = {},
  mat: MatOpts = {},
): THREE.Mesh {
  const mesh = new THREE.Mesh(geom, makeMat(color, mat));
  mesh.position.set(at.x ?? 0, at.y ?? 0, at.z ?? 0);
  mesh.rotation.set(at.rx ?? 0, at.ry ?? 0, at.rz ?? 0);
  if (at.tinted) mesh.userData.tinted = true;
  return mesh;
}

export const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
export const cyl = (rt: number, rb: number, h: number, seg = 24) =>
  new THREE.CylinderGeometry(rt, rb, h, seg);
export const sph = (r: number, seg = 20) => new THREE.SphereGeometry(r, seg, seg);
export const coneG = (r: number, h: number, seg = 24) => new THREE.ConeGeometry(r, h, seg);
export const torus = (R: number, r: number, seg = 20, tub = 32) =>
  new THREE.TorusGeometry(R, r, seg, tub);

export function group(...children: THREE.Object3D[]): THREE.Group {
  const g = new THREE.Group();
  for (const c of children) g.add(c);
  return g;
}

/** Simple capsule built from a cylinder and two sphere caps. */
export function capsule(r: number, h: number, color: string, at: Placement = {}, mat: MatOpts = {}): THREE.Group {
  const g = group(
    put(cyl(r, r, h), color, { tinted: at.tinted }, mat),
    put(sph(r), color, { y: h / 2, tinted: at.tinted }, mat),
    put(sph(r), color, { y: -h / 2, tinted: at.tinted }, mat),
  );
  g.position.set(at.x ?? 0, at.y ?? 0, at.z ?? 0);
  g.rotation.set(at.rx ?? 0, at.ry ?? 0, at.rz ?? 0);
  return g;
}
