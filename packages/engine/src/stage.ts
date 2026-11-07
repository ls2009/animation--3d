/**
 * Shared stage visuals: everything about HOW state is drawn lives here so
 * the interactive player and the headless keyframe renderer cannot drift
 * apart. computeState defines WHAT is true at time t; this module defines
 * what that looks like.
 */
import * as THREE from "three";
import { type Script, resolveColor } from "@sinaa/dsl";
import type { ActorState, FlowParticleState } from "./state";
import { buildProp, PROP_META } from "./props/registry";

export const BACKDROPS: Record<string, { bg: string; floor: string }> = {
  lab: { bg: "#10141c", floor: "#1c2330" },
  nature: { bg: "#0e1a14", floor: "#16271d" },
  space: { bg: "#070711", floor: "#101022" },
  plain: { bg: "#15151a", floor: "#202028" },
};

const metaHeight = new Map(PROP_META.map((m) => [m.name, m.height]));

export function addStageLights(scene3: THREE.Scene): void {
  const ambient = new THREE.AmbientLight(0xffffff, 0.55);
  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(10, 18, 12);
  const fill = new THREE.DirectionalLight(0x8899ff, 0.4);
  fill.position.set(-12, 8, -10);
  scene3.add(ambient, key, fill);
}

export function addStageFloor(scene3: THREE.Scene): THREE.Mesh {
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(34, 48),
    new THREE.MeshStandardMaterial({ color: "#1c2330", roughness: 0.95 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.01;
  const grid = new THREE.GridHelper(60, 30, 0x2c3648, 0x222a3a);
  scene3.add(floor, grid);
  return floor;
}

export function applyBackdrop(
  scene3: THREE.Scene,
  floor: THREE.Mesh,
  backdrop: string,
): void {
  const bd = BACKDROPS[backdrop] ?? BACKDROPS.lab!;
  scene3.background = new THREE.Color(bd.bg);
  (floor.material as THREE.MeshStandardMaterial).color.set(bd.floor);
}

export interface StageActorNode {
  group: THREE.Group;
  baseSize: number;
  nominal: number;
  kind: "prop" | "text";
}

export function mountStageActors(
  scene3: THREE.Scene,
  script: Script,
): Map<string, StageActorNode> {
  const nodes = new Map<string, StageActorNode>();
  for (const actor of script.actors) {
    const group =
      actor.kind === "prop"
        ? buildProp(actor.prop ?? "block", resolveColor(actor.color))
        : new THREE.Group();
    const nominal = actor.kind === "prop" ? (metaHeight.get(actor.prop ?? "block") ?? 2) : 1;
    group.position.set(actor.x, actor.y, actor.z);
    scene3.add(group);
    nodes.set(actor.id, { group, baseSize: actor.size, nominal, kind: actor.kind });
  }
  return nodes;
}

export function unmountStageActors(
  scene3: THREE.Scene,
  nodes: Map<string, StageActorNode>,
): void {
  for (const node of nodes.values()) scene3.remove(node.group);
  nodes.clear();
}

/** Map one actor's pure state onto its three.js node. */
export function applyActorVisuals(node: StageActorNode, a: ActorState): void {
  node.group.position.set(a.x, a.y, a.z);
  node.group.rotation.set(a.rotation.x, a.rotation.y, a.rotation.z);
  node.group.scale.setScalar((node.baseSize / node.nominal) * a.scale);
  node.group.visible = a.opacity > 0.01;

  node.group.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mat = mesh.material as THREE.MeshStandardMaterial;
    if (!mat) return;
    if (mat.userData.baseOpacity === undefined) mat.userData.baseOpacity = mat.opacity;
    mat.opacity = a.opacity * (mat.userData.baseOpacity as number);
    if (mesh.userData.tinted) {
      mat.color.set(a.color);
      if (mat.userData.baseEmissive === undefined) {
        mat.userData.baseEmissive = `#${mat.emissive.getHexString()}`;
      }
      mat.emissive.set(mat.userData.baseEmissive as string);
      if (a.highlight > 0) {
        mat.emissive.lerp(new THREE.Color("#ffffff"), a.highlight * 0.45);
      }
    }
  });
}

export interface FlowPool {
  apply(flows: FlowParticleState[]): void;
  dispose(): void;
}

export function createFlowPool(scene3: THREE.Scene, size = 80): FlowPool {
  const geoms = {
    sphere: new THREE.SphereGeometry(0.22, 10, 10),
    cube: new THREE.BoxGeometry(0.32, 0.32, 0.32),
    drop: new THREE.ConeGeometry(0.2, 0.45, 10),
  };
  const meshes: THREE.Mesh[] = [];
  for (let i = 0; i < size; i++) {
    const m = new THREE.Mesh(
      geoms.sphere,
      new THREE.MeshStandardMaterial({ transparent: true, opacity: 0.9, roughness: 0.4 }),
    );
    m.visible = false;
    scene3.add(m);
    meshes.push(m);
  }
  return {
    apply(flows: FlowParticleState[]): void {
      let fi = 0;
      for (const particle of flows) {
        if (fi >= size) break;
        const m = meshes[fi++]!;
        m.visible = true;
        m.geometry = geoms[particle.shape];
        m.position.set(particle.x, particle.y, particle.z);
        const mat = m.material as THREE.MeshStandardMaterial;
        mat.color.set(particle.color);
        mat.opacity = 0.25 + 0.75 * Math.sin(particle.progress * Math.PI);
      }
      for (; fi < size; fi++) meshes[fi]!.visible = false;
    },
    dispose(): void {
      for (const m of meshes) scene3.remove(m);
      for (const g of Object.values(geoms)) g.dispose();
    },
  };
}
