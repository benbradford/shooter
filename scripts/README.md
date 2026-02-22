# Path Tileset Generator

## Overview

Generates a 16-tile spritesheet for rendering connected paths from any source texture. Replaces expensive geometry mask operations with simple sprite rendering.

## Usage

```bash
node scripts/generate-path-tileset.js <input-texture> <output-spritesheet>
```

**Example:**
```bash
node scripts/generate-path-tileset.js public/assets/cell_drawables/stone_floor.png public/assets/cell_drawables/stone_path_tileset.png
```

## Tile Layout

The generated spritesheet is a 4x4 grid (256x256 pixels) with 16 tiles:

| Index | Connections | Description |
|-------|-------------|-------------|
| 0 | None | Empty (isolated) |
| 1 | North | Dead-end north |
| 2 | East | Dead-end east |
| 3 | South | Dead-end south |
| 4 | West | Dead-end west |
| 5 | North-South | Vertical straight |
| 6 | East-West | Horizontal straight |
| 7 | North-East | Corner |
| 8 | North-West | Corner |
| 9 | South-East | Corner |
| 10 | South-West | Corner |
| 11 | North-East-South | T-junction |
| 12 | North-East-West | T-junction |
| 13 | North-South-West | T-junction |
| 14 | East-South-West | T-junction |
| 15 | All | Cross (4-way) |

## Visual Style

- **Center circle**: 20px radius
- **Path width**: 16px
- **Outline**: 2px black stroke
- **Texture**: Source texture clipped to path shape

## Integration

The tileset is automatically used by `GrassSceneRenderer` when rendering cells with the `'path'` property. The renderer:
1. Checks neighboring cells for path connections
2. Selects appropriate tile index (0-15)
3. Renders sprite at cell position

## Performance

**Before (geometry masks):**
- Each path cell creates a mask object (GPU operation)
- Causes lag with many path cells

**After (sprite tileset):**
- Simple sprite rendering (cheap)
- No performance impact regardless of path count
