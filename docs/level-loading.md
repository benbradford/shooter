# Level Loading and Asset Management

## Overview

The game uses a dynamic asset loading system that loads only the assets required for each level, reducing initial load times and memory usage.

## Asset Registry

Assets are defined in `src/assets/AssetRegistry.ts` with the following structure:

```typescript
export const ASSET_REGISTRY = {
  player: {
    key: 'player',
    path: 'assets/player/player-spritesheet.png',
    type: 'spritesheet',
    config: { frameWidth: 64, frameHeight: 64 }
  },
  // ... more assets
}
```

## Asset Groups

Assets are organized into logical groups in `src/assets/AssetLoader.ts`:

```typescript
export const ASSET_GROUPS = {
  core: ['vignette', 'shadow'],
  player: ['player', 'rock', 'bullet_default', 'bullet_default_shell', 'smoke', ...],
  stalking_robot: ['attacker'],
  bug_base: ['bug_base', 'bug'],
  thrower: ['thrower', 'grenade'],
  skeleton: ['skeleton', 'bone_small'],
}
```

### Group Types

- **core**: Always loaded (vignette, shadows)
- **player**: Player sprites and projectiles
- **Enemy groups**: Each enemy type and its projectiles/effects

## Level-Specific Loading

When loading a level, the system:

1. **Analyzes level JSON** - Determines which enemies are present
2. **Extracts background textures** - Reads `background.floor_texture`, `background.wall_texture`, etc.
3. **Checks cell textures** - Looks for custom `backgroundTexture` on individual cells
4. **Loads required assets** - Only loads what's needed for that level

### Example Level JSON

```json
{
  "width": 40,
  "height": 30,
  "levelTheme": "dungeon",
  "background": {
    "floor_texture": "dungeon_floor",
    "wall_texture": "stone_wall",
    "stairs_texture": "stone_stairs",
    "platform_texture": "stone_floor",
    "overlays": {
      "spritesheet": "assets/cell_drawables/dungeon_overlays_spritesheet.png",
      "spriteList": "assets/cell_drawables/dungeon_overlays_sprite_list.txt",
      "frequency": 5,
      "seed": 1
    }
  },
  "robots": [...],
  "throwers": [...],
  "cells": [
    {
      "col": 10,
      "row": 5,
      "layer": 1,
      "backgroundTexture": "stone_floor"
    }
  ]
}
```

## Usage

### Loading a Level

```typescript
import { preloadLevelAssets } from '../assets/AssetLoader';
import { LevelLoader } from '../systems/level/LevelLoader';

async loadLevel(levelName: string): Promise<void> {
  // Load level data
  const levelData = await LevelLoader.load(levelName);
  
  // Load required assets
  preloadLevelAssets(this, levelData);
  
  // Wait for loading to complete
  await new Promise<void>(resolve => {
    if (this.load.isLoading()) {
      this.load.once('complete', () => resolve());
    } else {
      resolve();
    }
    this.load.start();
  });
  
  // Continue with level setup...
}
```

### Adding New Assets

1. **Add to ASSET_REGISTRY** in `src/assets/AssetRegistry.ts`:
```typescript
my_new_sprite: {
  key: 'my_new_sprite',
  path: 'assets/my_new_sprite.png',
  type: 'image'
}
```

2. **Add to appropriate group** in `src/assets/AssetLoader.ts`:
```typescript
my_enemy: ['my_new_sprite', 'my_projectile'] as const
```

3. **Update level detection** in `getRequiredAssetGroups()`:
```typescript
if (levelData.myEnemies && levelData.myEnemies.length > 0) {
  groups.push('my_enemy');
}
```

## Scene Cleanup

When loading a new level, the system performs comprehensive cleanup:

1. **Clears timer events** - `scene.time.removeAllEvents()`
2. **Destroys all game objects** - Except HUD elements
3. **Destroys scene renderer** - Clears graphics and sprites
4. **Destroys overlays** - Removes all overlay images
5. **Destroys entities** - Via EntityManager

This ensures no artifacts from the previous level remain visible.

## Debugging

Asset loading logs to console:
```
[AssetLoader] Loaded 25 textures: ['attacker', 'bug', 'bug_base', ...]
```

To see what's loaded, check the browser console after switching levels (press L in-game).
