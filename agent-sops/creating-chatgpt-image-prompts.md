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

Hand the user this exact block, with `[SUBJECT]` and `[DETAIL]` slots filled in
based on what they asked for:

```
Top-down RPG prop sprite of [SUBJECT] for a 2D game.
ONLY the [SUBJECT] structure itself should be visible.

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

The [SUBJECT] should end cleanly at its outer edges, with full transparency
immediately outside the object's silhouette.

Include:
- [DETAIL 1]
- [DETAIL 2]
- [DETAIL 3]

Perspective:
- true top-down RPG perspective
- readable gameplay silhouette
- simplified stylized game prop
- clean shape language
- not painterly concept art

Soft minimal contact shadow directly beneath the [SUBJECT] only,
no wider than the object's footprint.
Square canvas.
```

The two non-negotiable lines are:

- **"ONLY the [SUBJECT] structure itself should be visible"**
- **"end cleanly at its outer edges, with full transparency immediately outside
  the object's silhouette"**

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
> Top-down RPG prop sprite of an old faded bush for a 2D game.
> ONLY the bush structure itself should be visible.
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
>
> The bush should end cleanly at its outer leaf and twig edges, with full
> transparency immediately outside the silhouette.
>
> Include:
> - sparse, irregular foliage clusters
> - desaturated olive and dust-grey leaves
> - dry exposed twigs visible between the leaves
> - a few yellowing leaves at the bottom
>
> Perspective:
> - true top-down RPG perspective
> - readable gameplay silhouette
> - simplified stylized game prop
> - clean shape language
> - not painterly concept art
>
> Soft minimal contact shadow directly beneath the bush only,
> no wider than the object's footprint.
> Square canvas.
> ```
>
> Detail choices: faded = desaturated olive + dust-grey rather than vivid
> green; "sparse, irregular foliage" prevents the model from making a tidy
> hedge. If you want it deader/more wintry, change "sparse, irregular foliage
> clusters" to "thin bare branches with a few clinging leaves".

That's the entire response — short, paste-ready, and grounded in the
codebase's existing well/cart precedent.
