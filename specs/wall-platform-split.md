# Spec: Split 'wall' into 'platform' and 'wall'

## Overview

Currently, layer 1 cells use a single `'wall'` property, but have two distinct behaviors:
1. **Bottom row cells** (layer 1 with layer 0 below, not stairs) - Render as actual walls with brick/stone patterns
2. **Other layer 1 cells** - Render as elevated platforms with no special rendering

This spec splits `'wall'` into two distinct properties:
- `'platform'` - Elevated cells (current non-bottom-row walls)
- `'wall'` - Actual walls (current bottom-row walls)

## Current State

### CellProperty Type
```typescript
// src/systems/grid/CellData.ts
export type CellProperty = 'wall' | 'elevated' | 'stairs';
```

**Note:** `'elevated'` is defined but never used in the codebase.

### Layer Detection
```typescript
// src/systems/grid/Grid.ts
getLayer(cell: CellData): number {
  if (cell.properties.has('wall') || cell.properties.has('stairs')) return 1;
  return 0;
}
```

### Bottom Row Detection
Bottom rows are detected at render time:
```typescript
// src/scenes/theme/GameSceneRenderer.ts (line 65)
if (row < grid.height - 1 && grid.getLayer(grid.cells[row + 1][col]) === 0 && !grid.isTransition(cell)) {
  // This is a bottom row - render wall pattern
  this.renderBottomRow(x, y, cellSize, topBarY, seed);
}
```

### Pathfinding Wall Edge Logic
```typescript
// src/systems/Pathfinder.ts (line 191-200)
// Block movement into wall edges (layer 1 with layer 0 below)
if (targetLayer === 1) {
  const cellBelow = this.grid.getCell(newCol, newRow + 1);
  if (cellBelow && this.grid.getLayer(cellBelow) === 0) {
    if (dir.col !== 0 && dir.row === 0) {
      return null; // Block horizontal movement
    }
    if (!allowLayerChanges) {
      return null; // Robots can't path through wall edges
    }
  }
}
```

## Proposed Changes

### 1. Update CellProperty Type
```typescript
// src/systems/grid/CellData.ts
export type CellProperty = 'platform' | 'wall' | 'stairs';
```

Remove `'elevated'` (unused), add `'platform'`, keep `'wall'` and `'stairs'`.

### 2. Update Grid.getLayer()
```typescript
// src/systems/grid/Grid.ts
getLayer(cell: CellData): number {
  if (cell.properties.has('platform') || cell.properties.has('wall') || cell.properties.has('stairs')) return 1;
  return 0;
}
```

### 3. Add Grid.isWall() Helper
```typescript
// src/systems/grid/Grid.ts
isWall(cell: CellData): boolean {
  return cell.properties.has('wall');
}
```

### 4. Update Rendering Logic
```typescript
// src/scenes/theme/GameSceneRenderer.ts (line 65)
// Replace bottom row detection with direct wall check
if (row < grid.height - 1 && grid.getLayer(grid.cells[row + 1][col]) === 0 && grid.isWall(cell)) {
  // Render wall pattern
  this.renderBottomRow(x, y, cellSize, topBarY, seed);
}
```

### 5. Update Pathfinding Logic
```typescript
// src/systems/Pathfinder.ts (line 191-200)
// Replace wall edge detection with direct wall check
if (targetLayer === 1 && this.grid.isWall(targetCell)) {
  if (dir.col !== 0 && dir.row === 0) {
    return null; // Block horizontal movement into walls
  }
  if (!allowLayerChanges) {
    return null; // Robots can't path through walls
  }
}
```

### 6. Update GridCollisionComponent
```typescript
// src/ecs/components/movement/GridCollisionComponent.ts (line 60, 73)
// Replace cellBelow checks with direct wall check
if (toLayer === 1 && this.grid.isWall(toCell)) {
  return false; // Block movement into walls
}
```

### 7. Update Editor UI
```typescript
// src/editor/GridEditorState.ts (line 23)
const tags: CellProperty[] = ['platform', 'wall', 'stairs'];
```

### 8. Migrate Level JSON Files

**Algorithm:**
For each cell with `properties: ["wall"]`:
1. Check if cell at (col, row + 1) exists
2. Check if cell below is layer 0 (no 'wall', 'platform', or 'stairs')
3. Check if current cell is NOT stairs
4. If all true → `properties: ["wall"]` (keep as wall)
5. Otherwise → `properties: ["platform"]` (convert to platform)

**Files to migrate:**
- `public/levels/default.json`
- `public/levels/level1.json`

## Questions for Clarification

### Q1: What about cells at the bottom edge of the map?
If a cell is at row = height - 1 (last row), there is no cell below it. Should these be:
- A) Always treated as walls (since nothing below)
- B) Always treated as platforms (edge case)
- C) Left as-is in JSON (manual decision)

**Recommendation:** Treat as platforms (B) since they're at the map edge and unlikely to be intentional walls.

### Q2: Should we remove the unused 'elevated' property entirely?
Currently defined but never used. Options:
- A) Remove it (cleaner)
- B) Keep it for future use
- C) Repurpose it for something else

**Recommendation:** Remove it (A) to reduce confusion.

### Q3: Migration script or manual?
Options:
- A) Write a Node.js script to migrate JSON files automatically
- B) Manually update JSON files
- C) Provide a script but review changes manually

**Recommendation:** Write a script (A) with dry-run mode to preview changes.

## Implementation Order

1. **Phase 1: Type Changes**
   - Update `CellProperty` type
   - Update `Grid.getLayer()`
   - Add `Grid.isWall()` helper
   - Update editor UI tags

2. **Phase 2: Logic Updates**
   - Update rendering logic (GameSceneRenderer)
   - Update pathfinding logic (Pathfinder)
   - Update collision logic (GridCollisionComponent)

3. **Phase 3: Migration**
   - Create migration script
   - Run on level JSON files
   - Test in-game

4. **Phase 4: Verification**
   - Build and lint
   - Test editor (place walls, platforms, stairs)
   - Test pathfinding (robots, bugs)
   - Test rendering (walls show patterns, platforms don't)

## Files to Modify

### Core Types
- `src/systems/grid/CellData.ts` - Update CellProperty type
- `src/systems/grid/Grid.ts` - Update getLayer(), add isWall()

### Rendering
- `src/scenes/theme/GameSceneRenderer.ts` - Update bottom row detection

### Pathfinding
- `src/systems/Pathfinder.ts` - Update wall edge detection

### Collision
- `src/ecs/components/movement/GridCollisionComponent.ts` - Update wall edge checks

### Editor
- `src/editor/GridEditorState.ts` - Update tag list

### Data
- `public/levels/default.json` - Migrate wall → platform/wall
- `public/levels/level1.json` - Migrate wall → platform/wall

## Testing Checklist

- [ ] Build passes (`npm run build`)
- [ ] Lint passes (`npx eslint src --ext .ts`)
- [ ] Editor shows 'platform', 'wall', 'stairs' checkboxes
- [ ] Placing 'wall' renders brick/stone pattern
- [ ] Placing 'platform' renders as elevated with no pattern
- [ ] Robots can't path through walls
- [ ] Bugs can path through platforms
- [ ] Collision blocks movement into walls
- [ ] Level JSON files load correctly
- [ ] Existing levels render correctly

## Notes

- This change is backward-compatible at the type level (both 'platform' and 'wall' are layer 1)
- Rendering and pathfinding behavior will change based on the new property
- Migration script is critical to avoid manual JSON editing
