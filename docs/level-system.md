# Level System

The level system allows you to define game levels in JSON files or code.

## Level Data Structure

```typescript
interface LevelData {
  width: number;          // Grid width in cells
  height: number;         // Grid height in cells
  playerStart: {
    x: number;            // Player start X in cells
    y: number;            // Player start Y in cells
  };
  cells: LevelCell[];     // Array of special cells
}

interface LevelCell {
  col: number;            // Column position
  row: number;            // Row position
  layer?: number;         // Layer (-1 = pit, 0 = ground, 1 = platform)
  isTransition?: boolean; // Is this a staircase?
}
```

## Loading Levels

Levels are always loaded from JSON files asynchronously.

```typescript
// In GameScene.create() - must be async
async create() {
  const level = await LevelLoader.load('default');
  
  // Initialize grid with level data
  this.grid = new Grid(this, level.width, level.height, this.cellSize);
  
  // Apply level cells
  for (const cell of level.cells) {
    this.grid.setCell(cell.col, cell.row, {
      layer: cell.layer,
      isTransition: cell.isTransition
    });
  }
  
  // Use level player start position
  const startX = this.cellSize * level.playerStart.x;
  const startY = this.cellSize * level.playerStart.y;
  // ... create player at startX, startY
}
```

This loads from `public/levels/default.json`.

## Creating Level Files

### File Location

Place level JSON files in `public/levels/`:
- `public/levels/default.json`
- `public/levels/level1.json`
- `public/levels/boss-arena.json`

### Example Level File

```json
{
  "width": 40,
  "height": 30,
  "playerStart": {
    "x": 10,
    "y": 10
  },
  "cells": [
    { "col": 5, "row": 6, "layer": -1 },
    { "col": 6, "row": 6, "layer": -1 },
    { "col": 7, "row": 5, "layer": 0, "isTransition": true },
    { "col": 15, "row": 8, "layer": 1 },
    { "col": 16, "row": 8, "layer": 1 }
  ]
}
```

**Note:** The `createRect()` helper is available as a public static method on `LevelLoader` if you need to generate level data programmatically, but all levels should be stored as JSON files.

## Layer System

**Layer Values:**
- **-1**: Pits, water, lower areas
- **0**: Default ground level (default for all cells)
- **1**: Elevated platforms, upper floors
- **2+**: Higher levels

**Transition Cells:**
- Connect adjacent layers (e.g., layer 0 transition connects to layer 1)
- Only allow vertical movement (up/down)
- Don't block projectiles
- Must be placed adjacent to the platform they connect to

## Converting Existing Levels

If you have hardcoded level setup in GameScene:

**Before:**
```typescript
const gridWidth = 40;
const gridHeight = 30;
this.grid = new Grid(this, gridWidth, gridHeight, cellSize);

for (let col = 5; col <= 8; col++) {
  for (let row = 6; row <= 8; row++) {
    this.grid.setCell(col, row, { layer: -1 });
  }
}

const startX = cellSize * 10;
const startY = cellSize * 10;
```

**After:**
```typescript
const level = LevelLoader.load('default');
this.grid = new Grid(this, level.width, level.height, cellSize);

for (const cell of level.cells) {
  this.grid.setCell(cell.col, cell.row, {
    layer: cell.layer,
    isTransition: cell.isTransition
  });
}

const startX = cellSize * level.playerStart.x;
const startY = cellSize * level.playerStart.y;
```

## How It Works

1. **GameScene.create()** is async and calls `await LevelLoader.load('default')`
2. **LevelLoader.load()** fetches `public/levels/default.json` via HTTP
3. The JSON is parsed into a `LevelData` object
4. Grid is initialized with `level.width` and `level.height`
5. Each cell in `level.cells` is applied to the grid with `setCell()`
6. Player spawns at `level.playerStart.x/y` (in cell coordinates, multiplied by cellSize)
7. Camera bounds are set to `level.width * cellSize` by `level.height * cellSize`

**Important:** Only cells specified in the `cells` array have special properties (layers, transitions). All other cells default to layer 0 and are walkable.

## Best Practices

1. **Always use JSON files** - All levels should be in `public/levels/`
2. **Keep player start on layer 0** - Unless you have a specific reason
3. **Place transitions adjacent to platforms** - One cell away from the platform edge
4. **Test layer transitions** - Make sure player can reach all areas
5. **Use descriptive filenames** - `level1.json`, `boss-arena.json`, etc.

## Future Enhancements

Potential additions to the level system:
- Enemy spawn points
- Item/pickup locations
- Trigger zones
- Wall tiles (currently all non-specified cells are walkable)
- Tilemap integration for visuals
- Level editor tool
