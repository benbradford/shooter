# Level Themes

Level themes control the visual appearance of a level, including background rendering, vignette effects, and grid element styling (walls, stairs, shadows).

## Purpose

Themes allow different levels to have distinct visual styles without duplicating rendering code. Each theme is a self-contained renderer that extends the `GameSceneRenderer` abstract class.

## Architecture

### GameSceneRenderer (Abstract Base Class)

All theme renderers extend this base class. The base class orchestrates rendering by delegating to specialized renderer classes. Subclasses only customize the background/vignette and edge color.

**Abstract methods (subclasses must implement):**
- `renderTheme(width, height)` — Create background canvas + vignette image, return both
- `getEdgeColor()` — Return hex color for wall/platform edges

**Key public methods (base class):**
- `initializeSprites(grid, levelData)` — Creates all floor, cell, water, and platform sprites
- `updateGraphics(grid, levelData)` — Redraws edges, shadows, paths, and floor overlay
- `update(delta)` — Updates water animation each frame
- `destroy()` — Cleans up all graphics, sprites, and water animator
- `invalidateCells(cells, grid, levelData)` — Fades out and recreates sprites for modified cells

**Extracted renderer classes:**
- `EdgeRenderer` — Wall/platform edge line drawing
- `ShadowRenderer` — Drop shadows for elevated cells
- `PathRenderer` — Stone path rendering (grass theme)
- `BackgroundTextureRenderer` — Per-cell background texture sprites

**Key points:**
- Two graphics layers: `graphics` (depth -10) for shadows/paths, `edgeGraphics` (depth -9) for edges
- Rendering logic is split across focused classes, orchestrated by the base class
- Subclasses are very simple — typically just `renderTheme()` and `getEdgeColor()`
- Tunnels theme is the exception: overrides `update()` for darkness overlay and `updateGraphics()` to disable edges

### Edge Rendering

`EdgeRenderer.renderEdges()` handles all edge detection:
- **Left/Right edges**: Only drawn when adjacent cell is layer 0 (not between two layer 1 cells)
- **Top edges**: Only drawn when cell above is layer 0
- No vertical lines between adjacent wall cells — prevents double-drawing

## Current Themes

### Dungeon Theme
- Dark stone dungeon with radial gradient background
- Brown vignette
- Edge color: `0x2a2a3e`

### Swamp Theme
- Muddy/grassy background with radial gradient
- Green vignette
- Edge color: `0x2a3a2e`

### Grass Theme
- Bright green gradient background
- Stone paths with connected circular shapes
- Path cells render as grey circles with black outlines (or textured if `path_texture` specified)
- Paths automatically connect between adjacent cells
- Dead ends render with square caps instead of rounded
- Inner and outer corner arcs for smooth perimeter
- Green vignette
- Edge color: `0x3a5a2e`

### Wilds Theme
- Desolate grey/brown gradient background
- Animated mist layers that drift slowly eastward
- Mist density increases toward the south (fog gradient)
- Mist fades in/out over 6-10 second lifespan
- Brown vignette
- Edge color: `0x4a3a2a`

**Configurable mist intensity** via `mistConfig` in level JSON:
```json
{
  "levelTheme": "wilds",
  "mistConfig": {
    "baseAlpha": 0.6,
    "alphaRange": 0.4,
    "baseScale": 70,
    "scaleRange": 60
  }
}
```

| Property | Default | Effect |
|----------|---------|--------|
| `baseAlpha` | 0.3 | Minimum mist opacity (north edge) |
| `alphaRange` | 0.7 | Opacity increase going south (top + range = max) |
| `baseScale` | 45 | Minimum particle size (north) |
| `scaleRange` | 50 | Size increase going south |

All fields optional — defaults match original behavior.

### Tunnels Theme
- Murky dark olive-brown gradient background
- Very dark vignette with multiply blend
- No edge lines around walls/platforms
- Dynamic darkness overlay with radial light following the player (350px radius)
- Darkness overlay disabled in editor mode
- Edge color: `0x1a1a1a` (unused — edges disabled)

## Using a Theme

In your level JSON file, specify the theme:

```json
{
  "width": 70,
  "height": 49,
  "playerStart": { "x": 5, "y": 18 },
  "cells": [...],
  "levelTheme": "grass"
}
```

If `levelTheme` is omitted, it defaults to `"dungeon"`.

## Level Overlays

Levels can include random decorative overlays (dirt patches, cracked stone, skulls, etc.) placed on empty floor cells:

```json
{
  "background": {
    "floor_texture": "dungeon_floor",
    "tile": 15,
    "overlays": {
      "spritesheet": "assets/cell_drawables/dungeon_overlays_spritesheet.png",
      "spriteList": "assets/cell_drawables/dungeon_overlays_sprite_list.txt",
      "frequency": 10,
      "seed": 12345,
      "placementStrategy": "near_platforms",
      "rotation": "slight",
      "blendMode": "normal",
      "alphaBlend": "medium"
    }
  }
}
```

