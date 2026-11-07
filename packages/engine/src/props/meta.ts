/**
 * Prop catalogue metadata — three-free so the validator and pipeline can
 * import it without pulling in rendering code. Builders live in the domain
 * files; a registry test asserts 1:1 coverage between meta and builders.
 *
 * Naming rule: lower-case, hyphenated, concrete nouns. No colour or size
 * adjectives — those are actor properties.
 */
export const PROP_LIBRARY_VERSION = "1.0.0";

export type PropDomain =
  | "primitives"
  | "nature"
  | "science"
  | "machines"
  | "business"
  | "tech"
  | "body";

export interface PropMeta {
  name: string;
  domain: PropDomain;
  aliases: string[];
  /** Nominal height in world units (contract default: 2). */
  height: number;
  /** Approximate footprint diameter in world units. */
  footprint: number;
  /** True when the prop renders see-through parts (e.g. a glass cylinder). */
  transparent: boolean;
  tags: string[];
}

const p = (
  name: string,
  domain: PropDomain,
  aliases: string[] = [],
  tags: string[] = [],
  opts: Partial<Pick<PropMeta, "height" | "footprint" | "transparent">> = {},
): PropMeta => ({
  name,
  domain,
  aliases,
  tags,
  height: opts.height ?? 2,
  footprint: opts.footprint ?? 1.5,
  transparent: opts.transparent ?? false,
});

