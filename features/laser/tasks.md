# Laser Enemy — Task Breakdown

## IMPORTANT: Damage Model Change

**The player damage model has changed from the original design docs.** The requirements.md and design.md still reference "50 HP + knockback per frame." The actual implementation should use **INSTANT KILL on contact**. No cooldown, no knockback, no hit flash. Player touches beam → player dies. This dramatically simplifies `checkPlayerCollision()`.

Enemy damage is unchanged: instant kill on contact.

---

## Phase 1: Entity Type Registration (1.5 hours)

### Task 1.1: Register `laser_base` Asset
**File**: `src/assets/AssetRegistry.ts`

**Subtasks**:
- [ ] Add `laser_base` entry to `ASSET_REGISTRY`:
  ```
  laser_base: { key: 'laser_base', path: 'assets/generic/laser_base.png', type: 'image' as const }
  ```
- [ ] Add `'laser'` asset group to `ASSET_GROUPS`:
  ```
  laser: ['laser_base'] as const,
  ```

**Dependencies**: None
**Estimated Time**: 5 minutes

---

### Task 1.2: Add `laser` to Asset Loading
**File**: `src/assets/AssetLoader.ts`

**Subtasks**:
- [ ] In `getRequiredAssetGroups()`, add laser entity type check:
  ```typescript
  if (entityTypes.has('laser')) {
    groups.push('laser');
  }
  ```

**Dependencies**: Task 1.1
**Estimated Time**: 5 minutes

---

### Task 1.3: Add `laser` to EntityType Union
**File**: `src/systems/level/LevelLoader.ts`

**Subtasks**:
- [ ] Add `| 'laser'` to the `EntityType` union type

**Dependencies**: None
**Estimated Time**: 2 minutes

---

### Task 1.4: Create LaserEntity Factory
**File**: `src/ecs/entities/laser/LaserEntity.ts` (new)

**Subtasks**:
- [ ] Define `CreateLaserProps` type: `{ scene, col, row, grid, entityId, angle, flagName, blockedAreaManager?, entityManager }`
- [ ] Implement `createLaserEntity(props)`:
  - [ ] `new Entity(props.entityId)` with `entity.tags.add('laser')`
  - [ ] Calculate world position from `grid.cellToWorld(col, row)` + half cell offset
  - [ ] Scale `laser_base` texture to cell size (same pattern as BreakableEntity)
  - [ ] Add `TransformComponent(x, y, 0, scale)`
  - [ ] Add `SpriteComponent` at `Depth.breakable`, rotated by `angle * Math.PI / 180`
  - [ ] Add `GridPositionComponent(col, row, { offsetX: 0, offsetY: 0, width: cellSize, height: cellSize })`
  - [ ] Add `GridCollisionComponent(grid)`
  - [ ] Add `GridCellBlocker()`
  - [ ] Add `CollisionComponent` — absorbs `player_projectile` and `enemy_projectile`, destroys projectile via `delayedCall(0, ...)`
  - [ ] Determine layer from `grid.getCell(col, row)` → `grid.getLayer(cell)`
  - [ ] Add `LaserBeamComponent({ scene, grid, angle, flagName, layer, blockedAreaManager, entityManager })`
  - [ ] Set update order: `[Transform, Sprite, GridPosition, GridCollision, GridCellBlocker, Collision, LaserBeamComponent]`
- [ ] Validate angle: `const angle = Number.isFinite(rawAngle) ? rawAngle : 0;`

**Dependencies**: Tasks 1.1, 1.3, 2.1 (LaserBeamComponent)
**Estimated Time**: 30 minutes

---

### Task 1.5: Add `laser` Case to EntityLoader
**File**: `src/systems/EntityLoader.ts`

**Subtasks**:
- [ ] Add `case 'laser':` in `createEntityCreator()` switch:
  ```typescript
  case 'laser':
    return () => {
      const laserData = data as { col: number; row: number; angle: number; flagName?: string };
      return createLaserEntity({
        scene: this.scene,
        col: laserData.col,
        row: laserData.row,
        grid: this.grid,
        entityId: entityDef.id,
        angle: laserData.angle ?? 0,
        flagName: laserData.flagName ?? `${entityDef.id}_laser_on`,
        blockedAreaManager: this.scene.blockedAreaManager,
        entityManager: this.scene.entityManager,
      });
    };
  ```
- [ ] Import `createLaserEntity` from `../ecs/entities/laser/LaserEntity`

**Dependencies**: Task 1.4
**Estimated Time**: 10 minutes

