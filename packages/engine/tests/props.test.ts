/**
 * Prop library contract + structural snapshot tests.
 *
 * Structural snapshots (geometry types, mesh counts, rounded transforms,
 * material flags) are environment-independent and deterministic, which PNG
 * hashes across GPUs are not; pixel-level checks arrive with the Phase 2
 * headless renderer. See the Phase 1 report, "Deviations".
 */
import { Box3, Group, Mesh, MeshStandardMaterial, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import {
  PROP_BUILDERS,
  PROP_META,
  PROP_NAMES,
  PROP_ALIASES,
  PROP_LIBRARY_VERSION,
  buildProp,
  registerGltfResolver,
  resolvePropName,
} from "../src/index";

const DOMAIN_COUNTS: Record<string, number> = {};
for (const m of PROP_META) DOMAIN_COUNTS[m.domain] = (DOMAIN_COUNTS[m.domain] ?? 0) + 1;

describe("catalogue", () => {
  it("ships 90 props across 7 domains", () => {
    expect(PROP_META).toHaveLength(90);
    expect(Object.keys(DOMAIN_COUNTS).sort()).toEqual(
      ["body", "business", "machines", "nature", "primitives", "science", "tech"],
    );
  });

  it("every meta entry has a builder and vice versa", () => {
    const builderNames = new Set(Object.keys(PROP_BUILDERS));
    const metaNames = new Set(PROP_META.map((m) => m.name));
    expect([...metaNames].filter((n) => !builderNames.has(n))).toEqual([]);
    expect([...builderNames].filter((n) => !metaNames.has(n))).toEqual([]);
  });

  it("names are lower-case hyphenated concrete nouns, no duplicates", () => {
    const seen = new Set<string>();
    for (const m of PROP_META) {
      expect(m.name).toMatch(/^[a-z][a-z0-9-]*$/);
      expect(seen.has(m.name)).toBe(false);
      seen.add(m.name);
    }
  });

  it("no alias collides with a canonical name", () => {
    for (const alias of PROP_ALIASES.keys()) {
      expect(PROP_NAMES.has(alias)).toBe(false);
    }
  });

  it("has a semver library version", () => {
    expect(PROP_LIBRARY_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

describe("prop contract", () => {
  const color = "#4f8ef7";

  for (const meta of PROP_META) {
    it(`${meta.name}: group at floor origin with tinted, transparent-capable meshes`, () => {
      const g = PROP_BUILDERS[meta.name]!(color);
      expect(g).toBeInstanceOf(Group);

      let meshCount = 0;
      let tintedCount = 0;
      g.traverse((o) => {
        const mesh = o as Mesh;
        if (!mesh.isMesh) return;
        meshCount++;
        const mat = mesh.material as MeshStandardMaterial;
        expect(mat.transparent).toBe(true); // transparent-capable
        if (mesh.userData.tinted) tintedCount++;
      });
      expect(meshCount).toBeGreaterThan(0);
      expect(tintedCount).toBeGreaterThan(0); // actor colour applies somewhere

      const bbox = new Box3().setFromObject(g);
      const size = bbox.getSize(new Vector3());
      // Origin at the floor: nothing meaningfully below y=0.
      expect(bbox.min.y).toBeGreaterThan(-0.15);
      // Height roughly matches the catalogue's nominal height.
      expect(size.y).toBeGreaterThan(meta.height * 0.45);
      expect(size.y).toBeLessThan(meta.height * 1.75);
    });
  }
});

describe("structural snapshots", () => {
  // One stable fingerprint per prop: geometry types + rounded positions +
  // material flags. Catches accidental geometry changes in review.
  function structure(name: string): string[] {
    const g = PROP_BUILDERS[name]!("#aabbcc");
    const rows: string[] = [];
    g.traverse((o) => {
      const mesh = o as Mesh;
      if (!mesh.isMesh) return;
      const p = mesh.getWorldPosition(new Vector3());
      const mat = mesh.material as MeshStandardMaterial;
      rows.push(
        [
          mesh.geometry.type,
          p.x.toFixed(2),
          p.y.toFixed(2),
          p.z.toFixed(2),
          mesh.userData.tinted ? "tinted" : "fixed",
          mat.opacity.toFixed(2),
        ].join("|"),
      );
    });
    return rows.sort();
  }

  for (const meta of PROP_META) {
    it(`${meta.name} structure snapshot`, () => {
      expect(structure(meta.name)).toMatchSnapshot();
    });
  }

  it("builders are deterministic", () => {
    expect(structure("gear")).toEqual(structure("gear"));
  });
});

describe("resolution & glTF path", () => {
  it("resolvePropName: exact, alias, unknown", () => {
    expect(resolvePropName("piston")).toBe("piston");
    expect(resolvePropName("engine")).toBe("engine-cylinder");
    expect(resolvePropName("ENGINE")).toBe("engine-cylinder");
    expect(resolvePropName("nonsense")).toBeUndefined();
  });

  it("buildProp falls back to block for unknown names", () => {
    const g = buildProp("warp-core", "#ff0000");
    expect(g).toBeInstanceOf(Group);
  });

  it("a registered glTF resolver takes precedence, same contract", () => {
    const marker = new Group();
    marker.name = "gltf-piston";
    registerGltfResolver((name) => (name === "piston" ? marker : undefined));
    try {
      expect(buildProp("piston", "#fff000")).toBe(marker);
      // Other props still come from primitives.
      expect(buildProp("gear", "#fff000")).not.toBe(marker);
    } finally {
      registerGltfResolver(undefined);
    }
  });
});
