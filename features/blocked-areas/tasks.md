# Blocked Areas System — Task Breakdown

## Phase 1: Core Runtime (8.5 hours)

### Task 1.1: Add BlockedAreaDef Type to LevelLoader
**File**: `src/systems/level/LevelLoader.ts`

**Subtasks**:
- [x] Add `BlockedAreaDef` type (id, vertices, layer, blocksProjectiles)
- [x] Add `blockedAreas?: BlockedAreaDef[]` to `LevelData` type
- [x] Export `BlockedAreaDef`

**Dependencies**: None
**Estimated Time**: 10 minutes
**Actual Time**: 5min

---

### Task 1.2: Create PolygonUtils
**File**: `src/math/PolygonUtils.ts`

**Subtasks**:
- [x] `isConvex(vertices)` — cross-product check, reject collinear (hasNonZeroCross)
- [x] `computeNormals(vertices)` — outward edge normals `(dy, -dx)` normalized; return `null` on zero-length edge
- [x] `isPointInPolygon(px, py, vertices)` — cross-product winding test for CW convex polygon
- [x] `ensureClockwise(vertices)` — shoelace area; flip condition: reverse if `area < 0` (screen-space convention, matches `isConvex` winding)

**Critical fix from failure analysis**: `ensureClockwise` must use `if (area < 0)` not `if (area > 0)`. The shoelace formula in screen-space (Y-down) produces positive area for the winding that `isConvex` accepts. Reversing on positive would break ALL polygons.

**Dependencies**: None
**Estimated Time**: 45 minutes
**Actual Time**: 10min

---

### Task 1.3: Create SATCollision
**File**: `src/math/SATCollision.ts`

**Subtasks**:
- [x] Define `Vec2`, `AABB`, `ConvexPolygon` types
- [x] `testAABBvsPolygon(aabb, polygon)` — returns MTV `Vec2 | null`
  - [ ] Test 2 AABB axes (X, Y) with early-out
  - [ ] Test N polygon normal axes with early-out
  - [ ] Track minimum overlap axis for MTV
  - [ ] MTV direction: push AABB away from polygon center
- [x] `getOverlappingCells(vertices, normals, cellSizePx)` — compute polygon AABB, iterate cells, test each with `testAABBvsPolygon`

**Dependencies**: None
**Estimated Time**: 1 hour
**Actual Time**: 15min

---

### Task 1.4: Create BlockedAreaManager
**File**: `src/systems/BlockedAreaManager.ts`

**Subtasks**:
- [x] Constructor: validate each def (ensureClockwise → isConvex → computeNormals), skip invalid with console.error
- [x] Pre-compute `blockedCells: Set<string>` via `getOverlappingCells`
- [x] `getAll()`, `getForLayer(layer)`, `getBlockedCells()`
- [x] `isPointInside(x, y, layer)` — filters by layer + blocksProjectiles, uses `isPointInPolygon`

**Dependencies**: Tasks 1.2, 1.3
**Estimated Time**: 45 minutes
**Actual Time**: 10min

---

### Task 1.5: Create BlockedAreaCollisionComponent
**File**: `src/ecs/components/movement/BlockedAreaCollisionComponent.ts`

**Subtasks**:
- [x] Props: `{ blockedAreaManager: BlockedAreaManager }`
- [x] `update()`: build AABB from transform + GridPositionComponent.collisionBox (centered convention: `x + offsetX - width/2`)
- [x] Get layer from `GridPositionComponent.currentLayer`
- [x] For each polygon on layer: `testAABBvsPolygon` → apply MTV to transform, update AABB in-place
- [x] `hasWarned` flag for spawn-inside-polygon warning (fires once)

**Dependencies**: Tasks 1.3, 1.4
**Estimated Time**: 30 minutes
**Actual Time**: 10min

---

### Task 1.6: Integrate into PlayerEntity + GameScene
**Files**: `src/ecs/entities/player/PlayerEntity.ts`, `src/scenes/GameScene.ts`

**Subtasks**:
- [x] GameScene.initializeScene(): create `BlockedAreaManager` after grid init, store as public readonly field
- [x] Pass `blockedAreaManager` to `createPlayerEntity()` props
- [x] PlayerEntity: add `BlockedAreaCollisionComponent` after `GridCollisionComponent` in update order
- [x] Grid: add `setBlockedAreaManager()` setter, store reference for debug rendering

**Dependencies**: Tasks 1.4, 1.5
**Estimated Time**: 30 minutes
**Actual Time**: 15min

---

### Task 1.7: Projectile Integration
**File**: `src/ecs/components/combat/ProjectileComponent.ts`

**Subtasks**:
- [x] Add optional `blockedAreaManager?: BlockedAreaManager` to `ProjectileProps`
- [x] In `update()`, after position update and before wall collision: call `blockedAreaManager.isPointInside(x, y, currentLayer)`
- [x] If inside: call `onWallHit`, destroy entity, return
- [x] Update projectile factories (BulletEntity, FireballEntity, BoneProjectileEntity, BulletDudeBulletEntity, GrenadeEntity) to pass `scene.blockedAreaManager`

