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
  - Left edge half thickness (4px) to prevent bleeding into lower layer cells
  - Platforms only draw edges when adjacent to lower layers or walls at same layer
  - Walls only draw edges when adjacent to lower layers
  - Stairs draw edges when adjacent to walls
- [x] `src/scenes/theme/DungeonSceneRenderer.ts` & `SwampSceneRenderer.ts`
  - Shadows cast from any elevated layer to lower layers (relative comparison)
  - Shadow smoothness: 24 steps instead of 8
  - Horizontal shadows only cast onto lower layers (not stairs)
  - Corner shadows only cast onto lower layers (not stairs)
  - Wall patterns render to top (no 20% gap)
  - Stairs shading reversed (darker bottom, lighter top)
  - Horizontal bar removed from stairs
- [x] `src/systems/grid/Grid.ts`
  - Progressive layer darkening: `layerAlpha = 0.3 + (layer * 0.1)`
- [x] Verified build: `npm run build` ✅
- [x] Verified lint: `npx eslint src --ext .ts` ✅ (pre-existing errors only)

**Changes made:**
- Right edge: Draws when `rightCell.layer < currentLayer`
- Left edge: Draws when `leftCell.layer < currentLayer` (half thickness)
- Top edge: Draws when `aboveCell.layer < currentLayer`
- Bottom edge: Draws when `belowCell.layer < currentLayer` (walls only)
- System now supports arbitrary layer heights (0, 1, 2, 3, ...)

**Key lessons:**
- Left edge must be half thickness to prevent bleeding into adjacent cells
- Shadows should not cast onto stairs (only lower layers)
- Edge rendering logic: platforms draw edges to lower OR same-layer walls, walls only to lower
- Progressive darkening makes layer depth clear in debug view

**Logic:**
```typescript
// Draw edges when adjacent cell is lower layer
if (rightCell.layer < cell.layer) {
  // Draw right edge
}
```

### Phase 4: Combat ✅ COMPLETED
**Files modified:**
- [x] `src/ecs/components/combat/ProjectileComponent.ts`
  - Changed from `startLayer` to `currentLayer` tracking
  - Upgrade `currentLayer` when passing through transitions
  - Block projectiles by cells at `layer > currentLayer`
  - Initialize `currentLayer` to `startLayer + 1` if fired from transition
- [x] `src/ecs/components/combat/LineOfSightComponent.ts`
  - Upgrade layer when raycast passes through transitions
  - Check layer blocking against current raycast layer (not min of both entities)
- [x] Verified build: `npm run build` ✅
- [x] Verified lint: `npx eslint src --ext .ts` ✅ (pre-existing errors only)

**Projectile Layer Rules:**
1. Bullets pass through platforms/walls at same layer or lower
2. Bullets blocked by platforms/walls at strictly higher layer
3. Bullets upgrade layer when passing through stairs
4. After upgrading through stairs, bullets blocked by walls at that upgraded layer
5. Example: Standing on layer 0, shoot through stairs (upgrade to layer 1), hit layer 1 wall = blocked
6. Example: Standing on layer 2, shoot at layer 1 wall = passes through
7. Example: Standing on layer 1, shoot at layer 1 wall = passes through

**Changes made:**
- Projectiles now track their current layer and upgrade when passing through stairs
- Line of sight raycasts upgrade layer when passing through stairs
- Projectiles fired from transitions start at `startLayer + 1`
- Both systems respect layer-based blocking dynamically
- Blocking logic: `cellLayer > currentLayer` (strictly higher)
}

