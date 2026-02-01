# Level Themes

Level themes control the visual appearance of a level, including background rendering, vignette effects, and grid element styling (walls, stairs, shadows).

## Purpose

Themes allow different levels to have distinct visual styles without duplicating rendering code. Each theme is a self-contained renderer that implements the `GameSceneRenderer` interface.

## Current Themes

- **dungeon** - Dark stone dungeon with radial gradient background, cracks, circles, and brown vignette

## Using a Theme

In your level JSON file, specify the theme:

```json
{
  "width": 70,
  "height": 49,
  "playerStart": { "x": 5, "y": 18 },
  "cells": [...],
  "levelTheme": "dungeon"
}
```

If `levelTheme` is omitted, it defaults to `"dungeon"`.

## Adding a New Theme

### 1. Update the LevelTheme Type

Add your theme name to the union type in `src/systems/level/LevelLoader.ts`:

```typescript
export type LevelTheme = 'dungeon' | 'forest' | 'cave';
```

### 2. Create a Theme Renderer

Create a new file `src/scenes/theme/YourThemeSceneRenderer.ts`:

```typescript
import type { Grid } from '../../systems/grid/Grid';
import type { GameSceneRenderer } from './GameSceneRenderer';

export class ForestSceneRenderer implements GameSceneRenderer {
  private readonly graphics: Phaser.GameObjects.Graphics;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly cellSize: number
  ) {
    this.graphics = scene.add.graphics();
  }

  renderGrid(grid: Grid): void {
    this.graphics.clear();
    // Render walls, stairs, shadows for this theme
    // You can reuse methods from DungeonSceneRenderer or create new ones
  }

  renderTheme(width: number, height: number): { 
    background: Phaser.GameObjects.Image; 
    vignette: Phaser.GameObjects.Image 
  } {
    const worldWidth = width * this.cellSize;
    const worldHeight = height * this.cellSize;

    // Create background texture
    const canvas = this.scene.textures.createCanvas('gradient', worldWidth, worldHeight);
    const ctx = canvas?.context;
    if (!ctx) throw new Error('Failed to create canvas context');

    // Draw your theme's background
    ctx.fillStyle = '#2a4a2a'; // Forest green
    ctx.fillRect(0, 0, worldWidth, worldHeight);
    // Add trees, leaves, etc.

    canvas?.refresh();

    const background = this.scene.add.image(0, 0, 'gradient');
    background.setOrigin(0, 0);
    background.setDisplaySize(worldWidth, worldHeight);
    background.setDepth(-1000);

    // Create vignette
    const vignette = this.scene.add.image(worldWidth / 2, worldHeight / 2, 'vin');
    vignette.setDisplaySize(worldWidth, worldHeight);
    vignette.setDepth(1000);
    vignette.setAlpha(0.4);
    vignette.setTint(0x004400); // Green tint
    vignette.setBlendMode(2);

    return { background, vignette };
  }
}
```

### 3. Register in GameScene

Update `src/scenes/GameScene.ts` to instantiate your renderer:

```typescript
import { ForestSceneRenderer } from "./theme/ForestSceneRenderer";

// In create() method:
const theme = this.levelData.levelTheme || 'dungeon';
if (theme === 'dungeon') {
  this.sceneRenderer = new DungeonSceneRenderer(this, this.cellSize);
} else if (theme === 'forest') {
  this.sceneRenderer = new ForestSceneRenderer(this, this.cellSize);
} else {
  this.sceneRenderer = new DungeonSceneRenderer(this, this.cellSize);
}
```

### 4. Test Your Theme

1. Create a test level with your theme:
   ```json
   {
     "width": 30,
     "height": 30,
     "playerStart": { "x": 15, "y": 15 },
     "cells": [],
     "levelTheme": "forest"
   }
   ```

2. Build and run:
   ```bash
   npm run build
   npm run dev
   ```

3. Navigate to your test level in-game

## GameSceneRenderer Interface

All theme renderers must implement:

```typescript
type GameSceneRenderer = {
  renderGrid(grid: Grid): void;
  renderTheme(width: number, height: number): { 
    background: Phaser.GameObjects.Image; 
    vignette: Phaser.GameObjects.Image 
  };
}
```

### renderGrid(grid: Grid)

Called every frame to render grid elements (walls, stairs, shadows). Use `this.graphics` to draw.

**Common elements to render:**
- Transition steps (stairs between layers)
- Layer 1 edges (wall outlines)
- Brick patterns on walls
- Shadows on adjacent cells

See `DungeonSceneRenderer` for reference implementation.

### renderTheme(width, height)

Called once during level initialization to create the background and vignette.

**Must return:**
- `background` - Phaser.GameObjects.Image at depth -1000
- `vignette` - Phaser.GameObjects.Image at depth 1000

**Tips:**
- Use canvas rendering for complex backgrounds
- Keep texture size ≤ 2048x2048 (WebGL limit)
- Use radial gradients for depth
- Add procedural details (cracks, circles, etc.) for variety

## Theme-Specific Constants

Define theme-specific colors and values as constants at the top of your renderer:

```typescript
const WALL_FILL_COLOR = 0x4a4a5e;
const WALL_EDGE_COLOR = 0x2a2a3e;
const BRICK_FILL_COLOR = 0x3a3a4e;
const SHADOW_WIDTH = 24;
const SHADOW_STEPS = 8;
```

This makes it easy to adjust the theme's appearance.

## Best Practices

1. **Reuse rendering logic** - If multiple themes share similar wall/stair rendering, extract to shared functions
2. **Keep it performant** - Avoid expensive operations in `renderGrid()` (called every frame)
3. **Test with different grid sizes** - Ensure your theme works on small (20x20) and large (100x100) grids
4. **Use procedural generation** - Add randomness to backgrounds for variety
5. **Match the game's aesthetic** - Themes should feel cohesive with the overall art style

## Related Files

- `src/systems/level/LevelLoader.ts` - LevelTheme type definition
- `src/scenes/theme/GameSceneRenderer.ts` - Interface definition
- `src/scenes/theme/DungeonSceneRenderer.ts` - Reference implementation
- `src/scenes/GameScene.ts` - Theme instantiation logic