**Dependencies**: Task 1.4
**Estimated Time**: 45 minutes
**Actual Time**: 20min

---

### Task 1.8: Pathfinder Integration
**File**: `src/systems/Pathfinder.ts`

**Subtasks**:
- [x] Add optional `blockedAreaCells?: ReadonlySet<string>` constructor parameter
- [x] In `getValidNeighbor()`, add check at top: if `blockedAreaCells?.has(\`${newCol},${newRow}\`)` → return null
- [x] Update all Pathfinder call sites to pass `scene.blockedAreaManager?.getBlockedCells()`:
  - [ ] PetFollowComponent
  - [ ] BugChaseState
  - [ ] PumaChasingState
  - [ ] EnemyFearState
  - [ ] InteractionComponent
  - [ ] Any other Pathfinder instantiations

**Dependencies**: Task 1.4
**Estimated Time**: 45 minutes
**Actual Time**: 15min

---

### Task 1.9: Debug Visualization
**File**: `src/systems/grid/Grid.ts`

**Subtasks**:
- [x] Add `blockedAreaManager?: BlockedAreaManager` field + `setBlockedAreaManager()` setter
- [x] In `render()`, when `gridDebugEnabled` and manager exists: draw each polygon
  - [ ] Filled interior: `fillStyle(color, 0.15)`, color by layer (0=red, 1=blue, else=green)
  - [ ] Outline: `lineStyle(2, color, 0.8)`, stroke polygon path

**Dependencies**: Task 1.6
**Estimated Time**: 30 minutes
**Actual Time**: 0min

---

### Task 1.10: Build + Lint + Manual Test
**Subtasks**:
- [x] `npm run build` — zero errors
- [x] `npx eslint src --ext .ts` — zero errors
- [x] Add test blocked area to a level JSON manually
- [x] Verify player collision (slides along edges)
- [x] Verify projectile collision (stops at polygon)
- [x] Verify pathfinding (enemies route around)
- [x] Verify debug viz (G key shows polygons)
- [x] Verify levels without blockedAreas still load

**Dependencies**: All Phase 1 tasks
**Estimated Time**: 1 hour
**Actual Time**: 10min

---

## Phase 2: Editor (6.5 hours)

### Task 2.1: Add Blocked Area Tool Button
**File**: `editor/panels/Toolbar.ts`

**Subtasks**:
- [ ] Add `{ id: 'blockedarea', label: 'Blocked Area' }` to tool buttons array

**Dependencies**: None
**Estimated Time**: 5 minutes

---

### Task 2.2: Editor Drawing Tool — State Machine
**File**: `editor/CanvasInteraction.ts`

**Subtasks**:
- [ ] Add drawing state: `blockedAreaVertices: Array<{x,y}>`, `blockedAreaAutoLayer: number`
- [ ] In `onPointerDown` for `blockedarea` tool:
  - [ ] If no vertices yet: start drawing, detect layer from first vertex's cell
  - [ ] If vertices exist and click within 16px of first vertex AND ≥3 vertices: close polygon
  - [ ] Otherwise: add vertex
- [ ] On close: validate convexity via `isConvex()`, if invalid → toast error + discard, if valid → `bridge.addBlockedArea()`
- [ ] Right-click handler: remove last vertex, if empty → return to idle
- [ ] Escape handler: discard all vertices
- [ ] Import `isConvex` and `ensureClockwise` from PolygonUtils (shared between game and editor)

**Dependencies**: Task 1.2
**Estimated Time**: 1.5 hours

---

### Task 2.3: Editor Drawing Tool — Visual Feedback
**File**: `editor/CanvasInteraction.ts` (extend)

**Subtasks**:
- [ ] In `renderOverlays()` (or equivalent render hook): draw placed vertices as dots, lines between them, preview line to cursor
- [ ] Use Phaser Graphics for drawing

**Dependencies**: Task 2.2
**Estimated Time**: 30 minutes

---

### Task 2.4: Editor Selection + Deletion
**File**: `editor/CanvasInteraction.ts` (extend)

**Subtasks**:
- [ ] When `blockedarea` tool active and not drawing: click does hit-test via `isPointInPolygon` on all `levelData.blockedAreas`
- [ ] Cycle through overlapping areas on repeated clicks (same pattern as entity selection)
- [ ] Store `selectedBlockedAreaId` on bridge
- [ ] Delete key → `bridge.removeBlockedArea(selectedId)`
- [ ] Selection visual: brighter outline on selected polygon

**Dependencies**: Tasks 2.2, 2.5
**Estimated Time**: 45 minutes

---

### Task 2.5: EditorBridge Mutation Methods
**File**: `editor/EditorBridge.ts`

