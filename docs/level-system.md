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

### From Code (Synchronous)

```typescript
// In GameScene.create()
const level = LevelLoader.load('default');
```

This returns the hardcoded default level immediately.

### From JSON File (Async)

```typescript
// In GameScene.create() - make it async
async create() {
  const level = await LevelLoader.loadFromFile(this, 'default');
  // ... rest of setup
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

### Helper Function for Rectangles

When defining levels in code, use `createRect()` helper:

```typescript
// In LevelLoader.ts
private static getMyLevel(): LevelData {
  return {
    width: 50,
    height: 40,
    playerStart: { x: 5, y: 5 },
    cells: [
      // Create a 5x5 pit area
      ...this.createRect(10, 10, 15, 15, { layer: -1 }),
      
      // Transition cell
      { col: 12, row: 9, layer: 0, isTransition: true },
      
      // Platform
      ...this.createRect(20, 15, 25, 20, { layer: 1 }),
    ]
  };
}
```

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

## Best Practices

1. **Use JSON files for production levels** - easier to edit and version control
2. **Use code for procedural/test levels** - when you need dynamic generation
3. **Keep player start on layer 0** - unless you have a specific reason
4. **Place transitions adjacent to platforms** - one cell away from the platform edge
5. **Test layer transitions** - make sure player can reach all areas

## Future Enhancements

Potential additions to the level system:
- Enemy spawn points
- Item/pickup locations
- Trigger zones
- Wall tiles (currently all non-specified cells are walkable)
- Tilemap integration for visuals
- Level editor tool
