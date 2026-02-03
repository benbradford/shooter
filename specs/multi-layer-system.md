# Spec: Multi-Layer System

## Overview

Currently, the game has a binary layer system: layer 0 (ground) and layer 1 (platforms/walls). This spec introduces support for arbitrary integer layers (0, 1, 2, 3, ...) to enable stacking platforms and creating multi-story environments.

## Goals

- Support multiple vertical layers (0, 1, 2, 3, ...)
- Allow platforms to stack on top of each other
- Require stairs to move between layers
- Prevent movement/shooting through higher layers
- Maintain backward compatibility with existing levels

## Current State

### CellData Structure
```typescript
// src/systems/grid/CellData.ts
export type CellData = {
  properties: Set<CellProperty>;  // 'platform', 'wall', 'stairs'
  occupants: Set<Entity>;
  backgroundTexture?: string;
};
```

### Layer Detection
```typescript
// src/systems/grid/Grid.ts
getLayer(cell: CellData): number {
  if (cell.properties.has('platform') || cell.properties.has('wall') || cell.properties.has('stairs')) return 1;
  return 0;
}
```

### Entity Layer Tracking
```typescript
// src/ecs/components/movement/GridPositionComponent.ts
public currentLayer: number = 0;
```

## Proposed Changes

### 1. Add Layer Field to CellData

```typescript
// src/systems/grid/CellData.ts
export type CellData = {
  layer: number;                  // NEW: Explicit layer (0, 1, 2, ...)
  properties: Set<CellProperty>;  // 'platform', 'wall', 'stairs'
  occupants: Set<Entity>;
  backgroundTexture?: string;
};
```

**Default:** `layer: 0` if not specified

### 2. Update Grid.getLayer()

```typescript
// src/systems/grid/Grid.ts
getLayer(cell: CellData): number {
  return cell.layer;  // Simply return the explicit layer
}
```

### 3. Update Level JSON Structure

**Before:**
```json
{
  "col": 10,
  "row": 5,
  "properties": ["wall"]
}
```

**After:**
```json
{
  "col": 10,
  "row": 5,
  "layer": 1,
  "properties": ["wall"]
}
```

**Migration:**
- All cells with `properties: ["wall"]` or `properties: ["platform"]` → `layer: 1`
- All cells with `properties: ["stairs"]` → `layer: 0` (stairs are at the lower layer)
- All other cells → `layer: 0` (default)

### 4. Update Collision Logic

**GridCollisionComponent:**
- Block movement into cells with `layer > currentLayer`
- Allow movement into cells with `layer <= currentLayer`
- Stairs allow transitioning between `currentLayer` and `currentLayer + 1`

```typescript
// Pseudo-code
canMoveTo(fromCell, toCell, currentLayer) {
  const toLayer = toCell.layer;
  
  // Can't move to higher layer without stairs
  if (toLayer > currentLayer && !isTransition(fromCell)) {
    return false;
  }
  
  // Can't move into walls at any layer >= currentLayer
  if (toLayer >= currentLayer && isWall(toCell)) {
    return false;
  }
  
  return true;
}
```

### 5. Update Rendering

**renderPlatformsAndWalls():**
- Draw edges when adjacent cell has `layer < currentCell.layer`
- Currently checks `layer === 0`, should check `layer < currentCell.layer`

```typescript
// Pseudo-code
if (rightCell.layer < cell.layer) {
  // Draw right edge
}
```

### 6. Update Projectile Logic

**ProjectileComponent:**
- Projectiles can hit cells at `layer <= currentLayer`
- Projectiles blocked by cells at `layer > currentLayer` (if `blockedByWalls: true`)
- Passing through stairs upgrades `currentLayer` by 1

```typescript
// Pseudo-code
if (cellLayer > this.currentLayer && this.blockedByWalls) {
  // Blocked by higher layer
  this.entity.destroy();
}

if (isTransition(cell) && cell.layer === this.currentLayer) {
  // Upgrade layer when passing through stairs
  this.currentLayer++;
}
```

### 7. Update Pathfinding

**Pathfinder:**
- Can move freely between cells of same layer
- Moving to different layer requires stairs
- Stairs connect `layer N` to `layer N+1`

```typescript
// Pseudo-code
if (targetLayer !== currentLayer) {
  // Must use stairs to change layers
  if (!isTransition(currentCell) && !isTransition(targetCell)) {
    return null; // No path
  }
}
```

### 8. Update Editor

**GridEditorState:**
- Add layer input field (number input, default 0)
- Save layer value to JSON
- Show current layer in UI

**UI:**
```
Layer: [-] [0] [+]
Tags: [platform] [wall] [stairs]
```

Display current layer value between +/- buttons.

### 9. Add Tests

**Test scenarios:**
- Player on layer 0 cannot enter layer 1 platform without stairs
- Player on layer 1 can walk on layer 1 platforms
- Player can use stairs to move from layer 0 → layer 1 → layer 2
- Projectiles from layer 0 blocked by layer 1 walls
- Projectiles from layer 1 can hit layer 0 and layer 1 targets
- Pathfinding finds route using multiple stairs

## Clarifying Questions - ANSWERED

### Q1: Stairs Layer Assignment ✓
**Decision:** Lower layer (A)
- Stairs from 0→1 have `layer: 0`
- Stairs are "on" the lower layer and provide access to higher layer

### Q2: Stairs Direction ✓
**Decision:** Bidirectional (A)
- Can go up or down through same stairs
- Simpler implementation

### Q3: Projectile Layer Upgrade ✓
**Decision:** Yes, upgrade (A)
- Projectile passing through stairs upgrades to `currentLayer + 1`
- Allows shooting up staircases