**Subtasks**:
- [ ] `addBlockedArea(vertices, layer)` — monotonic ID via `max(existing IDs) + 1`, push to `levelData.blockedAreas`, route through `_applyMutation`
- [ ] `removeBlockedArea(id)` — filter out by id, route through `_applyMutation`
- [ ] `updateBlockedArea(id, data)` — update layer/blocksProjectiles, route through `_applyMutation`
- [ ] Add `selectedBlockedAreaId: string | null` state field
- [ ] Add `onBlockedAreaSelected` callback
- [ ] Wall proximity warning: `warnIfNearWalls()` after addBlockedArea succeeds (advisory console.warn)

**Dependencies**: None
**Estimated Time**: 1 hour

---

### Task 2.6: Editor Blocked Area Rendering
**File**: `editor/CanvasInteraction.ts` (extend renderOverlays)

**Subtasks**:
- [ ] Always render all `levelData.blockedAreas` as filled + outlined polygons (color by layer)
- [ ] Selected area: thicker outline, brighter color

**Dependencies**: Task 2.5
**Estimated Time**: 30 minutes

---

### Task 2.7: Context Panel — Blocked Area Properties
**File**: `editor/panels/ContextPanel.ts`

**Subtasks**:
- [ ] When blocked area selected: show ID (read-only), layer (number input), blocksProjectiles (checkbox), delete button
- [ ] Layer change → `bridge.updateBlockedArea(id, { layer })`
- [ ] Checkbox change → `bridge.updateBlockedArea(id, { blocksProjectiles })`
- [ ] Delete → `bridge.removeBlockedArea(id)`

**Dependencies**: Task 2.5
**Estimated Time**: 30 minutes

---

### Task 2.8: Serialization Round-Trip
**File**: `editor/EditorBridge.ts` (extend `getCurrentLevelData`)

**Subtasks**:
- [ ] In `getCurrentLevelData()`: include `blockedAreas: existingLevelData.blockedAreas` in returned object

**Dependencies**: Task 2.5
**Estimated Time**: 10 minutes

---

### Task 2.9: Build + Lint + Manual Test (Editor)
**Subtasks**:
- [ ] `npm run build` — zero errors
- [ ] `npx eslint src editor --ext .ts` — zero errors
- [ ] Draw a polygon in editor → verify convexity validation
- [ ] Draw non-convex polygon → verify error toast + discard
- [ ] Select polygon → verify context panel shows properties
- [ ] Edit layer/blocksProjectiles → verify changes persist
- [ ] Delete polygon → verify removal
- [ ] Save level → reload → verify blocked areas preserved
- [ ] Right-click undo during drawing
- [ ] Escape cancels drawing
- [ ] Verify levels without blockedAreas still load in editor

**Dependencies**: All Phase 2 tasks
**Estimated Time**: 1 hour

---

## Total Estimated Time

| Phase | Time |
|-------|------|
| Phase 1: Core Runtime | 8.5 hours |
| Phase 2: Editor | 6.5 hours |
| **Total** | **15 hours** |

## Critical Path

```
Phase 1:
  Task 1.1 (types) ─┐
  Task 1.2 (PolygonUtils) ─┤
  Task 1.3 (SATCollision) ─┤→ Task 1.4 (Manager) → Task 1.5 (Component) → Task 1.6 (Integration)
                            │                    ↘ Task 1.7 (Projectile)
                            │                    ↘ Task 1.8 (Pathfinder)
                            │                    ↘ Task 1.9 (Debug viz)
                            └→ Task 1.10 (Test)

Phase 2:
  Task 2.1 (Button) ─┐
  Task 2.5 (Bridge) ──┤→ Task 2.2 (Drawing) → Task 2.3 (Visual) → Task 2.4 (Selection)
                      ├→ Task 2.6 (Rendering)
                      ├→ Task 2.7 (Context panel)
                      ├→ Task 2.8 (Serialization)
                      └→ Task 2.9 (Test)
```

Tasks 1.1, 1.2, 1.3 can be done in parallel. Tasks 1.7, 1.8, 1.9 can be done in parallel after 1.4.

## Risk Areas

1. **ensureClockwise sign convention** — CRITICAL fix from failure analysis. Must use `if (area < 0)` to match `isConvex` winding expectation. Wrong sign rejects ALL polygons.
2. **AABB centered convention** — Must match GridCollisionComponent: `x + offsetX - width/2`. Mismatch causes collision box drift.
3. **Pathfinder call sites** — Multiple files create `new Pathfinder(grid)`. All must be updated to pass `blockedAreaCells`. Missing one means enemies ignore blocked areas in that state.
4. **Editor PolygonUtils import** — Editor code imports from `src/math/`. Verify Vite resolves this correctly for the editor entry point.
5. **Polygon-wall squeeze** — Advisory warning only. Level designers must keep polygons ≥40px from walls to avoid player oscillation between two collision systems.
