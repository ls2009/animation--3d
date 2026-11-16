# STOP 8 — Visual quality (field-true objects, themed environments, animated text)

## What shipped

Owner's three requirements, plus the previously suggested polish, in one pass:

1. **Objects that represent the field** (`packages/engine/src/props/*`)
   - 8 new field-specific props → catalogue is now **98**:
     `neural-network`, `robot`, `circuit-board`, `sensor`, `drone` (tech),
     `telescope`, `bacteria` (science), `bridge` (business).
   - Detailed rebuilds of the most-used props: piston (crown + ring grooves +
     connecting rod + big end), gear (12 teeth + spokes, orientation fixed),
     turbine (two blade stages + nose cone + shroud), heart (aorta arch +
     pulmonary trunk + coronary vessels), lungs (lobed, trachea with
     cartilage rings, branching bronchi), tree (clustered canopy + branches),
     leaf (midrib + paired veins + tip), sun (tapered rays + corona), globe
     (continents + meridians), laptop (key grid + glowing screen), server
     (6 rack units with LEDs + vents), packet (header band + orbiting bits),
     battery (terminal + charge pips), atom (nucleon cluster + 3 electrons),
     person (limbs, hands, head, hair).
   - `PROP_LIBRARY_VERSION` 1.0.0 → **1.1.0** (fingerprints move: cached
     lessons regenerate on next request, by design).

2. **Environments that represent the topic** (`packages/engine/src/stage.ts`)
   - Backdrop enum 4 → **10**: `lab`, `tech`, `nature`, `space`, `body`,
     `finance`, `factory`, `sky`, `ocean`, `plain`.
   - Each theme: vertex-coloured sky dome, themed floor/grid, exponential
     fog, and a deterministic scenery ring (neon towers + data motes,
     skyline with lit windows, smokestacks, starfield + ringed planet,
     kelp + bubbles, …). No `Math.random` — index-hashed placement.
   - Scenery rings sit at radius 26–50, **outside the camera orbit** (fixed
     after a keyframe showed a smokestack blocking the stage); floor
     enlarged to r=60 so far scenery still stands on it.

3. **Text that is clear and moves like the objects**
   - `kind:"text"` actors are now real 3D canvas-textured pill panels that
     `move`/`pulse`/`show`/`hide`/`label` through the ordinary step system
     (DOM-less marker-bar fallback keeps the pure-Node path working).
   - HTML prop labels restyled as proper pills (dark pill, accent border,
     600-weight 13px); text actors no longer get a duplicate HTML label.

4. **Cinematic pass** (previously suggested polish)
   - ACES filmic tone mapping, exposure 1.25, sRGB output.
   - Hemisphere + shadow-casting key (1024 PCF-soft) + cool rim light;
     props cast shadows, floor receives.
   - Lite profile: when WebGL is software-rasterized (SwiftShader/llvmpipe —
     no real GPU), the interactive player disables shadows and drops to 1x
     pixel ratio. Real GPUs and the deterministic headless path keep full
     quality.

5. **Prompts v2** (`apps/api/prompts/`)
   - `single-pass@2`: pick the backdrop that represents the field (all 10
     listed with meanings), place 1–3 animated text actors for key terms,
     camera framing y 6–10 / z 16–26 looking at the action, colour-as-meaning.
   - `set-designer@2`, `choreographer@2`: same guidance split across roles;
     the crew composite version moves automatically.

6. **Built-in lessons refreshed** (`packages/engine/src/lessons.ts`)
   - Engine → `factory`, TCP → `tech`, photosynthesis stays `nature`.
   - One animated text actor each: stroke counter panel ("1 · Intake" …
     "Suck · Squeeze · Bang · Blow"), equation panel ("Light + H2O + CO2" →
     "→ Sugar + O2"), and a message panel riding each TCP packet
     ("SYN →", "← SYN-ACK", "ACK →"). Still zero repairs.

## Verification

- `pnpm -r lint` clean; `pnpm -r test` **284 passed** (dsl 17, engine 259 —
  per-prop contract + structural snapshots for all 98 props, golden 4,
  web 1, headless 3 incl. deterministic Playwright keyframes);
  `uv run pytest` **38 passed**; `ruff` clean; `tsc --noEmit` clean.
- Keyframes re-rendered for all three lessons at final code state —
  0 repairs, 6 distinct frames each; themes, shadows and text panels
  visually confirmed (screenshots shared in session).
- Browser check on the prod build: /demo plays all three refreshed lessons;
  desktop + TCP lesson screenshots; mobile 375px horizontal overflow 0px.
- Perf guard (Lighthouse, prod build, same machine, /demo):
  pre-P8 **82** (TBT 700ms) → post-P8 **80** (TBT 870ms) — within the ~5pt
  guard. (First attempt was 70; recovered via the software-GL lite profile +
  1024 shadow map. Lighthouse's headless Chrome has no GPU, so this guard
  measures the software-rendering worst case.)

## Deviations / honest notes

- `emissiveIntensity` was silently ignored by the prop material helper until
  this phase (typed now, applied now) — glowing accents are slightly
  stronger than earlier renders.
- The gear's teeth were in the wrong plane (horizontal ring around a
  vertical disc) since Phase 1; fixed as part of the rebuild.
- glTF real-model sourcing (the realism ceiling) remains a follow-up phase,
  per the scoping decision.

## Deploy

- Web + engine auto-deploy via Vercel on push.
- **API-side changes (prompts v2, validator backdrop set, catalogue 1.1.0)
  need one Fly deploy by the owner** from a current clone:
  `fly deploy -a sinaa-motion-lab --config apps/api/fly.toml` (run from the
  repo root). Until then, production generations keep prompt v1 visuals.
- Fingerprint note: the prop-library and prompt version bumps mean every
  topic regenerates fresh on its next request instead of serving the
  old-look cache — expected, costs one generation per repeated topic.

## Cost

- $0 model spend this phase (all work deterministic; live themed-generation
  proof deferred until the Anthropic usage limit is raised).