**How it works:**
- `frequency`: 1 overlay per N eligible cells (e.g., 10 = 1 per 10 cells)
- `seed`: Deterministic random seed for consistent placement
- `placementStrategy`: Where to place overlays
  - `near_platforms`: Cluster near walls, platforms, stairs (default)
  - `near_paths_water`: Cluster near paths and water
  - `random`: No bias, uniform distribution
- `rotation`: Rotation variation
  - `none`: No rotation
  - `slight`: ±30° (default)
  - `medium`: ±60°
  - `heavy`: ±180°
- `blendMode`: How overlays blend with floor
  - `normal`: Standard blending (default)
  - `multiply`: Darkens floor naturally
- `alphaBlend`: Opacity level
  - `low`: 0.4-0.5 (subtle)
  - `medium`: 0.7-0.85 (balanced, default)
  - `high`: 0.85-1.0 (prominent)
- Only places on layer 0 cells with no properties and no existing texture
- Overlays are applied once during level load via `SceneOverlays` class

## Switching Themes in Editor

Open the standalone editor (`http://localhost:5173/editor/`), then select a theme from the Level Info panel dropdown.

## Adding a New Theme

### 1. Update the LevelTheme Type

Add your theme name to the union type in `src/systems/level/LevelLoader.ts`:

```typescript
export type LevelTheme = 'dungeon' | 'swamp' | 'cave';
```

### 2. Create a Theme Renderer

Create `src/scenes/theme/YourThemeSceneRenderer.ts` extending `GameSceneRenderer`. Implement:
- `getEdgeColor()` — Return hex color for wall/platform edges
- `renderTheme(width, height)` — Create background canvas + vignette image, return both

Use `DungeonSceneRenderer` or `SwampSceneRenderer` as reference implementations.

### 3. Register in GameScene

Add a `case` in `src/scenes/theme/ThemeRendererFactory.ts` for your theme.

### 4. Add to Theme Editor

The editor theme dropdown is in the Level Info panel. Themes are defined in `src/scenes/GameScene.ts`.

### 5. Test Your Theme

1. Create a test level with your theme:
   ```json
   {
     "width": 30,
     "height": 30,
     "playerStart": { "x": 15, "y": 15 },
     "cells": [],
     "levelTheme": "cave"
   }
   ```

2. Build and run:
   ```bash
   npm run build
   npm run dev
   ```

3. Navigate to your test level in-game

## Background Textures

Individual cells can have custom background textures that override theme rendering:

**String format** (default scaling):
```json
{
  "col": 10,
  "row": 5,
  "properties": ["wall"],
  "backgroundTexture": "door_closed"
}
```

**Object format** (custom transform):
```json
{
  "backgroundTexture": {
    "image": "door_closed",
    "transformOverride": {
      "scaleX": 2,
      "scaleY": 1.18,
      "offsetX": 0,
      "offsetY": 0
    }
  }
}
```

**Spritesheet format** (extract region from a larger image):
```json
{
  "backgroundTexture": {
    "image": "wilds_props",
    "sourceRect": {
      "x": 220,
      "y": 277,
      "width": 256,
      "height": 111
    }
  }
}
```

**How it works:**
- Cells with `backgroundTexture` are rendered as images at depth -100
- The theme's custom rendering (bricks, stones) is skipped for these cells
- String format: Texture scaled to fit cell size
- Object format: Custom scaling and positioning via transformOverride
- `sourceRect`: Crops a region from the source image (creates a Phaser texture frame). If omitted, uses the full image.
- `sourceRect` and `transformOverride` can be combined

**Array format** (multiple textures per cell):
```json
{
  "backgroundTexture": [
    "rocks1",
    { "image": "roots_spritesheet", "sourceRect": { "x": 51, "y": 52, "width": 267, "height": 132 } }
  ]
}
```
Each texture in the array renders independently with its own transform/sourceRect. Old single-value format is auto-normalized to an array during rendering.

**Adding new background textures:**
1. Add image to `public/assets/{category}/` (e.g., `public/assets/cell_drawables/bush2.png`)
2. Register in `src/assets/AssetRegistry.ts` (add entry with key, path, type: `'image'`)
3. Add key to `editor` asset group array in `AssetRegistry.ts` (so it loads in the editor)
4. Add key to `BACKGROUND_TEXTURE_KEYS` in `editor/panels/TexturePicker.ts` (so it appears in the Background tab)
5. For spritesheets: Add to `SPRITESHEET_TEXTURES` in `editor/SpritesheetTextures.ts`

### Adding a Spritesheet to SPRITESHEET_TEXTURES

When adding a new spritesheet image containing multiple sprites to `editor/SpritesheetTextures.ts`:

**Step 1: Register the asset**
- Add to `ASSET_REGISTRY` as `type: 'image'` (not `'spritesheet'` — Phaser spritesheets are for animations)
- Add to the `editor` asset group

