# Runtime Analysis: Blocked Areas System

**Complexity:** Medium — no async operations in core collision path, but touches scene lifecycle (level transitions) and multiple Pathfinder creation sites.

---

## Execution Flows Analyzed

1. Level Load → BlockedAreaManager creation → cell marking → pathfinder initialization
2. Player movement frame → GridCollisionComponent → BlockedAreaCollisionComponent → final position
3. Projectile update → position change → polygon check → onWallHit
4. Editor draw polygon → validate → save → reload level
5. Level transition → scene stop → scene restart (lifecycle ownership)
6. Scene reset (death/retry)

---

## Lifecycle Ownership Table

| Resource | Created By | Destroyed By | Lifetime | Used By |
|----------|-----------|--------------|----------|---------|
| BlockedAreaManager | `GameScene.initializeScene()` | Garbage collected on scene restart (no explicit destroy) | Per-level (GameScene instance) | BlockedAreaCollisionComponent, ProjectileComponent, Pathfinder, Grid debug |
| BlockedArea[] (runtime) | BlockedAreaManager constructor | BlockedAreaManager GC | Per-level | SAT collision, point-in-polygon, debug render |
| blockedCells Set | BlockedAreaManager constructor | BlockedAreaManager GC | Per-level | Pathfinder.getValidNeighbor() |
| BlockedAreaCollisionComponent | `createPlayerEntity()` | `Entity.destroy()` → `onDestroy()` | Player entity lifetime | Player entity update loop |
| Pathfinder instances | Various state constructors (BugChaseState, PumaChasingState, etc.) | State GC / entity destroy | Per-state-entry or per-entity | AI navigation |
| Editor polygon vertices | CanvasInteraction drawing state | `bridge.removeBlockedArea()` or discard on cancel | Until deleted or level unloaded | EditorBridge, ContextPanel |
| Grid.blockedAreaManager ref | `grid.setBlockedAreaManager()` | Grid.destroy() / GC | Per-level | Debug rendering only |

---

## Flow 1: Level Load → BlockedAreaManager → Cell Marking → Pathfinder

### Execution Trace

```
1. LoadingScene.loadLevel() [async]
   1.1. LevelLoader.load(targetLevel) → LevelData with blockedAreas?: BlockedAreaDef[]
   1.2. AssetLoadCoordinator.loadLevelAssets() [async]
   1.3. renderer.prepareRuntimeTilesets() [async]
   1.4. unloadPreviousLevelAssets() [sync]
   1.5. scene.start('game', { levelData }) [queued]

2. GameScene.create(data) [async]
   2.1. this.entityManager = new EntityManager()
   2.2. this.levelData = data.levelData (already loaded)
   2.3. await this.initializeScene()

3. GameScene.initializeScene() [async]
   3.1. this.grid = new Grid(scene, width, height, cellSize)
   3.2. Grid cells populated from levelData.cells
   3.3. SceneOverlays applied
   3.4. Camera configured
   3.5. ★ DESIGN: const blockedAreaManager = new BlockedAreaManager(levelData.blockedAreas ?? [], this.grid)
        3.5.1. For each def: isConvex() validation → skip invalid
        3.5.2. computeNormals() for valid polygons
        3.5.3. getOverlappingCells() → populate blockedCells Set
               Uses testAABBvsPolygon() with grid.cellSize — grid MUST exist ✅ (created in 3.1)
   3.6. ★ DESIGN: Store blockedAreaManager on GameScene (public readonly)
   3.7. ★ DESIGN: grid.setBlockedAreaManager(blockedAreaManager)
   3.8. EntityLoader created
   3.9. spawnEntities() called
        3.9.1. createPlayerEntity({ ..., blockedAreaManager }) → BlockedAreaCollisionComponent
        3.9.2. entityLoader.loadEntities() → enemy entities created
               Enemy states (BugChaseState, etc.) create Pathfinder in their constructors
               ★ DESIGN: new Pathfinder(grid, scene.blockedAreaManager?.getBlockedCells())
   3.10. Camera follow player

4. GameScene.update() begins
   4.1. stateMachine.update(delta) → InGameState → entityManager.update(delta)
   4.2. Entities update in order, including player with BlockedAreaCollisionComponent
```

### Verification