export const PROP_META: PropMeta[] = [
  // --- primitives (12) ------------------------------------------------------
  p("block", "primitives", ["cube", "box"], ["generic", "fallback"]),
  p("sphere", "primitives", ["ball", "orb"], ["generic"]),
  p("cylinder", "primitives", ["barrel"], ["generic"]),
  p("cone", "primitives", [], ["generic"]),
  p("ring", "primitives", ["torus", "donut"], ["generic"]),
  p("disc", "primitives", ["plate", "circle"], ["generic"], { height: 0.3, footprint: 2 }),
  p("slab", "primitives", ["platform", "panel"], ["generic"], { height: 0.4, footprint: 3 }),
  p("rod", "primitives", ["stick", "pole"], ["generic"], { footprint: 0.4 }),
  p("tube", "primitives", ["pipe"], ["generic"], { transparent: true }),
  p("wedge", "primitives", ["ramp"], ["generic"]),
  p("star", "primitives", [], ["generic", "marker"]),
  p("arrow", "primitives", ["pointer"], ["generic", "marker"]),

  // --- nature (13) ----------------------------------------------------------
  p("tree", "nature", [], ["plant"], { height: 3, footprint: 2 }),
  p("leaf", "nature", [], ["plant", "photosynthesis"]),
  p("flower", "nature", ["blossom"], ["plant"]),
  p("sun", "nature", ["sunlight"], ["sky", "light", "photosynthesis"]),
  p("cloud", "nature", [], ["sky", "weather"], { footprint: 3 }),
  p("raindrop", "nature", ["water-drop", "droplet"], ["water", "weather"], { height: 1 }),
  p("mountain", "nature", ["hill"], ["terrain"], { height: 3, footprint: 4 }),
  p("river", "nature", ["stream"], ["water", "terrain"], { height: 0.2, footprint: 4 }),
  p("seed", "nature", [], ["plant"], { height: 0.8 }),
  p("root", "nature", ["roots"], ["plant"], { height: 1.2 }),
  p("grass-patch", "nature", ["grass"], ["plant", "terrain"], { height: 0.6, footprint: 2.5 }),
  p("bee", "nature", ["insect"], ["animal"], { height: 1 }),
  p("apple", "nature", ["fruit"], ["plant", "food"], { height: 1.2 }),

  // --- science (13) -----------------------------------------------------------
  p("atom", "science", [], ["chemistry", "physics"]),
  p("molecule", "science", ["compound"], ["chemistry"]),
  p("electron", "science", ["charge"], ["physics", "electricity"], { height: 0.8 }),
  p("beaker", "science", [], ["chemistry", "glassware"], { transparent: true }),
  p("flask", "science", ["erlenmeyer"], ["chemistry", "glassware"], { transparent: true }),
  p("test-tube", "science", ["vial"], ["chemistry", "glassware"], { transparent: true, footprint: 0.6 }),
  p("magnet", "science", ["horseshoe-magnet"], ["physics", "magnetism"]),
  p("prism", "science", [], ["physics", "optics"], { transparent: true }),
  p("dna-helix", "science", ["dna"], ["biology", "genetics"], { height: 3 }),
  p("microscope", "science", [], ["biology", "instrument"]),
  p("thermometer", "science", [], ["instrument", "temperature"], { footprint: 0.5 }),
  p("battery", "science", ["cell-battery", "lithium-battery"], ["electricity", "energy"]),
  p("lightbulb", "science", ["bulb", "lamp"], ["electricity", "light"]),

  // --- machines (13) -----------------------------------------------------------
  p("piston", "machines", [], ["engine", "automotive"]),
  p("engine-cylinder", "machines", ["engine", "cylinder-engine"], ["engine", "automotive"], { height: 3, transparent: true }),
  p("crankshaft", "machines", ["crank"], ["engine", "automotive"], { height: 1.5, footprint: 2.5 }),
  p("valve", "machines", ["intake-valve", "exhaust-valve"], ["engine", "automotive"], { height: 1.2, footprint: 0.8 }),
  p("spark-plug", "machines", ["sparkplug"], ["engine", "automotive"], { height: 1.2, footprint: 0.5 }),
  p("gear", "machines", ["cog", "cogwheel"], ["mechanism"]),
  p("turbine", "machines", ["turbo", "turbocharger", "impeller"], ["engine", "energy"]),
  p("fan", "machines", ["propeller"], ["mechanism", "cooling"]),
  p("spring", "machines", ["coil"], ["mechanism"], { footprint: 0.8 }),
  p("wheel", "machines", ["tire", "tyre"], ["automotive", "mechanism"]),
  p("lever", "machines", ["seesaw"], ["mechanism"], { height: 1.2, footprint: 3 }),
  p("pulley", "machines", [], ["mechanism"]),
  p("pump", "machines", ["compressor"], ["mechanism", "fluid"]),

  // --- business (13) ------------------------------------------------------------
  p("coin", "business", ["money"], ["finance"], { height: 0.4 }),
  p("banknote", "business", ["bill", "cash"], ["finance"], { height: 0.1, footprint: 2 }),
  p("bar-chart", "business", ["chart", "histogram"], ["data", "finance"]),
  p("pie-chart", "business", [], ["data", "finance"], { height: 0.5, footprint: 2 }),
  p("graph-line", "business", ["line-chart", "trend"], ["data", "finance"]),
  p("briefcase", "business", ["suitcase"], ["office"], { height: 1.4 }),
  p("building", "business", ["office-tower", "skyscraper"], ["city"], { height: 4, footprint: 2 }),
  p("factory", "business", ["plant-factory"], ["industry"], { height: 2.5, footprint: 3.5 }),
  p("shopping-cart", "business", ["cart", "trolley"], ["commerce"], { height: 1.4 }),
  p("scale-balance", "business", ["scales", "balance"], ["justice", "comparison"]),
  p("vault", "business", ["safe"], ["finance"]),
  p("package", "business", ["parcel", "shipment"], ["commerce", "logistics"], { height: 1.2 }),
  p("person", "business", ["human", "figure", "customer", "buyer", "seller"], ["people"], { height: 2.4, footprint: 1 }),

  // --- tech (13) ------------------------------------------------------------------
  p("laptop", "tech", ["computer", "client"], ["computing", "networking"], { height: 1.2, footprint: 2 }),
  p("server", "tech", ["server-rack", "host"], ["computing", "networking"], { height: 2.6, footprint: 1.4 }),
  p("router", "tech", ["switch-network", "gateway"], ["networking"], { height: 0.8, footprint: 2 }),
  p("packet", "tech", ["datagram", "message"], ["networking", "data"], { height: 0.8 }),
  p("database", "tech", ["db", "datastore"], ["computing", "data"]),
  p("antenna", "tech", ["mast"], ["networking", "radio"], { height: 3, footprint: 1 }),
  p("satellite", "tech", [], ["space", "networking"], { footprint: 2.5 }),
  p("chip", "tech", ["cpu", "processor", "microchip"], ["computing", "hardware"], { height: 0.4 }),
  p("smartphone", "tech", ["phone", "mobile"], ["computing"], { height: 1.8, footprint: 1 }),
  p("cable", "tech", ["wire", "ethernet"], ["networking", "hardware"], { height: 0.4, footprint: 3 }),
  p("cloud-server", "tech", ["cloud-computing"], ["computing", "networking"], { footprint: 3 }),
  p("shield", "tech", ["firewall"], ["security"]),
  p("globe", "tech", ["earth", "world", "dns-globe"], ["networking", "geography"]),

  // --- body (13) --------------------------------------------------------------------
  p("heart", "body", [], ["organ", "circulation"]),
  p("lungs", "body", ["lung"], ["organ", "respiration"], { footprint: 2.2 }),
  p("red-blood-cell", "body", ["blood-cell", "erythrocyte"], ["cell", "circulation"], { height: 0.8 }),
  p("white-blood-cell", "body", ["leukocyte", "immune-cell"], ["cell", "immunity"], { height: 1 }),
  p("virus", "body", ["germ", "pathogen"], ["microbe", "immunity"], { height: 1 }),
  p("antibody", "body", [], ["immunity"], { height: 1 }),
  p("cell", "body", ["cell-body"], ["cell", "biology"], { transparent: true }),
  p("neuron", "body", ["nerve-cell"], ["cell", "nervous-system"], { footprint: 2.5 }),
  p("bone", "body", [], ["skeleton"], { footprint: 0.8 }),
  p("stomach", "body", [], ["organ", "digestion"]),
  p("brain", "body", [], ["organ", "nervous-system"]),
  p("vein", "body", ["artery", "blood-vessel"], ["circulation"], { height: 0.8, footprint: 3, transparent: true }),
  p("syringe", "body", ["vaccine", "injection"], ["medicine", "immunity"], { footprint: 0.5 }),
];

export const PROP_NAMES: ReadonlySet<string> = new Set(PROP_META.map((m) => m.name));

export const PROP_ALIASES: ReadonlyMap<string, string> = new Map(
  PROP_META.flatMap((m) => m.aliases.map((a) => [a, m.name] as const)),
);

export const PROP_DOMAINS: readonly PropDomain[] = [
  "primitives",
  "nature",
  "science",
  "machines",
  "business",
  "tech",
  "body",
];