**Step 2: Extract accurate sourceRects using Python**

Do NOT assume a uniform grid. Sprites are rarely evenly spaced. Use this script to find actual sprite boundaries from transparent gaps:

```python
from PIL import Image
import numpy as np

img = Image.open('path/to/spritesheet.png').convert('RGBA')
alpha = np.array(img)[:, :, 3]
W, H = img.size
ALPHA_THRESH = 20  # Low threshold to catch semi-transparent edges

# Step 1: Find row bands (horizontal strips of sprites separated by transparent rows)
row_sums = np.sum(alpha > ALPHA_THRESH, axis=1)
# Find contiguous regions where row_sums > 50

# Step 2: For each row band, find column gaps
# Column gap = contiguous columns where np.sum(band_alpha > ALPHA_THRESH, axis=0) < 2
# Only count gaps wider than 5px

# Step 3: Split each row at gap midpoints, then find tight bounds + 4px padding
```

**Key rules:**
- **Find gaps per row, not globally** — each row has different sprite widths and positions
- **Use `col_sum < 2` threshold** for gap detection (not zero — stray pixels exist)
- **Minimum gap width: 5px** — smaller "gaps" are stray pixels within a sprite
- **Use alpha threshold of 10-20** for tight bounds — catches semi-transparent edges that threshold 128+ would miss
- **Add 4px padding** around tight bounds — prevents clipping semi-transparent edges
- **Clamp padding to gap boundaries** — don't let padding extend into neighboring sprites
- **Some sprites are genuinely wide** — if no gap exists between two visual sprites, they're connected in the pixel data and should be treated as one sprite
- **Verify with a debug image** — draw red rectangles on the spritesheet and visually confirm each sprite is fully contained with no neighbors leaking in

**Step 3: Add to SpritesheetTextures.ts**

```typescript
{
  textureKey: 'my_spritesheet',
  sprites: [
    { name: 'descriptive_name', sourceRect: { x, y, width, height } },
    // ...
  ],
},
```

Optional fields: `scaleX`, `scaleY` (default scaling), `zOffsetOverride` (depth offset).

## Theme Switching

Always destroy old renderer before creating new one to prevent render artifacts. See `GameScene.ts` for the switching implementation.

## Best Practices

### Rendering

1. **Always extend GameSceneRenderer** - Don't duplicate edge rendering logic
2. **Use deterministic rendering** - Use seed-based randomness for consistent appearance
3. **Set graphics depth to -10** - Ensures walls render behind player (done in base class)
4. **Remove textures before recreating** - Check `scene.textures.exists()` and `remove()` before `createCanvas()`
5. **Don't draw edges between adjacent walls** - Only draw when adjacent cell is layer 0

### Edge Colors

Use dark colors for edges to create depth:
- Dungeon: `0x2a2a3e` (dark blue-grey)
- Swamp: `0x2a3a2e` (dark green-grey)

## Common Pitfalls

1. **Texture already exists error** - Always check and remove existing texture before creating
2. **Render artifacts when switching themes** - Must destroy old renderer's graphics object
3. **Vertical lines between walls** - Don't draw edges when both cells are layer 1 bottom rows
4. **Edges don't align** - Use same `topBarY` calculation (15% from top) for both horizontal line and vertical edges
5. **Graphics render on top of player** - Set depth to -10 in constructor

## Related Files

- `src/scenes/theme/GameSceneRenderer.ts` - Abstract base class (orchestrates rendering)
- `src/scenes/theme/EdgeRenderer.ts` - Wall/platform edge line drawing
- `src/scenes/theme/ShadowRenderer.ts` - Drop shadows for elevated cells
- `src/scenes/theme/PathRenderer.ts` - Stone path rendering (grass theme)
- `src/scenes/theme/BackgroundTextureRenderer.ts` - Per-cell background texture sprites
- `src/scenes/theme/WaterAnimator.ts` - Water tile animation
- `src/scenes/theme/PathTilesetGenerator.ts` - Dynamic path tileset generation
- `src/scenes/theme/ThemeRendererFactory.ts` - Theme instantiation (add new themes here)
- `src/scenes/theme/DungeonSceneRenderer.ts` - Dungeon theme implementation
- `src/scenes/theme/SwampSceneRenderer.ts` - Swamp theme implementation
- `src/scenes/theme/GrassSceneRenderer.ts` - Grass theme implementation
- `src/scenes/theme/WildsSceneRenderer.ts` - Wilds theme (animated mist)
- `src/scenes/theme/TunnelsSceneRenderer.ts` - Tunnels theme (darkness + player light)
- `src/scenes/theme/DefaultSceneRenderer.ts` - Default/fallback theme
- `src/systems/SceneOverlays.ts` - Overlay placement system
- `src/scenes/GameScene.ts` - Theme switching and editor mode
- `editor/SpritesheetTextures.ts` - Spritesheet sub-sprite definitions
- `src/systems/level/LevelLoader.ts` - LevelTheme type definition
