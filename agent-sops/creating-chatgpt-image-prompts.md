# SOP: Creating ChatGPT Image Prompts for Game Props

When the user asks for help writing a ChatGPT (or other image-gen) prompt for a
game asset, follow this SOP. The output is a ready-to-paste prompt block, plus
optional iteration tactics if the user reports the result is wrong.

## When to apply

Trigger phrases include:

- "help me create a chatgpt prompt to draw ..."
- "give me a chatgpt prompt for ..."
- "chatgpt prompt for an image of ..."
- "what should i tell chatgpt to draw ..."
- "image prompt for ..."
- "tell chatgpt how to draw ..."

If the user only describes what they want (e.g. "I need a prompt for an old bush
sprite"), proceed without further confirmation.

## Core Philosophy

**The prompt should describe how the asset behaves visually inside the game
renderer, not what the object "looks like."**

You are creating gameplay assets, NOT illustrations.

Image models default toward: showcase art, concept renders, cinematic
composition, object presentation. Game sprites need: readability, silhouette
clarity, map integration, consistent perspective, low visual noise.

A good top-down sprite is closer to **iconography and cartography** than
realistic rendering. The player only needs to instantly understand: what it is,
where collision is, and whether it matters.

**The asset should feel like an in-game map object, not an illustration of an
object.** This is the single highest-value sentence discovered through testing.

**The asset should look like a clean PNG exported from a professional 2D game
pipeline.** This reframes the model away from illustration logic toward
production sprite extraction.

### The 10 Core Rules

1. **Prioritize gameplay readability over realism.** Props are exaggerated,
   simplified, symbolic — not physically accurate.
2. **Describe the sprite's FUNCTION, not its appearance.** Say "top-down
   gameplay map prop representing X" not just "X". The phrase "gameplay map
   prop" massively changes model behavior.
3. **Define the camera aggressively with geometric constraints.** Models drift
   toward isometric/3/4. Vague phrases like "top-down" or "orthographic" alone
   are insufficient. Use: "viewed directly from above", "90-degree overhead
   orthographic", "no perspective convergence", "avoid visible side surfaces",
   "avoid visible depth extrusion".
4. **Ban presentation rendering.** Not concept art, not a diorama, not a
   showcase render, not a display model, not cinematic.
5. **Tilemap integration is critical.** "The sprite should read correctly when
   placed directly onto a grass tilemap" forces cleaner edges and less haloing.
6. **Reduce texture density.** Use broad readable shapes instead of fine
   realistic detail. Avoid excessive texture noise and micro-detail.
7. **Prioritize silhouette over detail.** "The object silhouette must be
   readable instantly at gameplay scale" — many generated props only look good
   zoomed in.
8. **Avoid environmental ownership.** The terrain belongs to the map, not the
   sprite. The object should terminate directly into transparency without
   environmental blending.
9. **Use existing games as FUNCTIONAL references** (for readability, not style
   copying): A Link to the Past, Minish Cap, GBA Pokemon, Secret of Mana,
   Golden Sun.
10. **Think in terms of map symbols.** Props are closer to cartographic symbols
    than realistic objects. Optimize for readability and cohesion, not maximum
    visual complexity.

### Critical Anti-Patterns

NEVER let the prompt accidentally encourage:

- concept art rendering
- cinematic perspective
- environmental storytelling backgrounds
- terrain grounding
- realistic presentation
- diorama composition
- showcase lighting
- display-model staging

NEVER rely on an ambiguous subject word when the gameplay role depends on
vertical interpretation. Terms like `stalactite`, `stalagmite`, `ledge`, or
`pillar` can drift into the wrong camera logic or wrong world attachment unless
you explicitly say `floor prop`, `ceiling prop`, `wall prop`, or `map object`.

These produce: isometric drift, terrain halos, unreadable silhouettes, poor
tilemap integration.

NEVER combine highly realistic rendering language with retro gameplay readability
language in the same prompt. The model averages them badly.

NEVER optimize for "coolness" — games need clarity, modularity, repetition
tolerance, and visual hierarchy over dramatic angles, lighting, or complexity.

### Strongest Universal Phrases

These are the highest-value steering lines discovered through iteration:

- `DESIGNED TO SIT DIRECTLY ON A TILEMAP`
- `DESIGNED AS A GAMEPLAY MAP OBJECT`
- `READABLE AT GAMEPLAY SCALE`
- `VIEWED DIRECTLY FROM ABOVE`
- `THE TERRAIN BELONGS TO THE MAP, NOT THE SPRITE`
- `Object proportions should prioritize gameplay readability over realism`
- `The asset should feel like an in-game map object, not an illustration of an object`
- `The asset should look like a clean PNG exported from a professional 2D game pipeline`
- `Imagine the object has already been cut from a sprite sheet and placed over transparency`

## Why ChatGPT drifts back to bad asset output

The model has a strong prior that a noun like "well", "cart", "bush" is part of
an *illustration*, not an isolated game asset. Any words that imply scene,
environment, or grounding silently activate this prior, which manifests as:

- a circular dirt/stone pad under the object
- baked contact shadow that bleeds into terrain
- grass or weeds spilling outside the silhouette
- soft alpha vignette around the edge

Once that prior fires, "remove the white halo" gets interpreted as "make the
dirt look better" rather than "delete the dirt entirely". The cure is not a
bigger negative list — it is to never let the prior fire in the first place.
Describe the request as a *gameplay map object*, not as a *thing in a scene*.

### The "object shading" vs "ground shading" confusion

Models confuse internal form shading with environmental grounding. Saying "no
shadows" gets interpreted as "no cast shadow" while still adding AO haze,
grounding fog, and soft environmental paint. Be explicit about what is allowed
vs forbidden:

**Allowed:** internal form shading within the object silhouette only.

**Forbidden:** any pixels beneath, around, or outside the object silhouette;
any ambient occlusion extending outside the sprite; any environmental shading;
any grounding effect.

## Prompt Section Order

Diffusion models obey prompts better when spatial/geometric constraints come
before aesthetics. Structure ALL prompts (both prop and terrain) in this order:

1. **Object Identity** — what it is, production framing
2. **Geometric Rules** — camera, perspective, canvas
3. **Alpha / Isolation Rules** — transparency behavior (props only)
4. **Gameplay Readability** — scale, detail level, silhouette
5. **Render Style** — colours, painting style, references
6. **Content** — include/exclude details
7. **Anti-Illustration Constraints** — suppress fantasy artwork mode
8. **Absolute Exclusions** — negative priority block (end of prompt)

Putting exclusions LAST improves compliance noticeably — the end of the prompt
heavily affects image generation weighting.

## Asset Class Selection

There are TWO fundamentally different asset categories. Select the correct one
BEFORE writing the prompt:

### Category A: Gameplay Props (use the Prop Template)

Isolated objects placed on the map. Have transparent backgrounds. Do not tile.

**Small Props** (signs, barrels, crates, gravestones, boards):
- Very flat geometry, almost no visible depth
- Perspective lines: "almost entirely flat from above", "minimal visible depth"

**Structures** (huts, shrines, cottages, wells, bridges):
- Some structural depth allowed
- Perspective lines: "roof occupies most of the sprite", "walls minimally
  visible"

**Nature** (trees, roots, bushes, rocks):
- More organic volume tolerated
- Perspective lines: "canopy/crown viewed from above", "natural volume from
  overhead view"

### Category B: Terrain Tiles (use the Terrain Template)

Modular repeating system components. Fill the canvas edge-to-edge. Must tile
seamlessly. Have specific topology (edge type, neighbour relationships).

These are NOT "textures to describe aesthetically" — they are **reusable terrain
system components**. The prompt must describe:
- tile topology (midsection, top edge, bottom edge, corner, transition)
- spatial relationship to neighbouring terrain
- gameplay role (walkable above, inaccessible below, etc.)
- how it repeats and what direction it stacks

Examples: cliff walls, platform edges, water borders, path tiles, floor tiles.

## Prop Template

For Category A assets (props). Hand the user this block with slots filled in:

```
SNES Zelda-style top-down gameplay map prop representing [SUBJECT] for a 2D tile-based RPG.

ONLY the [SUBJECT] itself should be visible.

This is a gameplay production asset, NOT a fantasy illustration. The asset should look like a clean PNG exported from a professional 2D game pipeline. Imagine the object has already been cut from a sprite sheet and placed over transparency.

--- GEOMETRIC RULES (non-negotiable) ---

PERSPECTIVE:
- true 90-degree overhead orthographic view
- viewed directly from above
- [ASSET-CLASS PERSPECTIVE LINES]
- NO isometric angle
- NO 3/4 camera angle
- NO cinematic perspective
- NO perspective convergence
- NO visible front facade

CAMERA INTERPRETATION LOCK:
- [SUBJECT-SPECIFIC CAMERA LOCK — e.g. "trunk top visible from directly above", "branches radiate outward in planar top-down space", "no visible side profile", "no horizon-facing surfaces"]

CANVAS:
- square canvas
- prop should occupy approximately 60-80% of the canvas with consistent padding around edges

--- ALPHA / ISOLATION RULES ---

- fully transparent alpha background
- NO ground texture, dirt patch, grass, terrain base, or environmental plate
- NO circular halo, vignette, feathered edge blending, or background color
- The object must end cleanly at the outer edges with immediate transparency outside the silhouette
- The terrain belongs to the map, not the sprite

ALPHA BEHAVIOR:
- hard transparency outside silhouette
- no semi-transparent fog
- no glow
- no feathering
- no painted fadeout
- no translucent grounding beneath object

LIGHTING:
- flat ambient lighting only
- internal form shading within the object silhouette is allowed
- NO shadows of any kind — no drop shadow, no contact shadow, no cast shadow
- NO ambient occlusion extending outside the sprite
- NO dramatic, rim, studio, or environmental lighting

--- GAMEPLAY READABILITY ---

- silhouette readable at 64x64
- broad primary forms
- limited secondary detail
- [SUBJECT-SPECIFIC READABILITY NOTES — e.g. "avoid thin noisy branch clutter", "branch spacing must remain readable at gameplay zoom"]
- object proportions prioritize gameplay readability over realism
- tilemap-friendly silhouette, readable at small scale
- designed to visually harmonize with stylized painted grass tiles

--- RENDER STYLE ---

VISUAL STYLE:
- SNES Zelda-style gameplay prop (A Link to the Past readability, Minish Cap world objects)
- simplified gameplay-focused forms with broad readable shapes
- the asset should feel like an in-game map object, not an illustration

RENDERING:
- clean sprite edges, crisp readable silhouette
- not concept art, not a diorama, not a showcase render
- should feel like an in-game asset placed directly on a tilemap

--- CONTENT ---

Include:
- [INCLUDE DETAIL 1]
- [INCLUDE DETAIL 2]
- [INCLUDE DETAIL 3]

Exclude:
- [EXCLUDE DETAIL 1]
- [EXCLUDE DETAIL 2]

--- ANTI-ILLUSTRATION CONSTRAINTS ---

This is a gameplay production asset, NOT a fantasy illustration.
The object must appear as if extracted directly from a sprite sheet.
No environmental remnants should remain.

DO NOT render:
- atmospheric fog or haze
- ambient ground haze
- environmental paint strokes
- vignette or backdrop gradients
- concept-art lighting
- showcase rendering
- cinematic shading
- contact shadows
- terrain integration
- rooted grounding

--- ABSOLUTE EXCLUSIONS (highest priority) ---

- no ground
- no roots touching terrain
- no dirt
- no fog
- no shadow outside the silhouette
- no glow
- no environmental paint
- no background color
- no atmospheric effects
- no concept art presentation
- any pixels beneath, around, or outside the object silhouette are FORBIDDEN
```

### Asset-Class Perspective Lines

Replace `[ASSET-CLASS PERSPECTIVE LINES]` based on asset class:

**Small Props:**
```
- almost entirely flat from above
- minimal visible depth
- essentially a textured 2D shape
```

**Structures:**
```
- roof occupies most of the sprite
- walls minimally visible
- some structural depth acceptable
```

**Nature:**
```
- canopy/crown viewed from above
- natural volume from overhead view
- organic depth variation acceptable
```

### Camera Interpretation Lock Examples

Replace `[SUBJECT-SPECIFIC CAMERA LOCK]` based on the subject:

**Trees:**
```
- trunk top visible from directly above
- branches radiate outward in planar top-down space
- no visible side profile
- no horizon-facing surfaces
- no front-facing trunk facade
```

**Buildings/Structures:**
```
- roof plane fills most of the silhouette
- no visible wall faces
- no door visible from the front
```

**Small props (barrels, crates, signs):**
```
- lid/top surface visible only
- no side faces visible
- flat planar object from above
```

### Non-Negotiable Lines

These MUST remain in every prop prompt:

- **"gameplay map prop representing [SUBJECT]"** (not just "[SUBJECT]")
- **"ONLY the [SUBJECT] itself should be visible"**
- **"This is a gameplay production asset, NOT a fantasy illustration"**
- **"The asset should look like a clean PNG exported from a professional 2D game pipeline"**
- **"The object must end cleanly at the outer edges with immediate transparency
  outside the silhouette"**
- **"The terrain belongs to the map, not the sprite"**
- **"the asset should feel like an in-game map object, not an illustration"**
- **"prop should occupy approximately 60-80% of the canvas"**
- **"designed to visually harmonize with stylized painted grass tiles"**
- The full ANTI-ILLUSTRATION CONSTRAINTS section
- The full ABSOLUTE EXCLUSIONS section at the end

## Spritesheet-Specific Rules

When asking for multiple props on one sheet, image models often produce a
presentation board instead of a production spritesheet. The most common failure
mode is a baked sheet background with panel gradients, divider lines, or card
framing behind each sprite.

If the user wants a spritesheet:

1. Prefer generating isolated single props first, then packing them manually.
2. If requesting a sheet directly, make these constraints explicit:
   - `transparent background across the entire sheet`
   - `cells separated only by transparency`
   - `no panel background behind any sprite`
   - `no divider lines`
   - `no contact sheet presentation`
   - `no framed boxes, cards, or preview tiles`
3. Require stronger cell usage than the generic prop template:
   - `each sprite should fill roughly 70-85% of its cell`
   - `do not leave large empty margins`
4. Require clearer variant spread:
   - `each variant must have a distinct silhouette, not minor rearrangements of the same shape`

## Cave Spike Cluster Guidance

Top-down cave spike props have two recurring failure modes:

- **Direction ambiguity:** `stalactite` often triggers a side-view hanging cave
  illustration, while `stalagmite` often collapses into a generic rock cluster.
- **Material drift:** the model over-polishes them into glossy crystals or soft
  painterly mineral blobs instead of readable cave-rock obstacles.

For cave spikes, prefer phrases like:

- `top-down cave floor spike cluster gameplay prop`
- `top-down cave ceiling spike cluster gameplay prop`
- `read as rocky cave spikes, not crystals`
- `matte cave rock, restrained highlights, no glossy mineral sheen`
- `chunky readable spikes, avoid thin noisy needles`

## Terrain Template

For Category B assets (modular terrain tiles). Completely different structure
from props — no transparency, no isolation rules, full-canvas fill, tiling
constraints, and explicit topology.

The key conceptual shift: describe a **reusable terrain system component**, not
"a texture." The prompt must communicate how this tile functions in the level
editor and game renderer.

```
Modular repeating terrain [TILE_TYPE] tile for a classic SNES-style top-down 2D RPG.

OBJECT IDENTITY:
[TERRAIN CONTEXT PARAGRAPH — purpose, topology, neighbours, camera, and tiling behaviour in plain prose. See guidance below.]

GEOMETRIC RULES:
- square canvas
- texture reaches edge-to-edge with no padding, border, or frame
- seamless tiling on [TILING EDGES: all four edges / vertical edges / horizontal edges]
- true top-down perspective — NOT isometric, NOT 3/4 angle
- no perspective convergence
- no visible side surfaces or depth extrusion
- [SUBJECT] viewed strictly from above
- camera interpretation lock: flat planar surface, no horizon-facing surfaces, no front-facing facade

GAMEPLAY READABILITY:
- readable as [ROLE — e.g. "a wall barrier", "calm terrain background"] at 64x64
- broad primary forms
- limited secondary detail
- [SUBJECT-SPECIFIC READABILITY NOTES]
- consistent value density — no focal points, no centered formations
- no visible repeat focal point
- no unique formations centered in the tile
- low-frequency broad variation only
- avoid edge-darkening or corner emphasis

RENDER STYLE:
- stylized painted SNES-era terrain texture
- simplified readable forms suitable for gameplay
- visually harmonizes with stylized painted grass terrain
- evokes [REFERENCE: ALTTP cliffs / Minish Cap swamp / Pokemon ledges / etc.]
- restrained contrast and compressed value range
- broad soft colour transitions instead of detailed texture
- diffuse painterly rendering, not photorealistic
- low visual noise
- [ENERGY/MOOD: calm still surface / weathered solidity / etc.]

COLOUR PALETTE:
- [COLOUR 1]
- [COLOUR 2]
- [COLOUR 3]
- avoid [UNWANTED COLOURS]

SURFACE DETAIL:
- [DETAIL 1 — system-oriented, e.g. "broad diffuse macro-patterns"]
- [DETAIL 2]
- [DETAIL 3]
- no high-frequency noise or grain
- macro variation should dominate over micro-detail

--- ANTI-ILLUSTRATION CONSTRAINTS ---

This is a gameplay production asset, NOT a fantasy illustration.
This tile must appear as if exported directly from a professional 2D game tileset.

DO NOT render:
- atmospheric fog or haze
- concept-art lighting
- showcase rendering
- cinematic shading
- dramatic directional light
- ambient occlusion pooling in corners
- depth-of-field
- painted vignette
- environmental storytelling

--- ABSOLUTE EXCLUSIONS (highest priority) ---

- [EXCLUSIONS specific to this tile type]
- anything that reveals the tile boundary when repeated
- obvious repeated motifs that become visible at 10+ tiles scale
- dramatic lighting or hard shadows
- bright highlights or extreme darks
- no atmospheric effects
- no concept art presentation

Technical target:
Create a perfectly seamless modular terrain [TILE_TYPE] tile suitable for use as [ROLE DESCRIPTION] in a top-down 2D action-adventure game level editor.
```

### Filling in the Terrain Template

**[TERRAIN CONTEXT PARAGRAPH]** — the single most important part. Write 2-4
sentences of plain prose covering:

1. **Topology**: what part of the terrain system (midsection, top edge, corner,
   transition)
2. **Neighbours**: what tiles sit on each side
3. **Camera**: viewed from where (usually "strict 90-degree gameplay camera
   directly above")
4. **Gameplay role**: what it represents functionally ("quiet gameplay background
   beneath player movement", "inaccessible cliff wall below walkable grass")
5. **Tiling behaviour**: how it repeats ("tiles in all directions for large
   fills", "stacks vertically in strips")

Examples:

- "This is a seamless interior water-fill terrain tile viewed directly from
  above using a strict 90-degree gameplay camera. The tile represents subdued
  swampy pond water intended for large contiguous level-editor fills. It
  functions as a quiet gameplay background beneath player movement and props."
- "This is the repeating vertical midsection of a cliff wall. Identical cliff
  tiles stack above and below to create height. Grassy walkable terrain sits
  at the top of the strip. The tile uses top-down terrain abstraction — symbolic
  and diagrammatic, not physically accurate side-view."
- "This is the top edge cap tile where grass terrain ends and a cliff drop
  begins. Grass tiles sit directly above; cliff midsection tiles sit below."

**Topology types:**
- `repeating midsection` — the main body, tiles with itself
- `top edge` — transition from walkable surface to this terrain
- `bottom edge` — where this terrain ends below
- `corner` — directional change
- `transition` — blends between two terrain types

### Terrain Detail Guidance

Details must be **tiling-safe** and written in **system-oriented language** (how
the texture behaves as a system component), not aesthetic prose (how it looks as
an illustration).

System-oriented (good):
- "broad diffuse macro-patterns suggesting gentle stillness"
- "subtle low-frequency value variation to avoid visual flatness"
- "restrained contrast that won't overpower sprite layers"
- "soft cloudy tonal shifts distributed organically"

Aesthetic prose (avoid — drifts toward illustration):
- "gentle value variation implying depth differences beneath the surface"
- "dappled light patterns dancing on the water"
- "warm golden light filtering through"

Good tiling-safe details:
- "subtle broken sediment layering with irregular interruptions"
- "large readable rock masses with gentle value shifts"
- "very faint low-contrast mottling"
- "broad slow-moving tonal shifts"

Bad (breaks tiling or creates wallpaper artifacts):
- "strong horizontal strata lines" (exposes repetition immediately)
- "a distinctive crack formation" (reveals the repeat unit)
- "a large central boulder" (creates obvious pattern)
- "obvious repeated ripple shapes" (instantly visible in tiled water)
- "soft dappled light patterns" (can create spotlighting/repeat motifs)

Risky words in terrain content (can trigger unwanted additions):
- "murky" → can trigger floating debris/algae. Use "subdued" instead.
- "ancient" → can trigger ruins/carvings. Use "weathered" instead.
- "overgrown" → can trigger vegetation overlay. Use "natural wear" instead.

## Filling in the prop detail slots

Pick 3-5 descriptive details that define the object's *geometry and material*,
not its *atmosphere*. The model converts atmosphere words into terrain.

**Prefer simplified descriptions over micro-detail.** Details like "visible wood
grain and age cracks" accidentally encourage texture noise and realism. Instead
say "simplified wood texture with subtle age wear". The goal is gameplay
readability, not close-up realism.

Good details (geometric, simplified material):
- "weathered grey stones"
- "iron-banded wheels"
- "torn cloth draped over the side"
- "simplified wood texture with subtle age wear"
- "broad visible damage to one corner"

Bad details (micro-detail — encourages realism/noise):
- "visible wood grain and age cracks"
- "individually rendered nail heads"
- "detailed moss growth patterns"
- "realistic rust patina with color variation"

Bad details (atmospheric — re-summon the dirt plate):
- "abandoned in a clearing"
- "weather-beaten by time"
- "moss-covered and overgrown" *(use "streaks of green between stones" instead)*
- "weathered ground around it"
- "set in an ancient forest"

## Trigger words to AVOID in any part of the prompt

Each one of these silently re-summons the dirt plate:

| Avoid | Why |
|---|---|
| `environment` | invokes scene composition |
| `grounded` / `set in` / `placed on` | implies terrain |
| `realistic scene` | invokes illustration mode |
| `terrain` (in prop prompts) | obvious |
| `abandoned area`, `ruined area`, `forgotten place` | "area" = scene |
| `forest floor`, `village square`, `clearing` | locations |
| `surrounded by ...` | implies surroundings |
| `weathered ground around it` | direct trigger |
| `concept art` | tells the model to compose, not isolate |
| `establishing shot` / `diorama` | guarantees environment |
| `with grass`, `with rocks at the base` | invites surrounding decoration |
| `dramatic`, `cinematic`, `atmospheric` | triggers showcase mode |

Anything you'd say to a *concept artist* is wrong here. You're describing what
a *prop fabricator* should produce for a game engine.

## Power phrases to USE

Add these to the prompt or to a follow-up if the model drifts:

- "modular prop sprite"
- "isolated asset, no scene"
- "die-cut around the silhouette"
- "alpha cuts immediately at the outer stone/wood/metal edge"
- "the game engine provides the ground — do not include any"
- "treat this as a single inventory icon scaled up, not a screenshot"
- "no terrain ownership"
- "designed for tilemap readability"
- "this will be placed on a single grid cell at 100% scale"
- "clean PNG exported from a professional 2D game pipeline"
- "already cut from a sprite sheet and placed over transparency"
- "no environmental remnants should remain"

The `inventory icon scaled up` framing is surprisingly effective — it activates
a different prior (object catalog, not landscape).

The `sprite sheet extraction` framing is the single highest-value improvement
for persistent illustration drift — it reframes the entire task away from
"generate artwork" toward "produce a production asset."

## Game-specific framing (optional, very effective)

Append one of these to narrow the model's interpretation:

- *"For a 64x64 grid-based 2D top-down game in Phaser. The map already has its
  own grass and dirt overlays — anything I include in the asset would visually
  duplicate them."*
- *"This will be placed on a single grid cell at 100% scale. Anything outside
  the object's footprint will conflict with neighboring cells."*

The first one is highest-leverage — it gives the model a *reason* to omit
terrain that aligns with its goal of being helpful.

## Iteration playbook

When the user reports the result is still wrong:

1. **Don't suggest "tweaks".** Tell them to restart the conversation or paste
   the prompt verbatim with: *"Regenerate from scratch using only the prompt
   above. Do not preserve the previous composition."* The model preserves
   composition by default in follow-ups.

2. **Quote the prompt back at the model.** *"You generated something that
   violates these constraints from my prompt: [paste 3-4 of the NO bullets].
   Try again."*

3. **Show it a known-good asset.** If a previous asset (e.g. `well.png`) came
   out clean, attach it: *"Match the modular asset style of this image — clean
   alpha edges, no terrain plate."*

4. **Fall back to museum/catalog framing.** *"Imagine this prop in a museum
   catalog photographed on a transparent layer."* Catalog framings strongly
   suppress environment.

5. **Stop describing aesthetics, describe geometry.** Atmospheric words drag
   the model toward illustrative output.

6. **Invoke the sprite extraction framing.** *"This should look like a clean
   PNG already cut from a sprite sheet. No environmental remnants. Hard alpha
   outside the silhouette."* This reframes the model's entire approach.

## Recovery: if the asset is 90% correct but has a faint halo or fringe

Rather than fight the prompt for another 6 generations, post-process:

```bash
# Trim near-transparent fringe (raise alpha threshold from default ~10 to ~40)
magick well.png -alpha set -channel A -threshold 40% +channel well_clean.png

# Aggressive: erode 2px of fringe
magick well.png -alpha set \( +clone -alpha extract -morphology Erode Square:2 \) \
  -alpha off -compose CopyOpacity -composite well_clean.png
```

`well.png` in this project benefited from a similar pass.

## Reference assets in this project

Both live in `public/assets/cell_drawables/`. Use them to anchor stylistic
matching when generating new props for similar levels:

- **`well.png`** — successful modular prop. Stone silhouette ends cleanly, only
  a tiny soft contact shadow at the base. Composes cleanly on every theme.
- **`cart.png`** — failure mode (kept for comparison). The dirt+grass plate is
  ~30% of the image, opaque, has its own contact shadow, and bleeds outside
  the cart silhouette. Stickers visibly on every theme.

When the user produces a new asset, sanity-check it against `well.png` — if the
new asset has anything approaching the stylistic problems of `cart.png`, suggest
re-prompting or post-processing before they commit it.

## Output format

When responding to a trigger:

1. Identify the asset class (small prop, structure, or nature).
2. Output the full prompt block with subject/details/perspective filled in for
   that class. Use a fenced code block so the user can copy it cleanly.
3. Briefly note 1-2 detail choices you made and why, in case they want to
   adjust.
4. Optionally include the iteration playbook if the asset class is known to
   be tricky (anything circular, anything ground-based, anything organic).

Do not lecture. Do not include the full SOP background — the user already
knows why this works. Just hand them the prompt.