---

### Task 1.6: Verify Entity Registration
**Test**: Manual

**Subtasks**:
- [ ] Create a test level JSON with a laser entity: `{ "id": "laser0", "type": "laser", "data": { "col": 5, "row": 5, "angle": 90 } }`
- [ ] Load level — laser base sprite visible, rotated, blocks movement
- [ ] Verify projectiles are absorbed by the laser base
- [ ] Verify no errors in console
- [ ] Build and lint pass

**Dependencies**: Tasks 1.1–1.5
**Estimated Time**: 15 minutes

---

## Phase 2: LaserBeamComponent (3 hours)

### Task 2.1: Create LaserBeamComponent — Skeleton + Raycast
**File**: `src/ecs/components/laser/LaserBeamComponent.ts` (new)

**Subtasks**:
- [ ] Define `LaserBeamProps` type: `{ scene, grid, angle, flagName, layer, blockedAreaManager?, entityManager }`
- [ ] Define constants: `BEAM_OUTER_WIDTH = 8`, `BEAM_INNER_WIDTH = 3`, `BEAM_COLLISION_HALF_WIDTH = 4`, `RAYCAST_STEP_PX = 4`, `PULSE_PERIOD_MS = 500`
- [ ] Constructor:
  - [ ] Pre-compute direction unit vector: `dirX = Math.cos(angle * PI/180)`, `dirY = Math.sin(angle * PI/180)`
  - [ ] Create `Phaser.GameObjects.Graphics` at `Depth.particle`
  - [ ] Create impact particle emitter (see Task 2.4)
- [ ] Implement `raycast(startX, startY)`:
  - [ ] Step in `RAYCAST_STEP_PX` increments along direction
  - [ ] Max distance = grid diagonal
  - [ ] Skip re-checking same cell (track prevCol/prevRow)
  - [ ] Terminate on: grid boundary, wall, platform, blocked area cell, GridCellBlocker occupant (skip self, same layer only)
  - [ ] Return `{ x, y }` endpoint
- [ ] Implement `update(delta)` skeleton:
  - [ ] Accumulate `pulseTimeMs += delta`
  - [ ] Poll world state flag → set `isOn`
  - [ ] If OFF: hide graphics, stop emitter, return
  - [ ] Read transform position → raycast → store endpoint
  - [ ] Call `renderBeam()`, position emitter, call collision checks

**Dependencies**: None
**Estimated Time**: 1 hour

---

### Task 2.2: Beam Rendering
**File**: `src/ecs/components/laser/LaserBeamComponent.ts` (extend)

**Subtasks**:
- [ ] Implement `renderBeam(startX, startY, endX, endY)`:
  - [ ] `graphics.clear()` + `graphics.setVisible(true)`
  - [ ] Layer 1: outer glow — `lineStyle(8, 0xff0000, 0.4)` + `lineBetween`
  - [ ] Layer 2: inner core — `lineStyle(3, 0xffffcc, 1.0)` + `lineBetween`
  - [ ] Layer 3: pulsing overlay — width oscillates 3–5px, alpha oscillates 0.15–0.35, color `0xff4400`

**Dependencies**: Task 2.1
**Estimated Time**: 15 minutes

---

### Task 2.3: Collision Detection — Player Instant Kill + Enemy Kill
**File**: `src/ecs/components/laser/LaserBeamComponent.ts` (extend)

**Subtasks**:
- [ ] Implement `pointToSegmentDist(px, py, ax, ay, bx, by)` — point-to-line-segment distance
- [ ] Implement `checkPlayerCollision(startX, startY, endX, endY)`:
  - [ ] Get player via `entityManager.getFirst('player')`
  - [ ] Guard: `!player || player.isDestroyed` → return
  - [ ] Check layer match: `gridPos.currentLayer !== this.layer` → return
  - [ ] Build AABB center from `transform + collisionBox offset`
  - [ ] Distance check: `dist < BEAM_COLLISION_HALF_WIDTH + box.width / 2`
  - [ ] **INSTANT KILL**: `health.takeDamage(9999)` (or a value guaranteed to exceed max HP)
  - [ ] No knockback, no hit flash — player dies immediately
- [ ] Implement `checkEnemyCollision(startX, startY, endX, endY)`:
  - [ ] Iterate `entityManager.getAll()` (returns copy — safe to destroy during iteration)
  - [ ] Skip: `isDestroyed`, no `'enemy'` tag, has `'laser'` tag
  - [ ] Distance check: `dist < BEAM_COLLISION_HALF_WIDTH`
  - [ ] Kill: `entity.destroy()`

