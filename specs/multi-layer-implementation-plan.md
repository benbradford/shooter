# Multi-Layer System - Implementation Plan

## Summary

Spec created: `specs/multi-layer-system.md`
Migration script created: `scripts/migrate-multi-layer.js`

**Status:** Phase 1 in progress

## Decisions Confirmed

1. **Stairs layer:** Lower layer (stairs from 0→1 have `layer: 0`)
2. **Stairs direction:** Bidirectional (can go up/down)
3. **Projectile upgrade:** Yes (passing through stairs upgrades to `currentLayer + 1`)
4. **Migration:** Script adds `layer: 0` (default) or `layer: 1` (walls/platforms)
5. **Max layer:** No limit (arbitrary positive integers)
6. **Negative layers:** No (only 0 and positive)
7. **Editor UI:** +/- buttons to adjust layer
8. **Falling:** Block movement (no falling mechanics)

## Migration Script

**Dry run (preview changes):**
```bash
node scripts/migrate-multi-layer.js --dry-run
```

**Apply migration:**
```bash
node scripts/migrate-multi-layer.js
```

**Results:**
- `default.json`: 326 cells to migrate
- `level1.json`: 179 cells to migrate
- Total: 505 cells

## Implementation Phases

### Phase 1: Data Structure ✅ COMPLETED
**Files modified:**
- [x] `src/systems/grid/CellData.ts` - Added `layer: number` field
- [x] `src/systems/grid/Grid.ts` - Updated `getLayer()` to return `cell.layer`, added layer to initialization, fixed `setCell()` to merge layer
- [x] `src/systems/level/LevelLoader.ts` - Added optional `layer` field to `LevelCell`
- [x] `src/scenes/GameScene.ts` - Read `layer` field from JSON with default 0
- [x] `src/scenes/theme/GameSceneRenderer.ts` - Updated to include stairs in edge rendering, skip top 20% edges for stairs
- [x] `src/scenes/theme/DungeonSceneRenderer.ts` - Fixed stairs rendering (top bar, progressive shading, no shadows)
- [x] `src/scenes/theme/SwampSceneRenderer.ts` - Fixed stairs rendering (top bar, progressive shading, no shadows)
- [x] Ran migration script: `node scripts/migrate-multi-layer.js`
  - Migrated 326 cells in default.json
  - Migrated 179 cells in level1.json
- [x] Verified build: `npm run build` ✅
- [x] Verified lint: `npx eslint src --ext .ts` ✅ (pre-existing errors only)

**Changes made:**
- `CellData` now has explicit `layer: number` field
- `Grid.getLayer()` returns `cell.layer` directly
- `Grid.setCell()` merges `layer` field from data
- Grid initialization sets `layer: 0` for all cells
- Level loader reads `layer` from JSON (defaults to 0 if missing)
- All level JSON files now have explicit layer values
- Stairs rendering fixed:
  - Top 20% filled with platform color
  - Horizontal bar at 20% to show elevation
  - Progressive shading on steps (dark to light)
  - Edges only render below top 20%
  - Shadows excluded from stairs cells

### Phase 2: Collision & Movement ✅ COMPLETED
**Files modified:**
- [x] `src/ecs/components/movement/GridCollisionComponent.ts`
  - Updated `canMoveTo()` to block movement into any higher layer (not just walls)
  - Updated `currentLayer` tracking to handle transitions properly
  - Transitions now allow access to adjacent layers (layer ±1)
- [x] Verified build: `npm run build` ✅
- [x] Verified lint: `npx eslint src --ext .ts` ✅ (pre-existing warnings only)

**Changes made:**
- Movement into higher layers now blocked unless coming from/going to transition
- `currentLayer` updates when moving through transitions
- Transitions allow movement to layers within range (transitionLayer ±1)
- Wall blocking logic preserved (walls always block unless from transition)

### Phase 3: Rendering ✅ COMPLETED
**Files modified:**
- [x] `src/scenes/theme/GameSceneRenderer.ts`
  - Updated `renderPlatformsAndWalls()` to check `layer < currentCell.layer` instead of `layer === 0`
  - Edges now render based on relative layer comparison
  - Works for any layer height (not just 0 and 1)
- [x] Verified build: `npm run build` ✅
- [x] Verified lint: `npx eslint src --ext .ts` ✅ (pre-existing errors only)

**Changes made:**
- Right edge: Draws when `rightCell.layer < currentLayer`
- Left edge: Draws when `leftCell.layer < currentLayer`
- Top edge: Draws when `aboveCell.layer < currentLayer`
- Bottom edge: Draws when `belowCell.layer < currentLayer` (walls only)
- System now supports arbitrary layer heights (0, 1, 2, 3, ...)

**Logic:**
```typescript
// Draw edges when adjacent cell is lower layer
if (rightCell.layer < cell.layer) {
  // Draw right edge
}
```

### Phase 4: Combat ⏸️ NOT STARTED
**Files to modify:**
- [ ] `src/ecs/components/combat/ProjectileComponent.ts`
  - Block projectiles by cells at `layer > currentLayer`
  - Upgrade `currentLayer` when passing through stairs
- [ ] `src/ecs/components/combat/LineOfSightComponent.ts`
  - Check layer blocking for LOS

**Logic:**
```typescript
// Projectile blocked by higher layer
if (cellLayer > this.currentLayer && this.blockedByWalls) {
  this.entity.destroy();
}

// Upgrade layer when passing through stairs
if (isTransition(cell) && cell.layer === this.currentLayer) {
  this.currentLayer++;
}
```

### Phase 5: Pathfinding ⏸️ NOT STARTED
**Files to modify:**
- [ ] `src/systems/Pathfinder.ts`
  - Require stairs for layer changes
  - Allow free movement within same layer

**Logic:**
```typescript
// Must use stairs to change layers
if (targetCell.layer !== currentCell.layer) {
  if (!isTransition(currentCell) && !isTransition(targetCell)) {
    return null; // No path
  }
}
```

### Phase 6: Editor ✅ COMPLETED
**Files modified:**
- [x] `src/editor/GridEditorState.ts`
  - Added `selectedLayer` field (default 0)
  - Added layer selection buttons (Layer 0, 1, 2, 3) at top of screen
  - Updated `paintCell()` to apply selected layer
- [x] `src/scenes/EditorScene.ts`
  - Updated `setCellData()` signature to accept `layer` parameter
- [x] Verified build: `npm run build` ✅
- [x] Verified lint: `npx eslint src --ext .ts` ✅ (pre-existing errors only)

**Changes made:**
- Grid editor now has 4 layer buttons at top (Layer 0-3)
- Selected layer highlighted in green
- Painting cells applies selected layer + properties
- Can now create multi-layer test scenarios in editor

### Phase 7: Testing ⏸️ NOT STARTED
**Files to create:**
- [ ] `test/tests/player/test-multi-layer.js`

**Test scenarios:**
- Player on layer 0 blocked by layer 1 platform
- Player can use stairs to reach layer 1
- Player can walk on layer 1 platforms
- Projectiles from layer 0 blocked by layer 1 walls
- Pathfinding works across multiple layers

## Progress Tracking

**Completed:** Phase 1 ✅
**In Progress:** None
**Remaining:** Phases 2-7

**Next Phase:** Phase 2 - Collision & Movement

## Resume Command

To continue implementation in a new session:
```
Continue execution of multi-layer-system from Phase 2
```

Check this file for current phase status before resuming.
