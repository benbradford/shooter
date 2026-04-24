# Escort Entity — Tasks

## Phase 1: Foundation (no gameplay yet) ✅

### 1.1 Type Registration & Asset Setup ✅
- Add `'escort'` to `EntityType` union in `src/systems/level/LevelLoader.ts`
- Add `escort` asset group to `src/assets/AssetRegistry.ts` with `knight_spritesheet` (68×68)
- Modify `src/assets/AssetLoader.ts` `getRequiredAssetGroups()`:
  - Load escort group when level JSON has escort entities
  - **(V3 fix)**: Also load when `current_escort` flag is set OR any `escort_*_completed` flag exists
- Add `isOnLastFrame(animKey)` helper to `src/systems/animation/AnimationSystem.ts`

### 1.2 Knight Animation Map ✅
- Create `src/ecs/entities/escort/KnightAnimations.ts`
- Implement `createKnightAnimationMap()` returning `Map<string, Animation>`
- Direction mapping: 8-dir Direction enum → 4 knight directions (east/north/south/west)
- Animations: idle (static), walk (repeat), arms_stretched (once), crouch_forward (once), crouch_reverse (once)

### 1.3 Entity Factory ✅
- Create `src/ecs/entities/escort/EscortEntity.ts`
- Implement `createEscortEntity(props)` with all components
- **(V1 fix)**: Call `shadow.init()` after adding ShadowComponent
- **(V4 fix)**: Set sprite+shadow alpha=0 when `initialState === 'waiting_for_player_move'`
- **(V5 fix)**: Pass `col, row` through props for spawn tracking
- Set correct initial animation frame for dormant (crouch last frame) and completed (arms_stretched last frame)

**Verify**: Place escort in a test level JSON, load level, confirm knight sprite renders at correct position in crouched pose.

---

## Phase 2: Core State Machine ✅

### 2.1 EscortComponent — Skeleton ✅
- Create `src/ecs/components/escort/EscortComponent.ts`
- Implement constructor with all props, state enum, `isEventRegistered` tracking
- **(V2 fix)**: Only register event listener when `initialState === 'dormant'`
- **(V5 fix)**: Set `playerSpawnCol/Row` from props when `initialState === 'waiting_for_player_move'`
- Implement `update()` switch dispatching to state handlers
- Implement `onDestroy()` — **(V2 fix)**: deregister if `isEventRegistered` is true

### 2.2 Awakening ✅
- Implement `onEvent()` handler
- **(F3 fix)**: Check `current_escort` flag — if already set to different escort, clear previous escort's flags and force it to completed state
- Set `current_escort` flag, call `persistEscortDefinition()`
- Deregister listener, set `isEventRegistered = false`
- Implement `updateAwakening()` — check `isOnLastFrame('crouch_reverse')` → transition to following

### 2.3 Following ✅
- Implement `updateFollowing()` with pathfinding toward player
- Teleport if >800px, idle if ≤64px
- Layer sync with player
- Path recalculation every 500ms

### 2.4 Enemy Detection & Crouching ✅
- Implement `checkEnemies()` — iterate entities with 'enemy' tag, distance check
- Implement `updateCrouching()` with three phases: crouching_down → holding → standing_up
- Store `previousActiveState` to resume correctly

### 2.5 Destination Walking ✅
- Implement `checkDestinationReachable()` — level match, pathfind, reach distance check
- Implement `updateWalkingToDestination()` with path following
- **(F2 fix)**: `recalculatePathToDestination()` tries exact cell, then adjacent cells, then reverts to 'following' if completely unreachable

### 2.6 Completion ✅
- Implement `enterCompleting()` — **(F1 fix)**: set ALL completion flags BEFORE animation starts
- Implement `updateCompleting()` — wait for animation, set state='completed' (cosmetic only)

**Verify**: Place escort in test level with trigger. Awaken it, verify it follows player, crouches near enemies, walks to destination, completes.

---

## Phase 3: Cross-Level & Persistence ✅

### 3.1 EntityLoader Integration ✅
- Add `case 'escort'` to `EntityLoader.createEntityCreator()`
- Read WorldState to determine initial state (dormant/following/completed)

### 3.2 Cross-Level Spawn ✅
- Add `spawnCrossLevelEscort()` to GameScene
- Read all `escort_{id}_*` flags to reconstruct entity
- Spawn at player start position with `initialState='waiting_for_player_move'`
- Call after `spawnEntities()` in `initializeScene()`

### 3.3 Completed Escort Spawn (V7 fix) ✅
- Add `spawnCompletedEscorts()` to GameScene
- Iterate WorldState flags for `escort_*_completed === 'true'`
- Match `completed_level` to current level, skip if entity already exists
- Spawn at completed position with `initialState='completed'`

### 3.4 Death Reset (V6 fix) ✅
- Add `handleEscortDeathReset()` to GameScene
- Call from `reloadCurrentLevel()` BEFORE level reload
- If on origin level: clear `current_escort` and all persisted definition flags
- If on non-origin level: do nothing (cross-level spawn handles it)

**Verify**: Awaken escort, transition to another level, verify escort appears. Complete escort on non-origin level, leave and return, verify completed pose. Die on origin level, verify escort reverts to dormant.

---

## Phase 4: Editor Integration ✅

### 4.1 Editor Support ✅
- Add `'escort'` to `ENTITY_TYPES` in `editor/panels/Toolbar.ts`
- Add `'ES'` label in `editor/CanvasInteraction.ts` labelMap
- Add escort defaults in `editor/EditorBridge.ts` `addEntity()`
- Add escort extraction block in `extractEntities()`
- Add escort form fields in `editor/panels/ContextPanel.ts`

**Verify**: Place escort in editor, edit all fields, save, reload, verify data round-trips.

---

## Checklist of Analyst Fixes

| Fix | Source | Phase | Description |
|-----|--------|-------|-------------|
| V1 | Runtime | 1.3 | `shadow.init()` called in factory |
| V2 | Runtime | 2.1 | Event listener tracked with `isEventRegistered`, always deregistered in `onDestroy()` |
| V3 | Runtime | 1.1 | Asset loading checks `current_escort` and `escort_*_completed` flags |
| V4 | Runtime | 1.3 | Sprite+shadow alpha=0 for `waiting_for_player_move` |
| V5 | Runtime | 1.3, 2.1 | `playerSpawnCol/Row` initialized from props |
| V6 | Runtime | 3.4 | Explicit death reset, no `levelEntrySnapshot` dependency |
| V7 | Runtime | 3.3 | `spawnCompletedEscorts()` for non-origin destination levels |
| F1 | Failure | 2.6 | Completion flags set at START of completing state |
| F2 | Failure | 2.5 | Fallback: adjacent cells then revert to following |
| F3 | Failure | 2.2 | Deactivate previous escort when new one awakens |