**Dependencies**: Task 2.1
**Estimated Time**: 45 minutes

---

### Task 2.4: Impact Particles
**File**: `src/ecs/components/laser/LaserBeamComponent.ts` (extend)

**Subtasks**:
- [ ] Implement `createImpactEmitter()`:
  - [ ] Generate `__laser_spark` texture if not exists (4×4px white circle)
  - [ ] Create `scene.add.particles(0, 0, '__laser_spark', config)` at `Depth.particle`
  - [ ] Config: speed 20–60, angle 0–360, scale 1→0, lifespan 100–300ms, frequency 40ms, tint `[0xffff00, 0xff6600]`, blendMode ADD
- [ ] In `update()`: `emitter.setPosition(beamEndX, beamEndY)`, start/stop based on `isOn`

**Dependencies**: Task 2.1
**Estimated Time**: 20 minutes

---

### Task 2.5: Resource Cleanup
**File**: `src/ecs/components/laser/LaserBeamComponent.ts` (extend)

**Subtasks**:
- [ ] Implement `onDestroy()`:
  - [ ] `this.graphics.destroy()`
  - [ ] `this.emitter.destroy()`

**Dependencies**: Task 2.1
**Estimated Time**: 5 minutes

---

### Task 2.6: World State Toggle
**File**: `src/ecs/components/laser/LaserBeamComponent.ts` (already in Task 2.1 skeleton)

**Subtasks**:
- [ ] Verify flag polling: `WorldStateManager.getInstance().getState().flags[this.flagName]`
- [ ] `isOn = flagValue !== 'false'` (ON if `'true'`, undefined, or any other value)
- [ ] When OFF: `graphics.setVisible(false)`, `emitter.stop()`, skip collision
- [ ] When ON: render beam, start emitter, run collision

**Dependencies**: Task 2.1
**Estimated Time**: 5 minutes (verification only — logic is in Task 2.1 skeleton)

---

### Task 2.7: Integration Test — Full Beam Behavior
**Test**: Manual

**Subtasks**:
- [ ] Place laser in test level pointing at a wall — beam terminates at wall
- [ ] Place pushable in beam path — beam terminates at pushable
- [ ] Move pushable out of beam — beam extends through
- [ ] Walk player into beam — **player dies instantly**
- [ ] Place enemy in beam path — enemy dies
- [ ] Toggle flag via lever — beam appears/disappears
- [ ] Verify particles at beam endpoint
- [ ] Verify beam renders at diagonal angles (e.g., 45°, 135°)
- [ ] Build and lint pass

**Dependencies**: All Phase 2 tasks
**Estimated Time**: 30 minutes

---

## Phase 3: Editor Integration (1.5 hours)

### Task 3.1: Add `laser` to Editor Entity List
**Files**:
- `editor/panels/Toolbar.ts`
- `editor/CanvasInteraction.ts`

**Subtasks**:
- [ ] Add `'laser'` to `ENTITY_TYPES` array in `Toolbar.ts`
- [ ] Add `laser: 'LA'` to `labelMap` in `CanvasInteraction.ts`

**Dependencies**: None
**Estimated Time**: 5 minutes

---

### Task 3.2: Add Laser Defaults to EditorBridge
**File**: `editor/EditorBridge.ts`

**Subtasks**:
- [ ] Add laser defaults in `addEntity()` defaults map:
  ```typescript
  laser: { col, row, angle: 0, flagName: `${newId}_laser_on` },
  ```

**Dependencies**: None
**Estimated Time**: 5 minutes

---

### Task 3.3: Add Laser Extraction to `extractEntities()`
**File**: `editor/EditorBridge.ts`

**Subtasks**:
- [ ] Add `else if (entity.id.startsWith('laser'))` block in `extractEntities()`:
  ```typescript
  } else if (entity.id.startsWith('laser')) {
    type = 'laser';
    const existing = existingLevelData.entities?.find(e => e.id === entity.id);
    const existingData = existing?.data as { angle?: number; flagName?: string } | undefined;
    data = {
      col: cell.col, row: cell.row,
      angle: existingData?.angle ?? 0,
      flagName: existingData?.flagName ?? `${entity.id}_laser_on`,
    };
  }
  ```

**Dependencies**: None
**Estimated Time**: 10 minutes

---

### Task 3.4: Add Laser-Specific Fields to Context Panel
**File**: `editor/panels/ContextPanel.ts`