- ✅ Grid exists before BlockedAreaManager constructor (step 3.1 before 3.5)
- ✅ BlockedAreaManager exists before player entity creation (step 3.5 before 3.9.1)
- ✅ BlockedAreaManager exists before enemy entity creation (step 3.5 before 3.9.2)
- ✅ blockedCells computed before any Pathfinder reads it (step 3.5.3 before 3.9.2)
- ✅ All synchronous — no async boundaries between creation and usage

### ⚠️ CONCERN: Pathfinder Creation Timing

Pathfinders are created in enemy state constructors, not at entity spawn time. Some states are entered lazily (e.g., BugChaseState entered when player is detected). By that time, `scene.blockedAreaManager` is guaranteed to exist because `initializeScene()` completes before any updates run.

**Verdict:** ✅ Safe — `initializeScene()` is awaited in `create()`, and `update()` only runs after `create()` completes.

---

## Flow 2: Player Movement Frame → Grid Collision → Blocked Area Collision

### Execution Trace

```
1. EntityManager.update(delta)
   1.1. Iterates entities, calls entity.update(delta)

2. Player entity.update(delta) — components run in setUpdateOrder:
   2.1. TransformComponent.update() — no-op (stores position)
   2.2. SpriteComponent.update() — syncs sprite to transform
   2.3. ShadowComponent.update()
   2.4. ControlModeComponent.update()
   2.5. InputComponent.update() — reads joystick/keyboard → sets velocity intent
   2.6. InteractionComponent.update()
   2.7. WalkComponent.update()
        2.7.1. Reads input velocity
        2.7.2. Applies to transform: transform.x += vx * delta; transform.y += vy * delta
   2.8. GridCollisionComponent.update()
        2.8.1. Reads transform position
        2.8.2. Checks cell walls, slides along walls
        2.8.3. Writes corrected position back to transform
   2.9. ★ BlockedAreaCollisionComponent.update()
        2.9.1. Reads transform.x, transform.y (post-grid-collision)
        2.9.2. Reads gridPos.collisionBox → builds AABB
        2.9.3. Reads gridPos.currentLayer
        2.9.4. blockedAreaManager.getForLayer(currentLayer) → filtered polygons
        2.9.5. For each polygon: testAABBvsPolygon(aabb, polygon)
        2.9.6. If MTV: transform.x += mtv.x; transform.y += mtv.y; aabb updated in-place
        2.9.7. Repeat for remaining polygons with updated AABB
   2.10. PetAbilityComponent.update()
   2.11. CollisionComponent.update()
   2.12. ... remaining components
```

### Verification

- ✅ WalkComponent writes transform BEFORE GridCollisionComponent reads it (2.7 → 2.8)
- ✅ GridCollisionComponent writes corrected position BEFORE BlockedAreaCollisionComponent reads it (2.8 → 2.9)
- ✅ BlockedAreaCollisionComponent reads `gridPos.currentLayer` — this is set by GridCollisionComponent during step 2.8 ✅
- ✅ AABB updated in-place after each MTV push (2.9.6) — subsequent polygon tests use corrected position
- ✅ No async boundaries — entire chain is synchronous within one frame
- ✅ `blockedAreaManager` reference captured at construction time, not looked up each frame — stable reference

### ⚠️ CONCERN: Multiple Polygon MTV Resolution Order

The design resolves MTVs independently per polygon in iteration order. With overlapping polygons, the resolution order could matter — pushing out of polygon A might push into polygon B.

**Risk level:** Low. Design states "<10 polygons per level" and they are static level geometry unlikely to overlap. If they do overlap, the sequential resolution is a standard approach (not a bug, just a known limitation of iterative SAT).

**Verdict:** ✅ No violation — acceptable design trade-off.

### ⚠️ CONCERN: GridCollisionComponent May Push Player INTO a Polygon

GridCollisionComponent slides the player along walls. This slide could push the player into a blocked area polygon that sits adjacent to a wall. BlockedAreaCollisionComponent then pushes them back out.

**Risk level:** Low. This is the intended behavior — the two systems compose correctly because BlockedAreaCollisionComponent runs after GridCollisionComponent. The player may oscillate for one frame but will settle.

**Verdict:** ✅ Correct by design — component ordering handles this.

---

## Flow 3: Projectile Update → Position Change → Polygon Check → onWallHit

### Execution Trace