### Q4: Backward Compatibility ✓
**Decision:** Migration script (A)
- Add `layer: 0` to all cells by default
- Add `layer: 1` to cells with 'wall' or 'platform' properties
- Stairs get `layer: 0`

### Q5: Maximum Layer ✓
**Decision:** No limit
- Allow arbitrary positive integers
- Simpler implementation, more flexible

### Q6: Negative Layers ✓
**Decision:** No
- Keep it simple, only support 0 and positive integers
- Remove references to layer -1 from docs

### Q7: Editor Layer Selection ✓
**Decision:** +/- buttons
- Current layer display with increment/decrement buttons
- Simple and intuitive

### Q8: Entity Falling ✓
**Decision:** Block movement
- Can't move into empty space at lower layer
- Falling mechanics deferred to future

## Implementation Order

### Phase 1: Data Structure (No Behavior Change)
1. Add `layer` field to `CellData` with default 0
2. Update `Grid.getLayer()` to return `cell.layer`
3. Update level loader to read `layer` field (default 0 if missing)
4. Update level saver to write `layer` field
5. Migration script to add `layer: 1` to existing walls/platforms

### Phase 2: Collision & Movement
6. Update `GridCollisionComponent` to check `layer > currentLayer`
7. Update stairs logic to transition between adjacent layers
8. Update `GridPositionComponent.currentLayer` tracking

### Phase 3: Rendering
9. Update `renderPlatformsAndWalls()` to check `layer < currentCell.layer`
10. Update shadow rendering for multi-layer

### Phase 4: Combat
11. Update `ProjectileComponent` layer blocking logic
12. Update `LineOfSightComponent` for multi-layer
13. Update enemy projectiles (fireballs, shells)

### Phase 5: Pathfinding
14. Update `Pathfinder` to require stairs for layer changes
15. Update enemy AI to use multi-layer pathfinding

### Phase 6: Editor
16. Add layer input to `GridEditorState`
17. Update save/load to handle layers
18. Add visual indicators for different layers

### Phase 7: Testing
19. Add multi-layer movement tests
20. Add multi-layer shooting tests
21. Add multi-layer pathfinding tests

## Files to Modify

### Core Data
- `src/systems/grid/CellData.ts` - Add `layer` field
- `src/systems/grid/Grid.ts` - Update `getLayer()`

### Level System
- `src/systems/level/LevelLoader.ts` - Read `layer` field
- `public/levels/*.json` - Add `layer` to cells

### Collision & Movement
- `src/ecs/components/movement/GridCollisionComponent.ts` - Layer-aware collision
- `src/ecs/components/movement/GridPositionComponent.ts` - Track current layer

### Rendering
- `src/scenes/theme/GameSceneRenderer.ts` - Multi-layer edge rendering

### Combat
- `src/ecs/components/combat/ProjectileComponent.ts` - Layer blocking
- `src/ecs/components/combat/LineOfSightComponent.ts` - Multi-layer LOS

### Pathfinding
- `src/systems/Pathfinder.ts` - Multi-layer pathfinding

### Editor
- `src/editor/GridEditorState.ts` - Layer selection UI
- `src/scenes/EditorScene.ts` - Save/load layers

### Tests
- `test/tests/player/test-multi-layer.js` - New test file

## Migration Script

```javascript
// scripts/migrate-multi-layer.js
const fs = require('fs');
const path = require('path');

function migrateLevelToMultiLayer(levelPath) {
  const level = JSON.parse(fs.readFileSync(levelPath, 'utf8'));
  
  for (const cell of level.cells) {
    if (!cell.layer) {
      // Infer layer from properties
      if (cell.properties?.includes('wall') || cell.properties?.includes('platform')) {
        cell.layer = 1;
      } else if (cell.properties?.includes('stairs')) {
        cell.layer = 0; // Stairs are at lower layer
      } else {
        cell.layer = 0; // Default
      }
    }
  }
  
  fs.writeFileSync(levelPath, JSON.stringify(level, null, 2));
  console.log(`Migrated: ${levelPath}`);
}

// Migrate all levels
const levelsDir = path.join(__dirname, '../public/levels');
const files = fs.readdirSync(levelsDir).filter(f => f.endsWith('.json'));

for (const file of files) {
  migrateLevelToMultiLayer(path.join(levelsDir, file));
}
```

## Testing Checklist

- [ ] Build passes (`npm run build`)
- [ ] Lint passes (`npx eslint src --ext .ts`)
- [ ] Player can move on layer 0
- [ ] Player blocked by layer 1 platform without stairs
- [ ] Player can use stairs to reach layer 1
- [ ] Player can walk on layer 1 platforms
- [ ] Player can use stairs to reach layer 2
- [ ] Projectiles from layer 0 blocked by layer 1 walls
- [ ] Projectiles from layer 1 can hit layer 0 and layer 1
- [ ] Pathfinding works across multiple layers
- [ ] Editor can set layer values
- [ ] Editor saves/loads layers correctly
- [ ] Old levels load with inferred layers

## Risks & Considerations

1. **Complexity:** Multi-layer system adds significant complexity to collision, rendering, and pathfinding
2. **Performance:** More layer checks per frame - should be negligible but worth profiling
3. **Level Design:** Requires careful design to avoid confusing layouts
4. **Backward Compatibility:** Old levels need migration or runtime inference
5. **Visual Clarity:** Players need to understand which layer they're on

## Future Enhancements

- Layer indicator in HUD (e.g., "Layer 2")
- Transparency/shading for lower layers
- Falling mechanics (drop to lower layer)
- Ladders (alternative to stairs)
- Elevators (instant layer change)
- Layer-specific fog of war
