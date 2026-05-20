# SOP: Creating ChatGPT Image Prompts for Game Props

When the user asks for help writing a ChatGPT (or other image-gen) prompt for a
game asset, follow this SOP. The output is a ready-to-paste prompt block, plus
optional iteration tactics if the user reports the result is wrong.

## When to apply

Trigger phrases include:

- "help me create a chatgpt prompt to draw …"
- "give me a chatgpt prompt for …"
- "chatgpt prompt for an image of …"
- "what should i tell chatgpt to draw …"
- "image prompt for …"
- "tell chatgpt how to draw …"

If the user only describes what they want (e.g. "I need a prompt for an old bush
sprite"), proceed without further confirmation.

## Core Philosophy: Gameplay Assets, NOT Illustrations

The single most important distinction: **you are creating gameplay assets, not
illustrations.** Image models default toward showcase art, concept renders,
cinematic composition, and object presentation. Game sprites need readability,
silhouette clarity, map integration, consistent perspective, and low visual
noise.

A good top-down sprite is closer to **iconography and cartography** than
realistic rendering. The player only needs to instantly understand: what it is,
where collision is, and whether it matters.

### The 10 Core Rules

1. **Prioritize gameplay readability over realism.** Props are exaggerated,
   simplified, symbolic — not physically accurate.
2. **Describe the sprite's FUNCTION.** Say "top-down gameplay map prop
   representing X" not just "X". The phrase "gameplay map prop" is powerful.
3. **Define the camera aggressively.** Models drift toward isometric/3/4.
   Explicitly say: viewed directly from above, 90-degree orthographic, no
   perspective convergence.
4. **Ban presentation rendering.** Not concept art, not a diorama, not a
   showcase render, not a display model, not cinematic.
5. **Tilemap integration is critical.** "The sprite should read correctly when
   placed directly onto a grass tilemap" forces cleaner edges and less haloing.
6. **Reduce texture density.** Use broad readable shapes instead of fine
   realistic detail. Avoid excessive texture noise and micro-detail.
7. **Define silhouette importance.** "The object silhouette must be readable
   instantly at gameplay scale" — many generated props only look good zoomed in.
8. **Avoid environmental ownership.** The terrain belongs to the map, not the
   sprite. The object should terminate directly into transparency without
   environmental blending.
9. **Use existing games as functional references.** A Link to the Past, Minish
   Cap, GBA Pokemon, Secret of Mana, Golden Sun — for readability reference, not
   style copying.
10. **Think in terms of map symbols.** Props are closer to cartographic symbols
    than realistic objects.

### Strongest Universal Phrases

These are the highest-value steering lines discovered through iteration:

- `DESIGNED TO SIT DIRECTLY ON A TILEMAP`
- `DESIGNED AS A GAMEPLAY MAP OBJECT`
- `READABLE AT GAMEPLAY SCALE`
- `VIEWED DIRECTLY FROM ABOVE`
- `THE TERRAIN BELONGS TO THE MAP, NOT THE SPRITE`
- `Object proportions should prioritize gameplay readability over realism`

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
Describe the request as a *modular sprite*, not as a *thing in a scene*.

## Reusable prompt template

Hand the user this exact block, with `[SUBJECT]`, `[INCLUDE DETAILS]`, and
`[EXCLUDE DETAILS]` slots filled in based on what they asked for:

```
SNES Zelda-style top-down world prop sprite of [SUBJECT] for a 2D tile-based RPG.

ONLY the [SUBJECT] itself should be visible.

The asset must have:
- fully transparent alpha background
- NO ground texture
- NO dirt patch
- NO grass
- NO terrain base
- NO circular halo
- NO environmental plate
- NO baked floor underneath
- NO vignette
- NO feathered edge blending
- NO background color whatsoever

The object must end cleanly at the outer edges with immediate transparency outside the silhouette.

Include:
- [INCLUDE DETAIL 1]
- [INCLUDE DETAIL 2]
- [INCLUDE DETAIL 3]

Exclude:
- [EXCLUDE DETAIL 1]
- [EXCLUDE DETAIL 2]

VISUAL STYLE:
- SNES Zelda-style gameplay prop
- A Link to the Past inspired readability
- Minish Cap inspired world object design
- sprite-sheet asset aesthetic
- stylized 2D game prop
- tilemap-friendly silhouette
- readable at small scale
- simplified gameplay-focused forms
- hand-painted pixel-art-inspired texture treatment
- grounded but slightly stylized proportions
- object proportions prioritize gameplay readability over realism
- broad readable shapes instead of fine realistic detail
- designed to sit directly on a tilemap
- the terrain belongs to the map, not the sprite

PERSPECTIVE:
- true 90-degree overhead orthographic view
- extremely flattened gameplay perspective
- viewed directly from above
- roof occupies most of the sprite
- walls minimally visible
- NO visible front facade
- NO isometric angle
- NO 3/4 camera angle
- NO cinematic perspective
- NO perspective convergence
- designed like a classic Zelda map object
- designed as a gameplay map object
- designed for gameplay readability first
- object silhouette must be readable instantly at gameplay scale

LIGHTING:
- soft ambient lighting only
- subtle shadow directly beneath object only
- NO dramatic directional lighting
- NO rim lighting
- NO studio lighting
- NO environmental bounce lighting

RENDERING:
- clean sprite edges
- crisp readable silhouette
- no painterly concept art look
- no realistic 3D render appearance
- no diorama presentation
- no display-model presentation
- should feel like an in-game asset, not an illustration

CANVAS:
- square canvas
```

The non-negotiable lines are:

- **"ONLY the [SUBJECT] itself should be visible"**
- **"The object must end cleanly at the outer edges with immediate transparency
  outside the silhouette"**
- The full PERSPECTIVE block (prevents isometric/3/4 view drift)
- The full VISUAL STYLE block (anchors to SNES Zelda aesthetic)

Without those, the negative list does about half its job.

## Filling in the [DETAIL] slots

Pick 3-5 descriptive details that define the object's *geometry and material*,
not its *atmosphere*. The model converts atmosphere words into terrain.

Good details (geometric, material):
- "weathered grey stones"
- "iron-banded wheels"
- "torn cloth draped over the side"
- "fraying rope hanging into the opening"
- "broken slats with visible nails"

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
| `surrounded by …` | implies surroundings |
| `weathered ground around it` | direct trigger |
| `concept art` | tells the model to compose, not isolate |
| `establishing shot` / `diorama` | guarantees environment |
| `with grass`, `with rocks at the base` | invites surrounding decoration |

Anything you'd say to a *concept artist* is wrong here. You're describing what
a *prop fabricator* should produce.

## Power phrases to USE

Add these to the prompt or to a follow-up if the model drifts:

- "modular prop sprite"
- "isolated asset, no scene"
- "die-cut around the silhouette"
- "alpha cuts immediately at the outer stone/wood/metal edge"
- "the game engine provides the ground — do not include any"
- "treat this as a single inventory icon scaled up, not a screenshot"
- "no terrain ownership"

The `inventory icon scaled up` framing is surprisingly effective — it activates
a different prior (object catalog, not landscape).

## Game-specific framing (optional, very effective)

Append one of these to narrow the model's interpretation:

- *"For a 64×64 grid-based 2D top-down game in Phaser. The map already has its
  own grass and dirt overlays — anything I include in the asset would visually
  duplicate them."*
- *"This will be placed on a single grid cell at 100% scale. Anything outside
  the object's footprint will conflict with neighboring cells."*
- *"Stylistically match: stone-grey palette, slight desaturation, painterly but
  with hard silhouette edges."*

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

1. Confirm subject and ask for any detail clarifications only if essential
   (e.g. "do you want a single bush or a cluster?"). Default to running with
   sensible details.
2. Output the full prompt block (the template above with subject/details
   filled in). Use a fenced code block so the user can copy it cleanly.
3. Briefly note 1-2 detail choices you made and why, in case they want to
   adjust.
4. Optionally include the iteration playbook if the asset class is known to
   be tricky (anything circular, anything ground-based, anything organic).

Do not lecture. Do not include the full SOP background — the user already
knows why this works. Just hand them the prompt.

## Example

User: *"help me create a chatgpt prompt to draw a faded old bush prop"*

Response:

> Subject: faded old bush prop, dry/sparse, suitable for grass or wilds theme.
>
> ```
> SNES Zelda-style top-down world prop sprite of an old faded bush for a 2D tile-based RPG.
>
> ONLY the bush itself should be visible.
>
> The asset must have:
> - fully transparent alpha background
> - NO ground texture
> - NO dirt patch
> - NO grass
> - NO terrain base
> - NO circular halo
> - NO environmental plate
> - NO baked floor underneath
> - NO vignette
> - NO feathered edge blending
> - NO background color whatsoever
>
> The object must end cleanly at the outer edges with immediate transparency outside the silhouette.
>
> Include:
> - sparse, irregular foliage clusters
> - desaturated olive and dust-grey leaves
> - dry exposed twigs visible between the leaves
> - a few yellowing leaves at the bottom
>
> Exclude:
> - vibrant green colors
> - tidy hedge shape
> - flowers or fruit
>
> VISUAL STYLE:
> - SNES Zelda-style gameplay prop
> - A Link to the Past inspired readability
> - Minish Cap inspired world object design
> - sprite-sheet asset aesthetic
> - stylized 2D game prop
> - tilemap-friendly silhouette
> - readable at small scale
> - simplified gameplay-focused forms
> - hand-painted pixel-art-inspired texture treatment
> - grounded but slightly stylized proportions
>
> PERSPECTIVE:
> - true 90-degree overhead orthographic view
> - extremely flattened gameplay perspective
> - roof occupies most of the sprite
> - walls minimally visible
> - NO visible front facade
> - NO isometric angle
> - NO 3/4 camera angle
> - NO cinematic perspective
> - NO perspective convergence
> - designed like a classic Zelda map object
> - designed for gameplay readability first
>
> LIGHTING:
> - soft ambient lighting only
> - subtle shadow directly beneath object only
> - NO dramatic directional lighting
> - NO rim lighting
> - NO studio lighting
> - NO environmental bounce lighting
>
> RENDERING:
> - clean sprite edges
> - crisp readable silhouette
> - no painterly concept art look
> - no realistic 3D render appearance
> - no diorama presentation
> - no display-model presentation
> - should feel like an in-game asset, not an illustration
>
> CANVAS:
> - square canvas
> ```
>
> Detail choices: faded = desaturated olive + dust-grey rather than vivid
> green; "sparse, irregular foliage" prevents the model from making a tidy
> hedge. If you want it deader/more wintry, change "sparse, irregular foliage
> clusters" to "thin bare branches with a few clinging leaves".

That's the entire response — short, paste-ready, and grounded in the
codebase's existing well/cart precedent.
