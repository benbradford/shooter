# Pushable Objects — Task Breakdown

## Phase 1: Entity Type & Asset Registration (1.5 hours)

### Task 1.1: Add Pushable to EntityType + EntityLoader
**Files**: `src/systems/level/LevelLoader.ts`, `src/systems/EntityLoader.ts`

**Subtasks**:
- [ ] Add `'pushable'` to `EntityType` union in LevelLoader.ts
- [ ] Add `case 'pushable'` in EntityLoader.createEntityCreator()
- [ ] Read `movedEntities` from levelState to determine spawn position
- [ ] Pass `originalCol`/`originalRow` (JSON position) separately from actual spawn col/row

**Dependencies**: None
**Estimated Time**: 20 minutes

---

### Task 1.2: Create PushableComponent
**File**: `src/ecs/components/pushable/PushableComponent.ts`

**Subtasks**:
- [ ] Define `PushableProps` type: `pushEnabled`, `doesPersist`, `spawnCol`, `spawnRow`, `layer`
- [ ] Implement `startMove(targetCol, targetRow, grid)`:
  - [ ] Disable `GridCollisionComponent` at move start (sole occupant ownership)
  - [ ] `grid.removeOccupant()` from source, `grid.addOccupant()` to target
  - [ ] Re-enable `GridCollisionComponent` when `moveProgress >= 1`
- [ ] Implement `update(delta)` — linear interpolation of transform position
- [ ] Implement `getIsMoving()`, `getCurrentCol()`, `getCurrentRow()`

**Dependencies**: None
**Estimated Time**: 30 minutes

---

### Task 1.3: Create PushableEntity Factory
**File**: `src/ecs/entities/pushable/PushableEntity.ts`

**Subtasks**:
- [ ] Define `CreatePushableProps` with `originalCol`/`originalRow` fields
- [ ] Create entity with: Transform, Sprite (scaled to cell), Shadow, GridPosition (full cell), GridCollision, GridCellBlocker, PushableComponent, CollisionComponent
- [ ] CollisionComponent: `collidesWith: ['player_projectile', 'enemy_projectile']`, onHit destroys projectile
- [ ] Pass `originalCol`/`originalRow` to PushableComponent as `spawnCol`/`spawnRow`
- [ ] Set update order

**Dependencies**: Task 1.2
**Estimated Time**: 30 minutes

---

### Task 1.4: Register push_icon Asset
**File**: `src/assets/AssetRegistry.ts`

**Subtasks**:
- [ ] Add `push_icon` to player/core asset group

**Dependencies**: None
**Estimated Time**: 5 minutes

---

### Task 1.5: Build + Lint Check
- [ ] `npm run build` passes
- [ ] `npx eslint src --ext .ts` passes
- [ ] Place a pushable in a test level JSON, verify it renders and blocks movement

**Dependencies**: Tasks 1.1–1.4
**Estimated Time**: 15 minutes

---

## Phase 2: PlayerPushState (3 hours)

### Task 2.1: Add Lean Animations to PlayerEntity
**File**: `src/ecs/entities/player/PlayerEntity.ts`

**Subtasks**:
- [ ] Add `push_lean_${Direction}` for 4 cardinal directions (first 3 frames of push anim, `'repeat'`, 0.15s)
- [ ] Register `'push'` state in player StateMachine

**Dependencies**: Phase 1
**Estimated Time**: 15 minutes

---

### Task 2.2: Create PlayerPushState
**File**: `src/ecs/entities/player/PlayerPushState.ts`

**Subtasks**:
- [ ] `onEnter(data)`: store pushable/direction, snap player to adjacent cell, play lean anim, disable walk, set icon override
- [ ] `onUpdate(delta)` — contact phase: check joystick (disengage), check attack button (tryPush), check health (damage)
- [ ] `tryPush()`: call `isPushBlocked()`, if valid call `pushable.startMove()`, set phase='pushing', calculate player follow target, update persistence
- [ ] `onUpdate(delta)` — pushing phase: interpolate player position, check move complete, chain push or return to contact
- [ ] `disengage()`: if pushing set damagePending, else enter 'idle'
- [ ] `onExit()`: **defensive cleanup** — re-enable WalkComponent, clear icon override, reset damagePending

**Dependencies**: Tasks 1.2, 1.3, 2.1
**Estimated Time**: 1.5 hours

---

### Task 2.3: Implement isPushBlocked()
**File**: `src/ecs/entities/player/PlayerPushState.ts` (or separate util)

**Subtasks**:
- [ ] Check: out of bounds, wall, platform, water, transition, layer mismatch, blocked area, GridCellBlocker occupants

**Dependencies**: None
**Estimated Time**: 20 minutes

---

### Task 2.4: Add Contact Detection to PlayerWalkState
**File**: `src/ecs/entities/player/PlayerWalkState.ts`

**Subtasks**:
- [ ] Implement `getCardinalPushDirection(dx, dy)` — returns Direction or null
- [ ] In `onUpdate()`: after grid collision, if cardinal input, check target cell for pushable occupant with `pushEnabled`
- [ ] If found → `sm.stateMachine.enter('push', { pushableEntity, direction })`

**Dependencies**: Task 2.2
**Estimated Time**: 20 minutes

---

### Task 2.5: Add Icon Override to AttackButtonComponent
**File**: `src/ecs/components/input/AttackButtonComponent.ts`

**Subtasks**:
- [ ] Add `iconOverride` field and `setIconOverride(icon)` method
- [ ] In `updateIcon()`: if override is 'push', set texture to 'push_icon' and return early

**Dependencies**: Task 1.4
**Estimated Time**: 15 minutes

---

