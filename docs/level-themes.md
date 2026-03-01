# Level Themes

Level themes control the visual appearance of a level, including background rendering, vignette effects, and grid element styling (walls, stairs, shadows).

## Purpose

Themes allow different levels to have distinct visual styles without duplicating rendering code. Each theme is a self-contained renderer that extends the `GameSceneRenderer` abstract class.

## Architecture

### GameSceneRenderer (Abstract Base Class)

All theme renderers extend this base class which provides:

```typescript
export abstract class GameSceneRenderer {
  protected readonly graphics: Phaser.GameObjects.Graphics;
  
  constructor(protected readonly scene: Phaser.Scene) {
    this.graphics = scene.add.graphics();
    this.graphics.setDepth(Depth.rendererGraphics); // Render behind player
  }
  
  abstract renderGrid(grid: Grid): void;
  abstract renderTheme(width: number, height: number): { 
    background: Phaser.GameObjects.Image; 
    vignette: Phaser.GameObjects.Image 
  };
  protected abstract renderWallPattern(x: number, y: number, cellSize: number, topBarY: number, seed: number): void;
  protected abstract getEdgeColor(): number;
  
  destroy(): void {
    this.graphics.destroy();
  }
  
  // Common edge rendering logic
  protected renderPlatformsAndWalls(grid: Grid, cellSize: number): void { /* ... */ }
}
```

**Key Points:**
- Graphics depth is -10 to render behind player
- `renderPlatformsAndWalls()` contains all common edge detection logic
- Subclasses only implement theme-specific parts (wall pattern rendering, edge color)

### Edge Rendering Logic

The base class handles all edge detection:
- **Left/Right edges**: Only drawn when adjacent cell is layer 0 (not when adjacent to another layer 1 cell)
- **Top edges**: Only drawn when cell above is layer 0
- **Bottom edges**: Only drawn for cells with `'wall'` property - horizontal line at 15% from top (85% height), then calls `renderWallPattern()` for theme-specific rendering

**Wall vs Platform:**
- **Walls** (cells with `'wall'` property): Render with brick/stone patterns via `renderWallPattern()`
- **Platforms** (cells with `'platform'` property): Render as elevated with no special pattern

**Critical:** No vertical lines between adjacent bottom-row cells - this prevents double-drawing edges.

## Current Themes

### Dungeon Theme
- Dark stone dungeon with radial gradient background
- Brick pattern on walls (staggered layout)
- Brown vignette
- Edge color: `0x2a2a3e`

### Swamp Theme
- Muddy/grassy background with radial gradient
- Circle stones on walls (rocky appearance)
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

### Wilds Theme
- Desolate grey/brown gradient background
- Animated mist layers that drift slowly eastward
- Mist density increases toward the south (fog gradient)
- Mist fades in/out over 6-10 second lifespan
- Brown vignette
- Edge color: `0x4a3a2a`

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

Press **E** to enter editor, then click **Theme** button to open theme selector. Click a theme name to switch immediately.

## Adding a New Theme

### 1. Update the LevelTheme Type

Add your theme name to the union type in `src/systems/level/LevelLoader.ts`:

```typescript
export type LevelTheme = 'dungeon' | 'swamp' | 'cave';
```

### 2. Create a Theme Renderer

Create a new file `src/scenes/theme/YourThemeSceneRenderer.ts`:

```typescript
import type { Grid } from '../../systems/grid/Grid';
import { GameSceneRenderer } from './GameSceneRenderer';

const EDGE_COLOR = 0x3a3a3e;

export class CaveSceneRenderer extends GameSceneRenderer {
  constructor(scene: Phaser.Scene, private readonly cellSize: number) {
    super(scene);
  }

  protected getEdgeColor(): number {
    return EDGE_COLOR;
  }

  renderGrid(grid: Grid): void {
    this.graphics.clear();
    this.renderTransitionSteps(grid);
    this.renderPlatformsAndWalls(grid, this.cellSize);
    this.renderShadows(grid);
  }

  protected renderWallPattern(x: number, y: number, cellSize: number, topBarY: number, seed: number): void {
    // Your custom wall pattern rendering (bricks, stones, etc.)
    // This is called for each wall cell
    // topBarY is at 15% from top (where horizontal line is drawn)
  }

  private renderTransitionSteps(grid: Grid): void {
    // Render stairs/transition cells
  }

  private renderShadows(grid: Grid): void {
    // Render shadows below layer 1 cells
  }

  renderTheme(width: number, height: number): { 
    background: Phaser.GameObjects.Image; 
    vignette: Phaser.GameObjects.Image 
  } {
    const worldWidth = width * this.cellSize;
    const worldHeight = height * this.cellSize;

    // Remove existing texture if switching themes
    if (this.scene.textures.exists('cave_gradient')) {
      this.scene.textures.remove('cave_gradient');
    }

    // Create background texture
    const canvas = this.scene.textures.createCanvas('cave_gradient', worldWidth, worldHeight);
    const ctx = canvas?.context;
    if (!ctx) throw new Error('Failed to create canvas context');

    // Draw your theme's background
    // ... gradient, patterns, etc.

    canvas?.refresh();

    const background = this.scene.add.image(0, 0, 'cave_gradient');
    background.setOrigin(0, 0);
    background.setDisplaySize(worldWidth, worldHeight);
    background.setDepth(Depth.floor);

    // Create vignette
    const vignette = this.scene.add.image(worldWidth / 2, worldHeight / 2, 'vin');
    vignette.setDisplaySize(worldWidth, worldHeight);
    vignette.setDepth(Depth.vignette);
    vignette.setAlpha(0.4);
    vignette.setTint(0x004400); // Your tint color
    vignette.setBlendMode(2); // MULTIPLY

    return { background, vignette };
  }
}
```