// Upgrade layer when passing through stairs
if (isTransition(cell) && cell.layer === this.currentLayer) {
  this.currentLayer++;
}
```

### Phase 5: Pathfinding ✅ COMPLETED
**Files modified:**
- [x] `src/systems/Pathfinder.ts`
  - Upgrade layer to `targetLayer + 1` when entering transition cells
  - Maintain layer tracking through PathNode
  - Block horizontal movement from transitions (vertical only)
  - Block diagonal movement across layer boundaries
- [x] Verified build: `npm run build` ✅
- [x] Verified lint: `npx eslint src --ext .ts` ✅ (pre-existing errors only)

**Changes made:**
- Pathfinder now upgrades entity layer when pathing through stairs
- Entities can path to higher layers via transitions
- Movement restrictions enforced (no horizontal from transitions, no diagonal across layers)
- Layer tracking maintained throughout path calculation

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

### Phase 7: Auto-Aim ✅ COMPLETED
**Files modified:**
- [x] `src/ecs/components/input/InputComponent.ts`
  - Skip enemies at higher layers (`enemyLayer > playerLayer`)
  - Upgrade layer through transitions in LOS raycast
  - Block LOS by walls at higher layers than current raycast layer
- [x] Verified build: `npm run build` ✅
- [x] Verified lint: `npx eslint src --ext .ts` ✅ (pre-existing errors only)

**Rules:**
- Target enemies at same layer (not blocked by higher walls)
- Target enemies at lower layers
- Don't target enemies at higher layers
- LOS upgrades through transitions (same as LineOfSightComponent)

**Changes made:**
- Auto-aim now respects layer system
- LOS raycast upgrades layer when passing through stairs
- Enemies at higher layers are never targeted

### Phase 8: Testing ⏸️ NOT STARTED
**Files to create:**
- [ ] `test/tests/player/test-multi-layer.js`
- [ ] `public/levels/test/multi-layer-test.json`

**Test Map Layout (20×15 cells):**
```
Layer 0 (ground):
  Rows 0-14, Cols 0-19 (all layer 0 except where specified)

Layer 1 (platforms/walls):
  Platform: Cols 10-14, Rows 5-9 (layer 1, 'platform')
  Wall: Cols 10-14, Row 4 (layer 1, 'wall')
  
Stairs:
  Col 9, Row 7 (layer 0, transition)
  
Player spawn: Col 5, Row 7
```

**Test Scenarios:**

**Test 1: Ground level shooting at layer 1 wall**
- Player position: (5, 7) - layer 0 ground
- Shoot direction: Right (toward wall at col 10, row 4)
- Expected: Bullet blocked by layer 1 wall

**Test 2: Ground level shooting at layer 1 platform**
- Player position: (5, 7) - layer 0 ground
- Shoot direction: Right (toward platform at col 10, row 7)
- Expected: Bullet blocked by layer 1 platform

**Test 3: Standing near platform edge (gun in layer 1)**
- Player position: (9, 7) - layer 0 ground, but close to platform
- Gun tip: In layer 1 cell (col 10)
- Shoot direction: Right (into platform)
- Expected: Bullet blocked (player not on stairs, uses player's layer 0)

**Test 4: Standing on stairs (gun in layer 1)**
- Player position: (9, 7) - layer 0 stairs
- Gun tip: In layer 1 cell (col 10)
- Shoot direction: Right (into platform)
- Expected: Bullet passes through layer 1 platform (upgraded to layer 1)

**Test 5: Standing on stairs shooting at wall**
- Player position: (9, 7) - layer 0 stairs
- Gun tip: In layer 1 cell
- Shoot direction: Up-right (toward wall at col 10, row 4)
- Expected: Bullet blocked by layer 1 wall (walls block at same layer after upgrade)

**Test 6: Shooting through stairs from ground**
- Player position: (7, 7) - layer 0 ground
- Shoot direction: Right (through stairs at col 9, into platform at col 10)
- Expected: Bullet upgrades when passing through stairs, then passes through layer 1 platform

**Test 7: Shooting through stairs at wall**
- Player position: (7, 7) - layer 0 ground
- Shoot direction: Up-right (through stairs, toward wall at col 10, row 4)
- Expected: Bullet upgrades through stairs, blocked by layer 1 wall

**Test 8: On platform shooting at same layer wall**
- Player position: (12, 7) - layer 1 platform
- Shoot direction: Up (toward wall at col 12, row 4)
- Expected: Bullet passes through layer 1 wall (same layer, no upgrade)

**Test 9: Player movement blocked by higher layer**
- Player position: (5, 7) - layer 0 ground
- Move direction: Right (toward platform at col 10)
- Expected: Player blocked at col 9 (cannot enter layer 1 without stairs)

**Test 10: Player uses stairs to reach platform**
- Player position: (5, 7) - layer 0 ground
- Move to: (9, 7) - stairs
- Then move to: (10, 7) - layer 1 platform
- Expected: Player successfully reaches platform, currentLayer = 1

**Test 11: Player hitbox straddling stairs and platform**
- Player position: (9, 7) - layer 0 stairs, but hitbox overlaps layer 1 platform
- Player center: On stairs (layer 0)
- Shoot direction: Right (into platform at col 10)
- Expected: Bullet passes through layer 1 platform (player center on stairs → upgrade)

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