```
1. Projectile entity.update(delta) — update order: [Transform, Projectile, Collision, Sprite]

2. ProjectileComponent.update(delta)
   2.1. transform.x += dirX * movePx; transform.y += dirY * movePx
   2.2. distanceTraveled += movePx
   2.3. Check maxDistance → entity.destroy() + return if exceeded
   2.4. ★ NEW: Check blockedAreaManager (if present)
        2.4.1. blockedAreaManager.isPointInside(transform.x, transform.y, currentLayer)
        2.4.2. Iterates areas: filter by layer, filter by blocksProjectiles
        2.4.3. isPointInPolygon(x, y, vertices) — cross-product winding test
        2.4.4. If inside: onWallHit(x, y) → entity.destroy() → return
   2.5. Existing cell/layer collision checks continue if not destroyed
```

### Verification

- ✅ Position updated before polygon check (2.1 before 2.4)
- ✅ `entity.destroy()` + `return` prevents further processing after hit (2.4.4)
- ✅ `blockedAreaManager` is optional (`if (this.blockedAreaManager)`) — backward compatible
- ✅ Point-in-polygon uses current position, not previous — correct for single-point projectiles
- ✅ `currentLayer` is maintained by ProjectileComponent's own stair-traversal logic — independent of grid position component

### ⚠️ CONCERN: Tunneling Through Thin Polygons

A fast projectile (speed=800px/s) moving at 60fps travels ~13px per frame. If a polygon edge is thinner than 13px, the projectile could tunnel through it (position jumps from outside to outside).

**Risk level:** Low-Medium. Polygons are level geometry (walls, barriers) typically much wider than 13px. However, if a designer creates a very thin polygon (e.g., a fence), tunneling is possible.

**Mitigation:** Not addressed in design. Could add ray-cast check in future if needed. For current use case (blocked areas = thick regions), point-in-polygon is sufficient.

**Verdict:** ✅ Acceptable for current scope — document as known limitation.

### ⚠️ CONCERN: blockedAreaManager Passed to Projectile Factories

Design says: "Each factory already receives `scene` — they read `scene.blockedAreaManager`."

Looking at actual code, `createBulletEntity` receives `props: CreateBulletProps` with `scene: Phaser.Scene`. To access `scene.blockedAreaManager`, the scene must be cast to `GameScene`. This is the existing pattern (other components already do this).

**Verification:** The `scene` passed to bullet factories is always the GameScene instance. ✅ Safe.

---

## Flow 4: Editor Draw Polygon → Validate → Save → Reload Level

### Execution Trace

```
1. User selects blocked area tool (bridge.currentTool = 'blockedarea')

2. Drawing state:
   2.1. Click canvas → first vertex placed, autoLayer detected from cell
   2.2. Subsequent clicks → vertices added to array
   2.3. Click near first vertex (≤16px) AND vertices.length ≥ 3 → close polygon

3. Close polygon:
   3.1. PolygonUtils.isConvex(vertices) — validation
   3.2. If invalid → error toast, discard, return to idle
   3.3. If valid → bridge.addBlockedArea(vertices, autoLayer)

4. bridge.addBlockedArea():
   4.1. _applyMutation('Add blocked area', () => { ... })
        4.1.1. Pushes to history stack (undo support)
        4.1.2. levelData.blockedAreas.push({ id, vertices, layer, blocksProjectiles: true })
   4.2. Mutation applied to levelData directly

5. Save (Ctrl+S or explicit save):
   5.1. bridge.getCurrentLevelData() → returns full LevelData
        5.1.1. blockedAreas passed through from existingLevelData.blockedAreas ✅
   5.2. JSON.stringify() → file write

6. Reload level (editor reload or game play):
   6.1. LevelLoader.load() → JSON.parse() → LevelData with blockedAreas
   6.2. GameScene.initializeScene() → new BlockedAreaManager(levelData.blockedAreas, grid)
   6.3. Runtime state matches saved data ✅
```

### Verification

- ✅ Convexity validated before adding to level data (step 3.1)
- ✅ Level data mutation goes through _applyMutation (undo support)
- ✅ blockedAreas serialized as part of LevelData — no separate save path needed
- ✅ Round-trip: vertices are world-pixel numbers, JSON preserves exactly
- ✅ No async boundaries in the editor mutation path

### ⚠️ CONCERN: Editor Does NOT Create Runtime BlockedAreaManager