### Task 2.6: Build + Manual Test
- [ ] Walk into pushable from cardinal direction → lean animation, push icon
- [ ] Press attack → pushable moves one cell, player follows
- [ ] Hold attack → continuous push
- [ ] Joystick while leaning → disengage
- [ ] Push into wall → strain animation, no movement
- [ ] Take damage during push → move completes, then disengage
- [ ] Die during push → clean exit via onExit()

**Dependencies**: Tasks 2.1–2.5
**Estimated Time**: 30 minutes

---

## Phase 3: Persistence (45 minutes)

### Task 3.1: Add movedEntities to WorldState
**Files**: `src/systems/WorldState.ts`, `src/systems/WorldStateManager.ts`

**Subtasks**:
- [ ] Add `movedEntities: Array<{ id: string; col: number; row: number }>` to `LevelState` type
- [ ] In `getLevelState()`: add `movedEntities ??= []` fallback
- [ ] Add `updateMovedEntity(levelName, entityId, col, row)` method

**Dependencies**: None
**Estimated Time**: 15 minutes

---

### Task 3.2: Wire Persistence into PlayerPushState
**File**: `src/ecs/entities/player/PlayerPushState.ts`

**Subtasks**:
- [ ] After move completes, if `doesPersist`: call `worldStateManager.updateMovedEntity()`

**Dependencies**: Tasks 2.2, 3.1
**Estimated Time**: 10 minutes

---

### Task 3.3: Test Persistence
- [ ] Push persistent pushable, leave level, return → spawns at pushed position
- [ ] Push non-persistent pushable, leave level, return → resets to JSON position
- [ ] Load old save without `movedEntities` → no errors

**Dependencies**: Tasks 3.1, 3.2
**Estimated Time**: 20 minutes

---

## Phase 4: Editor Integration (1 hour)

### Task 4.1: Add Pushable to Editor
**Files**: `editor/EditorBridge.ts`, `editor/panels/EntityPalette.ts`, `editor/panels/EntityForm.ts`

**Subtasks**:
- [ ] Add `pushable` defaults in EditorBridge.addEntity(): `{ col, row, texture: 'dungeon_vase', pushEnabled: true, doesPersist: false }`
- [ ] Add `'pushable'` to EntityPalette list
- [ ] Add pushable-specific fields in EntityForm: texture picker, pushEnabled checkbox, doesPersist checkbox

**Dependencies**: Phase 1
**Estimated Time**: 45 minutes

---

### Task 4.2: Test Editor Round-Trip
- [ ] Place pushable in editor → save → reload → pushable present with correct properties
- [ ] Edit texture, pushEnabled, doesPersist → save → verify JSON

**Dependencies**: Task 4.1
**Estimated Time**: 15 minutes

---

## Phase 5: Final Testing (1 hour)

### Task 5.1: Comprehensive Testing
- [ ] All blocker types prevent push (wall, water, platform, stairs, blocked area, another pushable, out of bounds, different layer)
- [ ] Projectiles blocked by pushable (player and enemy)
- [ ] Enemy pathfinding routes around pushable
- [ ] Pushable blocks player movement when pushEnabled=false
- [ ] Continuous push chains correctly
- [ ] Death during push → clean cleanup via onExit()
- [ ] Level transition during push → safe
- [ ] Persistence round-trip (push → leave → return)
- [ ] Death rollback (push → die → respawn at level entry state)
- [ ] Editor placement, editing, serialization
- [ ] Build and lint pass with zero errors

**Dependencies**: All previous phases
**Estimated Time**: 1 hour

---

## Total Estimated Time

| Phase | Time |
|-------|------|
| Phase 1: Entity Type & Asset | 1.5 hours |
| Phase 2: PlayerPushState | 3 hours |
| Phase 3: Persistence | 45 minutes |
| Phase 4: Editor Integration | 1 hour |
| Phase 5: Final Testing | 1 hour |
| **Total** | **~7.25 hours** |

## Critical Path

```
Phase 1 (Entity + Asset)
  ├─ Task 1.2 (PushableComponent) ──→ Task 1.3 (Factory) ──→ Phase 2
  └─ Task 1.4 (Asset) ──→ Task 2.5 (Icon Override)

Phase 2 (PlayerPushState)
  ├─ Task 2.1 (Animations) ──→ Task 2.2 (State) ──→ Task 2.4 (Detection)
  └─ Task 2.3 (Validation) ──→ Task 2.2 (State)

Phase 3 (Persistence) requires Phase 2
Phase 4 (Editor) requires Phase 1 only
Phase 5 (Testing) requires all
```

Phases 3 and 4 can be done in parallel after their dependencies are met.

## Risk Areas

1. **GridCollisionComponent.enabled** — The dual ownership fix requires `GridCollisionComponent` to support an `enabled` flag. Verify this field exists or add it. If it doesn't exist, add a simple `if (!this.enabled) return;` guard at the top of `update()`.
2. **AttackButtonComponent access** — PlayerPushState needs to reach the HUD's AttackButtonComponent. Follow the existing pattern used by NPC interaction (via joystick entity reference).
3. **Animation frame numbers** — Lean animations use hardcoded frame indices (224–226, 236–238, etc.). Verify these match the actual push animation frames in the player spritesheet.

## Analyst Fixes Incorporated

| Issue | Source | Severity | Fix Location |
|-------|--------|----------|-------------|
| PlayerPushState needs onExit() | failure-analysis | HIGH | Task 2.2 — `onExit()` re-enables walk, clears icon, resets damagePending |
| Dual occupant ownership | runtime-analysis | MEDIUM | Task 1.2 — disable GridCollisionComponent during moves |
| spawnCol/spawnRow semantics | runtime-analysis | MINOR | Tasks 1.1, 1.3 — pass `originalCol`/`originalRow` separately |
