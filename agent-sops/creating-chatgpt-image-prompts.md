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

For Category A assets (props). Structure:

## Prompt Template

Structure prompts into these explicit sections. This improves consistency and
reduces conflicting instructions:

1. Object Identity
2. Asset Isolation Rules
3. Gameplay Readability Rules (Include/Exclude)
4. Visual Style
5. Perspective Rules
6. Lighting Rules
7. Rendering Restrictions
8. Canvas/Layout

Hand the user this block with slots filled in:

```
SNES Zelda-style top-down gameplay map prop representing [SUBJECT] for a 2D tile-based RPG.

ONLY the [SUBJECT] itself should be visible.

--- HARD RULES (geometric constraints — non-negotiable) ---

ISOLATION:
- fully transparent alpha background
- NO ground texture, dirt patch, grass, terrain base, or environmental plate
- NO circular halo, vignette, feathered edge blending, or background color
- The object must end cleanly at the outer edges with immediate transparency outside the silhouette
- The terrain belongs to the map, not the sprite

PERSPECTIVE:
- true 90-degree overhead orthographic view
- viewed directly from above
- [ASSET-CLASS PERSPECTIVE LINES]
- NO isometric angle
- NO 3/4 camera angle
- NO cinematic perspective
- NO perspective convergence
- NO visible front facade

LIGHTING:
- soft ambient lighting only
- subtle shadow directly beneath object only
- NO dramatic, rim, studio, or environmental lighting

CANVAS:
- square canvas
- prop should occupy approximately 60-80% of the canvas with consistent padding around edges

--- SOFT STYLE (aesthetic preferences) ---

VISUAL STYLE:
- SNES Zelda-style gameplay prop (A Link to the Past readability, Minish Cap world objects)
- simplified gameplay-focused forms with broad readable shapes
- object proportions prioritize gameplay readability over realism
- tilemap-friendly silhouette, readable at small scale
- designed to visually harmonize with stylized painted grass tiles
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

### Non-Negotiable Lines

These MUST remain in every prompt:

- **"gameplay map prop representing [SUBJECT]"** (not just "[SUBJECT]")
- **"ONLY the [SUBJECT] itself should be visible"**
- **"The object must end cleanly at the outer edges with immediate transparency
  outside the silhouette"**
- **"The terrain belongs to the map, not the sprite"**
- **"the asset should feel like an in-game map object, not an illustration"**
- **"prop should occupy approximately 60-80% of the canvas"**
- **"designed to visually harmonize with stylized painted grass tiles"**
- The full HARD RULES section (geometric constraints the model must not violate)

## Terrain Template

For Category B assets (modular terrain tiles). Completely different structure
from props — no transparency, no isolation rules, full-canvas fill, tiling
constraints, and explicit topology.

The key conceptual shift: describe a **reusable terrain system component**, not
"a texture." The prompt must communicate how this tile functions in the level
editor and game renderer.

```
Modular repeating terrain [TILE_TYPE] tile for a classic SNES-style top-down RPG (A Link to the Past, Minish Cap).

[TERRAIN PURPOSE SENTENCE]

--- HARD RULES (non-negotiable) ---

TILE TOPOLOGY:
- this tile is a [TOPOLOGY: repeating midsection / top edge / bottom edge / corner / transition]
- [NEIGHBOUR DESCRIPTION: what tiles sit above/below/beside this one]
- [STACKING DIRECTION: how this tile repeats when placed in a strip]

TILING:
- must tile seamlessly with itself when repeated in [DIRECTION]
- NO visible seams, joins, or repeat boundaries when tiled
- avoid strong central focal points or unique formations that reveal repetition
- consistent visual density across the entire tile
- avoid strong horizontal/vertical bands that expose wallpaper repetition

PERSPECTIVE:
- top-down terrain abstraction (symbolic, not physically accurate)
- NOT a literal side-view — this is a diagrammatic terrain element
- styled like ALTTP cliff walls / Pokemon ledges / Minish Cap terrain
- NO isometric angle, NO perspective convergence

CANVAS:
- square canvas
- texture fills 100% of the canvas edge-to-edge
- NO padding, border, frame, or margin

--- SOFT STYLE ---

VISUAL STYLE:
- stylized painted-game texture treatment with simplified readable forms
- designed to visually harmonize with stylized painted grass tiles
- muted natural tones with subtle warm/cool variation
- should feel like a terrain tile from a classic top-down game

VALUE AND FREQUENCY:
- restrained contrast suitable for gameplay backgrounds
- avoid high-contrast detail clusters that overpower sprites
- macro variation should dominate over micro-detail
- detail frequency should remain broad and diffuse across the tile
- low-frequency value variation to avoid visual flatness
- maintain a compressed value range with minimal extreme highlights or shadows
- surface variation should distribute organically without forming detectable repeating motifs
- texture should remain readable when repeated over large contiguous areas (20x20+)
- this tile functions as background terrain beneath interactive gameplay elements

RENDERING:
- use broad readable forms, not fine realistic noise
- low texture density for gameplay readability
- not photorealistic, not noisy
- avoid excessive micro-detail that distracts from gameplay

--- CONTENT ---

Include:
- [TERRAIN DETAIL 1]
- [TERRAIN DETAIL 2]
- [TERRAIN DETAIL 3]

Exclude:
- [EXCLUSION 1]
- any element that would break seamless tiling when repeated
- avoid obvious repeated shapes that become visible at scale
```

### Filling in the Terrain Template

**[TERRAIN PURPOSE SENTENCE]** — the single most important line. Describes the
tile's gameplay function, spatial hierarchy, and relationship to neighbours.
Examples:

- "This is a modular repeating terrain wall tile intended to visually connect
  grassy walkable terrain above with lower inaccessible terrain below."
- "This is the top edge cap tile where grass terrain ends and a cliff drop
  begins."
- "This is a horizontal platform edge tile showing the boundary between
  walkable stone floor and void."

**[TOPOLOGY]** — which part of the terrain system this tile represents:
- `repeating midsection` — the main body, tiles with itself
- `top edge` — transition from walkable surface to this terrain
- `bottom edge` — where this terrain ends below
- `corner` — directional change
- `transition` — blends between two terrain types

**[NEIGHBOUR DESCRIPTION]** — what the level editor places next to this:
- "grassy walkable terrain sits directly above this tile"
- "identical cliff tiles sit above and below"
- "grass to the left, void to the right"

**[STACKING DIRECTION]** — how it repeats:
- "tiles vertically in a strip to create cliff height"
- "tiles horizontally to create a platform edge"
- "tiles in a 2x2 grid for large floor areas"

### Terrain Detail Guidance

For repeating terrain, detail must be **tiling-safe** and described in
**system-oriented language** (how the texture behaves), not aesthetic prose (how
it looks in a scene).

System-oriented (good):
- "subtle low-frequency value variation to avoid visual flatness"
- "broad diffuse colour shifts across the tile"
- "restrained contrast that won't overpower sprite layers"

Aesthetic prose (avoid — drifts toward illustration):
- "gentle value variation implying depth differences beneath the surface"
- "dappled light patterns dancing on the water"
- "warm golden light filtering through"

Good tiling-safe details:
- "subtle broken sediment layering with irregular interruptions"
- "large readable rock masses with gentle value shifts"
- "extremely subtle diffuse surface variation"

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
| `terrain` | obvious |
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

The `inventory icon scaled up` framing is surprisingly effective — it activates
a different prior (object catalog, not landscape).

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