### 3. Register in GameScene

Update `src/scenes/GameScene.ts` to instantiate your renderer:

```typescript
import { CaveSceneRenderer } from "./theme/CaveSceneRenderer";

// In create() method:
const theme = this.levelData.levelTheme || 'dungeon';
if (theme === 'dungeon') {
  this.sceneRenderer = new DungeonSceneRenderer(this, this.cellSize);
} else if (theme === 'swamp') {
  this.sceneRenderer = new SwampSceneRenderer(this, this.cellSize);
} else if (theme === 'cave') {
  this.sceneRenderer = new CaveSceneRenderer(this, this.cellSize);
} else {
  this.sceneRenderer = new DungeonSceneRenderer(this, this.cellSize);
}
```

### 4. Add to Theme Editor

Update `src/editor/ThemeEditorState.ts`:

```typescript
const themes = ['dungeon', 'swamp', 'cave'];
```

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

```json
{
  "col": 10,
  "row": 5,
  "properties": ["wall"],
  "backgroundTexture": "door_closed"
}
```

**How it works:**
- In `renderPlatformsAndWalls()`, cells with `backgroundTexture` are rendered as images at depth -100
- The theme's custom rendering (bricks, stones) is skipped for these cells
- Texture is scaled to fit cell size

**Adding new textures:**
1. Add image to `public/assets/{category}/`
2. Resize to 128x128: `sips -z 128 128 path/to/texture.png`
3. Register in `src/assets/AssetRegistry.ts`
4. Add to default assets in `src/assets/AssetLoader.ts`
5. Add to `AVAILABLE_TEXTURES` in `src/editor/TextureEditorState.ts`

## Theme Switching

When switching themes in the editor:

```typescript
setTheme(theme: 'dungeon' | 'swamp'): void {
  this.levelData.levelTheme = theme;
  
  // Destroy old resources
  if (this.background) this.background.destroy();
  if (this.vignette) this.vignette.destroy();
  if (this.sceneRenderer) {
    this.sceneRenderer.destroy(); // Destroys graphics object
  }
  
  // Create new renderer
  if (theme === 'dungeon') {
    this.sceneRenderer = new DungeonSceneRenderer(this, this.cellSize);
  } else if (theme === 'swamp') {
    this.sceneRenderer = new SwampSceneRenderer(this, this.cellSize);
  }
  
  // Render new theme
  const rendered = this.sceneRenderer.renderTheme(this.levelData.width, this.levelData.height);
  this.background = rendered.background;
  this.vignette = rendered.vignette;
  
  this.grid.render();
}
```

**Critical:** Always destroy old renderer before creating new one to prevent render artifacts.

## Best Practices

### Rendering

1. **Always extend GameSceneRenderer** - Don't duplicate edge rendering logic
2. **Use deterministic rendering** - Use seed-based randomness for consistent appearance
3. **Set graphics depth to -10** - Ensures walls render behind player (done in base class)
4. **Remove textures before recreating** - Check `scene.textures.exists()` and `remove()` before `createCanvas()`
5. **Don't draw edges between adjacent walls** - Only draw when adjacent cell is layer 0

### Bottom Row Rendering

The `renderBottomRow()` method receives:
- `x, y` - Cell position
- `cellSize` - Size of cell
- `topBarY` - Y position of horizontal line (at 15% from top)
- `seed` - Deterministic seed based on `col * 1000 + row`

**Pattern:**
```typescript
protected renderWallPattern(x: number, y: number, cellSize: number, topBarY: number, seed: number): void {
  let currentY = topBarY + 4; // Start just below horizontal line
  
  while (currentY < y + cellSize) {
    // Render your pattern (bricks, stones, etc.)
    // Use seed for deterministic randomness
    currentY += stepSize;
  }
}
```

### Edge Colors

Use dark colors for edges to create depth:
- Dungeon: `0x2a2a3e` (dark blue-grey)
- Swamp: `0x2a3a2e` (dark green-grey)

### Vignette

Standard vignette setup:
```typescript
const vignette = this.scene.add.image(worldWidth / 2, worldHeight / 2, 'vin');
vignette.setDisplaySize(worldWidth, worldHeight);
vignette.setDepth(Depth.vignette);
vignette.setAlpha(0.2-0.5); // Adjust for theme
vignette.setTint(0x221111); // Theme color
vignette.setBlendMode(2); // MULTIPLY for darkening effect
```

## Common Pitfalls

1. **Texture already exists error** - Always check and remove existing texture before creating
2. **Render artifacts when switching themes** - Must destroy old renderer's graphics object
3. **Vertical lines between walls** - Don't draw edges when both cells are layer 1 bottom rows
4. **Edges don't align** - Use same `topBarY` calculation (15% from top) for both horizontal line and vertical edges
5. **Graphics render on top of player** - Set depth to -10 in constructor

## Related Files

- `src/scenes/theme/GameSceneRenderer.ts` - Abstract base class
- `src/scenes/theme/DungeonSceneRenderer.ts` - Dungeon theme implementation
- `src/scenes/theme/SwampSceneRenderer.ts` - Swamp theme implementation
- `src/scenes/theme/GrassSceneRenderer.ts` - Grass theme implementation
- `src/systems/SceneOverlays.ts` - Overlay placement system
- `src/scenes/GameScene.ts` - Theme instantiation and switching
- `src/editor/ThemeEditorState.ts` - Theme selection UI
- `src/systems/level/LevelLoader.ts` - LevelTheme type definition