**Subtasks**:
- [ ] Add `if (entityDef.type === 'laser')` block in entity form rendering (follow lever pattern):
  - [ ] Angle: `<input type="number" id="ef-laser-angle" min="0" max="359" />`
  - [ ] Flag Name: `<input id="ef-laser-flag" />`
- [ ] Wire `change` event listeners:
  - [ ] Angle → `bridge.updateEntityData(entityId, { angle: Number(value) })`
  - [ ] Flag Name → `bridge.updateEntityData(entityId, { flagName: value })`

**Dependencies**: None
**Estimated Time**: 20 minutes

---

### Task 3.5: Add Beam Preview in Editor
**File**: `editor/CanvasInteraction.ts`

**Subtasks**:
- [ ] In the overlay rendering section (where trigger cells are highlighted), add laser preview:
  - [ ] Check if selected entity is a laser (`entityDef.type === 'laser'`)
  - [ ] Read `angle` from entity data
  - [ ] Compute start position (cell center)
  - [ ] Simplified raycast: step in `cellSize/2` increments, check grid boundary + wall + platform only (no occupant check in editor)
  - [ ] Draw semi-transparent red line: `overlayGraphics.lineStyle(2, 0xff0000, 0.5)` + `lineBetween`
- [ ] Preview updates when angle is changed in the context panel

**Dependencies**: Task 3.4
**Estimated Time**: 30 minutes

---

### Task 3.6: Editor Integration Test
**Test**: Manual

**Subtasks**:
- [ ] Select laser from entity palette → click canvas → laser placed
- [ ] Verify laser label "LA" shows on canvas
- [ ] Select laser → context panel shows angle and flagName inputs
- [ ] Change angle → beam preview line updates direction
- [ ] Change flagName → value persists
- [ ] Save (Ctrl+S) → reload → laser data preserved (round-trip)
- [ ] Place multiple lasers → unique IDs (laser0, laser1, laser2)
- [ ] Delete laser → entity removed
- [ ] Build and lint pass

**Dependencies**: Tasks 3.1–3.5
**Estimated Time**: 20 minutes

---

## Total Estimated Time

| Phase | Time |
|-------|------|
| Phase 1: Entity Type Registration | 1.5 hours |
| Phase 2: LaserBeamComponent | 3 hours |
| Phase 3: Editor Integration | 1.5 hours |
| **Total** | **6 hours** |

## Critical Path

```
Phase 1:
  Task 1.1 (Asset) → Task 1.2 (AssetLoader)
  Task 1.3 (EntityType) ─┐
  Task 2.1 (Component) ──┼→ Task 1.4 (Factory) → Task 1.5 (EntityLoader) → Task 1.6 (Verify)
                          │
Phase 2:                  │
  Task 2.1 (Skeleton) ────┘
    ├→ Task 2.2 (Rendering)
    ├→ Task 2.3 (Collision — instant kill)
    ├→ Task 2.4 (Particles)
    ├→ Task 2.5 (Cleanup)
    └→ Task 2.6 (Toggle)
  All → Task 2.7 (Integration test)

Phase 3 (can start in parallel with Phase 2):
  Tasks 3.1–3.4 (independent) → Task 3.5 (Preview) → Task 3.6 (Test)
```

## Checklist (from entity-creation-system.md)

- [ ] Added `'laser'` to `EntityType` in `LevelLoader.ts`
- [ ] Added to `ENTITY_TYPES` array in `editor/panels/Toolbar.ts`
- [ ] Added default data in `EditorBridge.addEntity()`
- [ ] Added label `'LA'` in `CanvasInteraction` labelMap
- [ ] **Added extraction logic in `EditorBridge.extractEntities()`** ← Most commonly forgotten!
- [ ] **Entity factory accepts `entityId` parameter**
- [ ] **Entity factory uses `entityId` in `new Entity(entityId)`**
- [ ] **EntityLoader passes `entityDef.id` as `entityId`**
- [ ] Added `laser` asset group in `AssetRegistry`
- [ ] Added to `getRequiredAssetGroups()` in `AssetLoader`
- [ ] Added laser-specific fields in `ContextPanel` (angle, flagName)
- [ ] Tested placing entity in editor
- [ ] Tested Save → JSON includes laser entity
- [ ] Tested loading level with laser from JSON
- [ ] Tested placing multiple lasers (unique IDs: laser0, laser1, laser2)
- [ ] Tested moving laser in editor and saving (position persists)
- [ ] Build and lint pass with zero errors