The editor mutates `levelData.blockedAreas` directly but does NOT recreate `BlockedAreaManager` at runtime. This means:
- Debug visualization in editor would need to read from `levelData.blockedAreas` directly (not from BlockedAreaManager)
- No collision testing in editor (expected — editor doesn't run gameplay)

**Verdict:** ✅ Correct — editor is a data editor, not a gameplay simulator. The design's CanvasInteraction handles its own polygon rendering for the editor overlay.

### ⚠️ CONCERN: ID Generation — `ba${levelData.blockedAreas.length}`

If a user adds 3 areas (ba0, ba1, ba2), deletes ba1, then adds another, the new one gets id `ba2` (length is now 2). This creates a duplicate ID.

**Risk level:** Medium. IDs are used for selection and deletion in the editor. Duplicate IDs would cause `removeBlockedArea` to delete the wrong area.

**Verdict:** ❌ MINOR VIOLATION — ID generation is not collision-safe.

**Fix:** Use a counter that only increments, or use `Date.now()` / UUID:
```typescript
const id = `ba_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
```
Or track a monotonic counter on the level data.

---

## Flow 5: Level Transition — Lifecycle Ownership

### Execution Trace

```
1. Player touches exit → GameScene.startLevelTransition(targetLevel, col, row)
   1.1. Saves world state, player health
   1.2. GameScene.previousEntityManager = this.entityManager
   1.3. Camera fadeOut(500ms) [async — tween]
   1.4. time.delayedCall(500ms, () => scene.start('LoadingScene', {...})) [deferred]

2. [500ms later] scene.start('LoadingScene') [queued by Phaser]

3. LoadingScene.init()
   3.1. gameScene.entityManager.destroyAll() — destroys all entities
        3.1.1. Player entity destroyed → BlockedAreaCollisionComponent.onDestroy() (if defined)
        3.1.2. All enemy entities destroyed → their Pathfinder references become unreachable
   3.2. scene.stop('game') [queued]

4. LoadingScene.create() → loadLevel() [async]
   4.1. LevelLoader.load(targetLevel)
   4.2. AssetLoadCoordinator.loadLevelAssets()
   4.3. unloadPreviousLevelAssets() — textures only, no blocked area cleanup needed
   4.4. scene.start('game', { levelData }) [queued]

5. GameScene.create() — NEW instance
   5.1. GameScene.previousEntityManager?.destroyAll() — cleanup (already destroyed in 3.1, safe)
   5.2. new EntityManager(), new EventManagerSystem()
   5.3. await initializeScene()
        5.3.1. new Grid()
        5.3.2. ★ new BlockedAreaManager(newLevelData.blockedAreas, newGrid)
        5.3.3. New entities created with new blockedAreaManager reference
   5.4. Old BlockedAreaManager is now unreferenced → GC eligible
```

### Verification

- ✅ Old BlockedAreaManager has no explicit destroy needed — it's a plain object with no Phaser resources (no sprites, no textures, no event listeners)
- ✅ Old Pathfinder instances hold reference to old blockedCells Set, but Pathfinders are destroyed with their entities in step 3.1
- ✅ No dangling references: entities destroyed before new scene starts
- ✅ No async race: LoadingScene.init() destroys entities synchronously before scene.stop()
- ✅ Grid.blockedAreaManager reference: old Grid is destroyed in scene shutdown, new Grid gets new reference

### ⚠️ CONCERN: GameScene.resetScene() Path

`resetScene()` (called on player death/retry) does:
```
grid.destroy()
entityManager.destroyAll()
await initializeScene()  ← creates new BlockedAreaManager
```

The old BlockedAreaManager is replaced by the new one. Since `resetScene` destroys all entities first, no component holds a stale reference when `initializeScene` creates new entities with the new manager.

**Verdict:** ✅ Safe — destroy-all-then-recreate pattern is clean.

---

## Flow 6: Scene Reset (Death/Retry) — Detailed

### Execution Trace

```
1. GameScene.resetScene() called
   1.1. Guard: if (this.isResetting) return
   1.2. this.isResetting = true
   1.3. sceneOverlays.destroy()
   1.4. grid.destroy() — destroys Phaser Graphics object
        ★ grid.blockedAreaManager reference becomes stale (grid is destroyed)
   1.5. entityManager.destroyAll()
        1.5.1. All entities destroyed synchronously
        1.5.2. BlockedAreaCollisionComponent references to old blockedAreaManager become irrelevant
        1.5.3. All Pathfinder instances holding old blockedCells become irrelevant
   1.6. entityCreatorManager.clear()
   1.7. await initializeScene()
        1.7.1. this.grid = new Grid(...) — new grid
        1.7.2. ★ new BlockedAreaManager(levelData.blockedAreas, this.grid)
        1.7.3. grid.setBlockedAreaManager(newManager)
        1.7.4. New entities created with new references
   1.8. this.isResetting = false
```

### Verification

- ✅ Old grid destroyed before new grid created (1.4 before 1.7.1)
- ✅ All entities destroyed before new entities created (1.5 before 1.7.4)
- ✅ No update() calls during reset — `isResetting` guard + await ensures atomic reset
- ✅ `levelData.blockedAreas` persists across reset (same level data reused) — polygons preserved

**Verdict:** ✅ Clean lifecycle.

---

## Temporal Coupling Analysis

### Check 1: Grid must exist before BlockedAreaManager

```
Grid created (initializeScene step 3.1)
  ↓ [synchronous]
BlockedAreaManager created (step 3.5)
```

**Coupling:** BlockedAreaManager constructor reads `grid.cellSize` for cell overlap calculation.
**Risk:** None — synchronous, same function, guaranteed order.
**Verdict:** ✅ No violation.

### Check 2: BlockedAreaManager must exist before entity spawn

```
BlockedAreaManager created (step 3.5)
  ↓ [synchronous]
spawnEntities() (step 3.9)
  ↓
createPlayerEntity({ blockedAreaManager })
```

**Coupling:** Player entity constructor receives blockedAreaManager as prop.
**Risk:** None — synchronous, same function.
**Verdict:** ✅ No violation.

### Check 3: Pathfinder creation in lazy state entry

```
initializeScene() completes
  ↓ [async boundary — update loop starts]
Enemy detects player
  ↓
State transition → new Pathfinder(grid, scene.blockedAreaManager?.getBlockedCells())
```

**Coupling:** Pathfinder reads `scene.blockedAreaManager` at state entry time, not at entity creation time.
**Risk:** If `scene.blockedAreaManager` is null at state entry time, Pathfinder gets no blocked cells.
**Analysis:** `scene.blockedAreaManager` is set during `initializeScene()` which completes before any `update()` runs. Enemy states can only be entered during `update()`. Therefore `scene.blockedAreaManager` is guaranteed to be set.
**Verdict:** ✅ No violation.

### Check 4: Pathfinder gets a snapshot, not a live reference

```
Pathfinder constructor receives blockedCells: ReadonlySet<string>
  ↓
blockedCells is the SAME Set object from BlockedAreaManager
  ↓
BlockedAreaManager never mutates blockedCells after construction
```

**Coupling:** Pathfinder holds a reference to the Set, not a copy. If BlockedAreaManager mutated the Set, Pathfinder would see changes.
**Risk:** None — BlockedAreaManager computes blockedCells once in constructor and never modifies it.
**Verdict:** ✅ No violation — immutable after construction.

---

## Async Boundary Analysis

### Boundary 1: `initializeScene()` is async

`initializeScene()` is `async` but the blocked area creation path within it is entirely synchronous:
```
new BlockedAreaManager(...)  // sync
grid.setBlockedAreaManager(...)  // sync
spawnEntities()  // sync
```

The only async operations in `initializeScene()` are `SceneOverlays.init()` and camera fade — both occur BEFORE blocked area creation.

**Verdict:** ✅ No async risk in blocked area initialization.

### Boundary 2: Level transition — `scene.start()` is queued

`scene.start('LoadingScene')` is queued by Phaser, not immediate. But by the time it fires, `startLevelTransition()` has already saved `previousEntityManager` and the fade is complete.

**Verdict:** ✅ No async risk — entities are destroyed in LoadingScene.init() before any new scene runs.

### Boundary 3: `time.delayedCall(500, ...)` in startLevelTransition

The 500ms delay before `scene.start('LoadingScene')` means the game continues running for 500ms after transition is initiated. During this time:
- Player input is disabled (step 1.1 of Flow 5)
- Entities still update (including BlockedAreaCollisionComponent)
- BlockedAreaManager is still valid

**Verdict:** ✅ Safe — all references remain valid during the fade period.

---

## Race Condition Analysis

### Race 1: Two scenes accessing BlockedAreaManager simultaneously

**Scenario:** Could LoadingScene and GameScene both access the same BlockedAreaManager?

**Analysis:** LoadingScene destroys all entities in `init()` before `scene.stop('game')`. GameScene's update loop stops when the scene is stopped. No overlap.

**Verdict:** ✅ No race.

### Race 2: Entity destroyed mid-update while holding BlockedAreaManager reference

**Scenario:** An entity is destroyed during the update loop (e.g., projectile hits wall). Could BlockedAreaCollisionComponent run on a destroyed entity?

**Analysis:** `Entity.update()` checks `if (this.isDestroyed) break` between each component. If a projectile destroys itself in `ProjectileComponent.update()`, the remaining components (Collision, Sprite) are skipped. BlockedAreaCollisionComponent is on the PLAYER entity, not the projectile — it's unaffected by projectile destruction.

**Verdict:** ✅ No race.

### Race 3: resetScene() called during update

**Scenario:** Player dies, `resetScene()` called. Could an entity's update be interrupted?

**Analysis:** `resetScene()` is called from game logic (health reaches 0 → death state → reset). This happens within the update loop. However, `resetScene()` calls `entityManager.destroyAll()` which marks all entities as destroyed. The current frame's remaining entity updates will see `isDestroyed = true` and skip. The `await initializeScene()` then creates fresh state.

**Risk:** If `resetScene()` is called from within an entity's update (e.g., HealthComponent triggers death → reset), the current entity's remaining components still run for that frame with stale state.

**Mitigation:** The `isResetting` guard prevents double-reset. The stale state for one frame is harmless — the entity is about to be destroyed anyway.

**Verdict:** ✅ Acceptable — one frame of stale state is harmless.

---

## Violations Detected

### ❌ MINOR VIOLATION: Editor Blocked Area ID Collision

**Type:** State management

**Location:** design.md — Section 9, `addBlockedArea()` method

**Problem:** ID generation uses `ba${levelData.blockedAreas.length}` which can produce duplicate IDs after deletions.

**Why it fails:**
- Add ba0, ba1, ba2 (length=3)
- Delete ba1 (length=2)
- Add new area → id = `ba2` (duplicate!)
- `removeBlockedArea('ba2')` removes wrong area

**Fix:** Use monotonic counter:
```typescript
addBlockedArea(vertices, layer) {
  this._applyMutation('Add blocked area', () => {
    const levelData = this.scene.getLevelData();
    if (!levelData.blockedAreas) levelData.blockedAreas = [];
    const maxId = levelData.blockedAreas.reduce((max, a) => {
      const num = parseInt(a.id.replace('ba', ''), 10);
      return isNaN(num) ? max : Math.max(max, num);
    }, -1);
    const id = `ba${maxId + 1}`;
    levelData.blockedAreas.push({ id, vertices, layer, blocksProjectiles: true });
  });
}
```

**Severity:** Minor — only affects editor workflow, not runtime gameplay. Easy fix.

---

## Summary

| Criterion | Status |
|-----------|--------|
| No resource destroyed while referenced | ✅ PASS |
| No async race conditions | ✅ PASS |
| Lifecycle ownership clearly defined | ✅ PASS |
| All execution flows trace correctly | ✅ PASS |
| No temporal coupling violations | ✅ PASS |
| Editor state management | ⚠️ MINOR (ID collision) |

### Overall: ✅ PASS (with one minor editor fix recommended)

The design is sound for runtime execution. Key strengths:

1. **BlockedAreaManager is a plain data object** — no Phaser resources, no event listeners, no explicit cleanup needed. GC handles lifecycle naturally.
2. **Component ordering is explicit** — `setUpdateOrder` guarantees Walk → GridCollision → BlockedAreaCollision.
3. **No async in the hot path** — collision detection is fully synchronous per frame.
4. **Pathfinder integration is backward-compatible** — optional second parameter, existing code unaffected.
5. **Level transition is clean** — entities destroyed before new scene, no dangling references.

### Recommended Fix Before Implementation

- Fix editor ID generation to use monotonic counter (minor, editor-only).

### Known Limitations (Not Violations)

- Projectile tunneling through very thin polygons (<13px) — acceptable for current use case.
- Multiple overlapping polygon MTV resolution is order-dependent — standard SAT limitation, acceptable with <10 polygons.
