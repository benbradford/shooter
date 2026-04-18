# Runtime Analysis: Pushable Objects

## Complexity Assessment
**Medium complexity** — No scene lifecycle changes, no async loading, no asset management. Pure ECS component interactions with grid state mutations. Full analysis performed on all 7 flows.

## Execution Flows Analyzed

1. Contact detection flow (player walks into pushable)
2. Push execution flow (button press → cell move → arrival)
3. Continuous push flow (hold button → multiple cell moves)
4. Damage during push flow (hit while mid-push)
5. Disengage flow (joystick while in contact)
6. Persistence flow (push → save → reload level)
7. Pushable spawn with persistence (level load with movedEntities)

---

## Flow 1: Contact Detection (Player Walks Into Pushable)

### Execution Trace

```
Frame N: Player moving right toward pushable at cell (5,3)

1. EntityManager.update(delta) iterates all entities
2. Player entity update begins (component update order):
   2.1. InputComponent.update() — reads joystick: dx=1, dy=0
   2.2. WalkComponent.update(delta) — applies velocity to TransformComponent
        transform.x += velocityX * delta  (moves player rightward)
   2.3. GridCollisionComponent.update(delta) runs:
        2.3.1. newX = transform.x, newY = transform.y
        2.3.2. checkCollision(newX, newY, gridPos) called
        2.3.3. Calculates new collision box bounds
        2.3.4. For each new cell overlapped, calls canMoveTo()
        2.3.5. canMoveTo() checks cell (5,3) occupants:
               → finds pushable entity with GridCellBlocker
               → returns false (blocked)
        2.3.6. checkCollision returns true (blocked)
        2.3.7. Tries X-only: checkCollision(newX, previousY) → blocked
        2.3.8. Tries Y-only: checkCollision(previousX, newY) → not blocked
        2.3.9. xOnlyBlocked=true: transform.x = previousX, walk.resetVelocity(true, false)
        2.3.10. Updates occupiedCells, currentCell, previousX/Y
   2.4. StateMachineComponent.update(delta) runs:
        2.4.1. Current state = PlayerWalkState.onUpdate(delta)
        2.4.2. Reads input: dx=1, dy=0
        2.4.3. getCardinalPushDirection(1, 0) → Direction.Right
        2.4.4. Calculates target cell: playerCol + 1 = col 5, row 3
        2.4.5. Gets cell (5,3) occupants
        2.4.6. Finds pushable entity with PushableComponent
        2.4.7. Checks pushable.pushEnabled === true
        2.4.8. sm.stateMachine.enter('push', { pushableEntity, direction: Right })
        2.4.9. PlayerWalkState.onExit() called
        2.4.10. PlayerPushState.onEnter() called:
                - Stores pushableEntity and direction
                - phase = 'contact'
                - Snaps player to center of cell (4,3)
                - Plays push_lean_right animation (looping)
                - walk.setEnabled(false)
                - attackButton.setIconOverride('push')
```

### Verification Points

- ✅ **Step 2.3.9**: Player position restored before StateMachine runs — player is at valid position when detection occurs
- ✅ **Step 2.4.4**: Target cell calculation uses GridPositionComponent.currentCell which was updated in step 2.3.10
- ✅ **Step 2.4.6**: Pushable entity is a grid occupant via GridCollisionComponent — will be found in cell.occupants
- ✅ **Step 2.4.10**: WalkComponent disabled prevents further movement while in push state

### ⚠️ CONCERN: GridPositionComponent.currentCell Update Timing

**Location**: Step 2.3.10 vs Step 2.4.4

GridCollisionComponent updates `gridPos.currentCell` at the END of its update (line ~310 of GridCollisionComponent.ts). The StateMachineComponent runs AFTER GridCollisionComponent in the player's update order. So `gridPos.currentCell` reflects the post-collision position. This is correct — the player's cell is accurate when PlayerWalkState reads it.

**Verdict**: ✅ No violation. Update order is correct.

### ⚠️ CONCERN: Diagonal Approach Filtering

**Location**: Step 2.4.3

The design specifies `getCardinalPushDirection(dx, dy)` returns null if both dx and dy are non-zero. This relies on `input.getInputDelta()` returning raw joystick values. If the player approaches at a slight angle (dx=0.9, dy=0.1), the function correctly returns null because dy !== 0. However, GridCollisionComponent may have already snapped the player on one axis via sliding (step 2.3.8), which could cause the player to be adjacent to the pushable on the cardinal axis.

**Risk**: Low. The cardinal check is on INPUT, not position. Even if the player slides into adjacency, they won't enter push state unless input is purely cardinal. This is the intended behavior per requirements.

**Verdict**: ✅ No violation.

---

## Flow 2: Push Execution (Button Press → Cell Move → Arrival)

### Execution Trace

```
Frame N: Player in PlayerPushState, phase='contact', direction=Right
         Pushable at cell (5,3), player snapped to cell (4,3)

1. Player entity update:
   1.1. InputComponent.update() — reads attack button: pressed=true
   1.2. WalkComponent.update() — enabled=false, no-op
   1.3. GridCollisionComponent.update() — player not moving, no collision changes
   1.4. StateMachineComponent.update(delta):
        PlayerPushState.onUpdate(delta):
        1.4.1. phase === 'contact'
        1.4.2. Check joystick input → no input (walk disabled, but input still read)
        1.4.3. Check attack button → pressed!
        1.4.4. Call tryPush():
               a. Calculate destination: pushable cell (5,3) + Right offset = (6,3)
               b. isPushBlocked(6, 3, pushableLayer, grid, blockedAreaManager):
                  - grid.getCell(6,3) → exists
                  - Not wall, not platform, not water, not transition
                  - Same layer as pushable
                  - No blocked area
                  - No occupant with GridCellBlocker
                  → returns false (not blocked)
               c. phase = 'pushing'
               d. Play push_right animation (once)
               e. pushableComponent.startMove(6, 3, grid):
                  e1. sourceCol=5, sourceRow=3 (from current transform)
                  e2. targetCol=6, targetRow=3
                  e3. Store moveStart (world pos of 5,3 center)
                  e4. Store moveTarget (world pos of 6,3 center)
                  e5. moveProgress = 0, isMoving = true
                  e6. grid.removeOccupant(5, 3, pushableEntity) ← SOURCE FREED
                  e7. grid.addOccupant(6, 3, pushableEntity)    ← TARGET CLAIMED
               f. Calculate player follow target: cell (5,3) center
               g. Store playerMoveStart and playerMoveTarget
               h. doesPersist → update WorldState movedEntities

2. Pushable entity update (same frame or next, depends on entity order):
   2.1. PushableComponent.update(delta):
        2.1.1. isMoving = true
        2.1.2. Calculate moveProgress increment: (100 * delta/1000) / totalDist
        2.1.3. Interpolate transform.x, transform.y
   2.2. GridCollisionComponent.update() on pushable:
        2.2.1. Pushable has GridCollisionComponent
        2.2.2. Transform has moved → recalculates occupied cells
        2.2.3. Updates occupant registration based on new position

Frame N+1 through N+K: Animation frames
3. Each frame:
   3.1. PlayerPushState.onUpdate(delta) with phase='pushing':
        3.1.1. Interpolate player position toward (5,3) center at 100px/sec
        3.1.2. Check pushableComponent.getIsMoving()
        3.1.3. Still moving → continue
   3.2. PushableComponent.update(delta):
        3.2.1. Increment moveProgress
        3.2.2. Interpolate position
        3.2.3. If moveProgress >= 1: isMoving = false, snap to target

Frame N+K (move complete):
4. PlayerPushState.onUpdate(delta):
   4.1. pushableComponent.getIsMoving() === false
   4.2. Snap player to cell (5,3) center
   4.3. damagePending? No
   4.4. Attack button still held? → tryPush() again (see Flow 3)
   4.5. Attack button released? → phase = 'contact', play lean animation
```

### ⚠️ CONCERN: Double Occupant Registration (Pushable)

**Location**: Steps 1.4.4.e6-e7 and 2.2.2-2.2.3

`PushableComponent.startMove()` manually calls `grid.removeOccupant()` and `grid.addOccupant()` to atomically update the grid. But the pushable entity ALSO has `GridCollisionComponent`, which updates occupants based on the entity's transform position every frame (step 2.2).

**Problem**: During the move animation, the pushable's transform is between cells. `GridCollisionComponent.update()` will:
1. Calculate which cells the collision box overlaps at the interpolated position
2. Remove occupant from cells no longer overlapped
3. Add occupant to newly overlapped cells

This means:
- Frame 1: PushableComponent.startMove() removes from (5,3), adds to (6,3)
- Frame 1: GridCollisionComponent sees transform still near (5,3), tries to add back to (5,3)
- Mid-animation: GridCollisionComponent may register pushable in BOTH (5,3) and (6,3)
- End: GridCollisionComponent settles on (6,3)

**Impact**: During the animation, the pushable could be registered as an occupant in the source cell AND the target cell simultaneously. This would:
- Block the player from following into the vacated cell (5,3)
- Cause pathfinding to see both cells as blocked

### ❌ VIOLATION DETECTED

**Type**: Lifecycle Ownership Conflict — Dual Occupant Management

**Location**: PushableComponent.startMove() vs GridCollisionComponent.update()

**Problem**: Two systems both manage the pushable's grid occupant registration. PushableComponent does an atomic swap at move start, but GridCollisionComponent continuously updates based on transform position, overriding the atomic swap.

**Why it fails**:
- PushableComponent frees source cell at move start so player can follow
- GridCollisionComponent immediately re-registers in source cell because transform hasn't moved yet
- Player is blocked from following behind the pushable
- During mid-animation, pushable may occupy 2 cells simultaneously

**Recommended Fix**: Choose ONE occupant management strategy:

**Option A (Recommended)**: Disable GridCollisionComponent on the pushable entity during moves.
```typescript
// In PushableComponent.startMove():
const gridCollision = this.entity.get(GridCollisionComponent);
if (gridCollision) gridCollision.enabled = false;

// When move completes (moveProgress >= 1):
if (gridCollision) gridCollision.enabled = true;
```

**Option B**: Remove GridCollisionComponent from pushable entirely. Since the pushable doesn't need collision DETECTION (it doesn't move on its own), only GridCellBlocker + manual occupant management is needed. However, this means the pushable won't auto-register as an occupant on spawn — PushableComponent or the factory must handle initial registration.

**Option C**: Don't call grid.removeOccupant/addOccupant in PushableComponent.startMove(). Let GridCollisionComponent handle it naturally. But this means the source cell won't be freed until the pushable's transform actually leaves it, blocking the player from following closely.

**Recommendation**: Option A is simplest and preserves both the atomic swap behavior and the existing GridCollisionComponent for initial registration.

---

## Flow 3: Continuous Push (Hold Button → Multiple Cell Moves)

### Execution Trace

```
State: Player in PlayerPushState, phase='pushing', direction=Right
       Pushable moving from (5,3) to (6,3), attack button HELD

Frame K (first move completes):
1. PlayerPushState.onUpdate(delta):
   1.1. pushableComponent.getIsMoving() === false (move complete)
   1.2. Snap player to cell (5,3) center
   1.3. damagePending? No
   1.4. Attack button still held? YES
   1.5. Call tryPush() again:
        a. Pushable is now at (6,3)
        b. Calculate destination: (6,3) + Right = (7,3)
        c. isPushBlocked(7, 3, ...) → check destination
        d. If not blocked:
           d1. pushableComponent.startMove(7, 3, grid)
               - removeOccupant(6, 3, pushable)
               - addOccupant(7, 3, pushable)
           d2. Player follow target = (6,3) center
           d3. Update persistence if doesPersist
        e. If blocked:
           e1. Play push animation (strain)
           e2. Pushable doesn't move
           e3. When animation completes → phase = 'contact'

Frame K+1 through K+M: Second move animation
2. Same as Flow 2 steps 3.1-3.2

Frame K+M (second move completes):
3. Same check: button held → tryPush() again
   Continue until button released or destination blocked
```

### Verification Points

- ✅ **Step 1.1**: Move completion detected by checking `getIsMoving() === false`
- ✅ **Step 1.5.a**: Pushable's current position is correctly read from PushableComponent (targetCol/targetRow after move)
- ✅ **Step 1.5.c**: Destination re-validated each push — handles dynamic obstacles
- ✅ **Step 1.5.e**: Blocked push returns to contact phase, doesn't leave player stuck

### ⚠️ CONCERN: Player Position During Continuous Push

**Location**: Step 1.2 → 1.5

When the first move completes, the player snaps to cell (5,3). Then tryPush() immediately starts a new move with player following to (6,3). The player's `playerMoveStart` is set to current position (5,3 center) and `playerMoveTarget` to (6,3 center). This is correct — the player smoothly transitions from one cell to the next.

**Verdict**: ✅ No violation. Continuous push chains correctly.

### ⚠️ CONCERN: Frame-Perfect Button Release

**Location**: Step 1.4

If the player releases the attack button on the exact frame the move completes, `isAttackPressed()` returns false, and the state transitions to phase='contact' with lean animation. The pushable is at its destination, player is at the vacated cell. Both are at cell centers.

**Verdict**: ✅ No violation. Clean transition.

---

## Flow 4: Damage During Push (Hit While Mid-Push)

### Execution Trace

```
State: Player in PlayerPushState, phase='pushing', direction=Right
       Pushable moving from (5,3) to (6,3), moveProgress=0.5

Frame N: Enemy projectile hits player
1. InGameState.onUpdate(delta):
   1.1. EntityManager.update(delta) — all entities update
        1.1.1. Player entity updates:
               - PushableComponent on pushable: moveProgress advances
               - PlayerPushState.onUpdate(delta):
                 a. phase === 'pushing'
                 b. Interpolate player position
                 c. Check health: health.getHealth() vs lastKnownHealth
                 d. Health unchanged → continue
   1.2. CollisionSystem.update(entities):
        1.2.1. Projectile CollisionComponent vs Player CollisionComponent
        1.2.2. AABB overlap detected
        1.2.3. Projectile.onHit(player) → player takes damage
               - HealthComponent.takeDamage(amount) called
               - currentHealth decreases
        1.2.4. Player.onHit(projectile) → may trigger knockback

Frame N+1: Next update cycle
2. PlayerPushState.onUpdate(delta):
   2.1. phase === 'pushing'
   2.2. Interpolate player position
   2.3. Check health: health.getHealth() < lastKnownHealth → YES
   2.4. Set damagePending = true
   2.5. Continue pushing (don't disengage yet)

Frame N+K: Move completes
3. PlayerPushState.onUpdate(delta):
   3.1. pushableComponent.getIsMoving() === false
   3.2. Snap player to cell center
   3.3. damagePending === true → call disengage()
   3.4. disengage():
        3.4.1. phase is no longer 'pushing' (move complete)
        3.4.2. Re-enable WalkComponent
        3.4.3. Clear icon override
        3.4.4. Transition to 'idle' state
```

### Verification Points

- ✅ **Step 1.2.3**: Damage is applied by CollisionSystem AFTER EntityManager.update — health changes between frames
- ✅ **Step 2.4**: damagePending defers disengage until move completes — neither player nor pushable left between cells
- ✅ **Step 3.2**: Player snapped to cell center before disengage — clean position

### ⚠️ CONCERN: Knockback During Push

**Location**: Step 1.2.4

The player's `CollisionComponent.onHit` may trigger `KnockbackComponent.applyKnockback()`. If knockback is applied while PlayerPushState is interpolating the player's position, the knockback velocity would fight with the push interpolation.

**Risk**: The design says WalkComponent is disabled, but KnockbackComponent is separate. If the player has KnockbackComponent and it applies force, `GridCollisionComponent.update()` would process the knockback movement. Meanwhile, `PlayerPushState.onUpdate()` overwrites `transform.x/y` with interpolated values.

**Analysis**: Looking at GridCollisionComponent.update(), it checks for KnockbackComponent and stops it on collision. But the issue is ordering: if KnockbackComponent updates before PlayerPushState, it moves the player, then PlayerPushState overwrites the position. If PlayerPushState runs first (via StateMachineComponent), it sets position, then KnockbackComponent moves it away.

**However**: The player entity's update order has StateMachineComponent running AFTER GridCollisionComponent. KnockbackComponent is applied via WalkComponent or directly. Since WalkComponent is disabled, knockback through WalkComponent won't apply. But KnockbackComponent.update() runs independently.

### ⚠️ POTENTIAL ISSUE: KnockbackComponent vs PlayerPushState Position Control

**Type**: Temporal Coupling

**Location**: Player entity component update order during push phase

**Problem**: If KnockbackComponent is in the player's update order and applies velocity to transform, it will conflict with PlayerPushState's position interpolation. Both write to transform.x/y.

**Mitigation**: PlayerPushState should either:
1. Disable KnockbackComponent during push (similar to WalkComponent)
2. Or ensure KnockbackComponent runs before StateMachineComponent so PlayerPushState overwrites any knockback

**Severity**: Low-Medium. Knockback during push is an edge case (damage already sets damagePending), and the position conflict only lasts until the current move completes. The player will be snapped to cell center on completion regardless.

**Recommended Fix**: In PlayerPushState.onEnter(), also neutralize knockback:
```typescript
const knockback = this.entity.get(KnockbackComponent);
if (knockback) knockback.stop();
```
And in the damage handler, don't apply knockback while in push state (or let damagePending handle it — knockback applies after disengage).

---

## Flow 5: Disengage (Joystick Input While in Contact)

### Execution Trace

```
State: Player in PlayerPushState, phase='contact', direction=Right
       Player at cell (4,3), pushable at cell (5,3)

Frame N: Player touches joystick
1. Player entity update:
   1.1. InputComponent.update() — reads joystick: dx=-0.5, dy=0.3
   1.2. WalkComponent.update() — enabled=false, no-op (velocity not applied)
   1.3. GridCollisionComponent.update() — no movement, no changes
   1.4. StateMachineComponent.update(delta):
        PlayerPushState.onUpdate(delta):
        1.4.1. phase === 'contact'
        1.4.2. Check joystick input: input.getInputDelta() → dx=-0.5, dy=0.3
        1.4.3. Input detected → call disengage()
        1.4.4. disengage():
               a. phase !== 'pushing' → proceed immediately
               b. walk.setEnabled(true)
               c. attackButton.setIconOverride(null)
               d. sm.stateMachine.enter('idle')
               e. PlayerPushState.onExit() called (if defined)
               f. PlayerIdleState.onEnter() called:
                  - Plays idle animation for current direction
```

### Verification Points

- ✅ **Step 1.4.2**: InputComponent still reads joystick even though WalkComponent is disabled — input reading is independent of walk
- ✅ **Step 1.4.4.b**: WalkComponent re-enabled before state transition — player can move immediately
- ✅ **Step 1.4.4.d**: Clean transition to idle — no dangling state

### ⚠️ CONCERN: Input Detection Method

**Location**: Step 1.4.2

The design says "Check joystick input → if any input detected, disengage()". This uses `input.getInputDelta()` which returns `{dx, dy}`. The check is `if (dx !== 0 || dy !== 0)`.

**Question**: Does `InputComponent.getInputDelta()` return non-zero values when the joystick is touched but not moved significantly? Looking at the codebase, `getInputDelta()` returns processed input values. If there's a deadzone, small touches might return (0,0).

**Verdict**: ✅ This is fine — if the joystick returns (0,0) due to deadzone, the player stays in contact. Only intentional movement disengages. This matches the expected UX.

### ⚠️ CONCERN: Disengage During Push Phase

**Location**: Design specifies joystick input during 'pushing' phase should NOT immediately disengage

Looking at the design: during phase='pushing', onUpdate only checks for move completion and damage. It does NOT check joystick input. Joystick input is only checked during phase='contact'. This is correct — you can't disengage mid-push.

**Verdict**: ✅ No violation.

---

## Flow 6: Persistence (Push → Save → Reload Level)

### Execution Trace

```
Part A: Push completes with doesPersist=true

1. PlayerPushState.onUpdate(delta):
   1.1. Move complete (pushableComponent.getIsMoving() === false)
   1.2. pushable.doesPersist === true
   1.3. worldStateManager.updateMovedEntity(levelName, entityId, targetCol, targetRow)
        1.3.1. getLevelState(levelName) — returns existing or creates new
        1.3.2. Find existing entry for entityId in movedEntities
        1.3.3. If found: update col/row
        1.3.4. If not found: push new { id, col, row }
   1.4. WorldState now has: movedEntities: [{ id: 'pushable0', col: 6, row: 3 }]

Part B: Level transition (player exits level)

2. Player touches exit trigger
3. GameScene.startLevelTransition(targetLevel, spawnCol, spawnRow):
   3.1. saveWorldState() called
   3.2. WorldState serialized (includes movedEntities)
   3.3. Scene transitions to LoadingScene → new level

Part C: Player returns to level

4. LoadingScene loads level data
5. GameScene.create() → initializeScene() → spawnEntities()
6. EntityLoader.loadEntities(levelData, player):
   6.1. For each entity in levelData.entities:
        6.1.1. entityDef = { id: 'pushable0', type: 'pushable', data: { col: 5, row: 3, ... } }
        6.1.2. createEntityCreator(entityDef, player, levelData):
               a. case 'pushable': (NEW — to be added)
               b. const movedEntry = levelState.movedEntities.find(e => e.id === 'pushable0')
               c. movedEntry found: { id: 'pushable0', col: 6, row: 3 }
               d. spawnCol = movedEntry.col = 6
               e. spawnRow = movedEntry.row = 3
               f. return () => createPushableEntity({ col: 6, row: 3, ... })
   6.2. Entity created at persisted position (6,3) instead of JSON position (5,3)
```

### Verification Points

- ✅ **Step 1.3**: WorldState updated synchronously — no async gap
- ✅ **Step 3.2**: movedEntities included in serialization (it's part of LevelState)
- ✅ **Step 6.1.2.c**: movedEntities lookup by entity ID — unique IDs guaranteed by EntityLoader validation

### ⚠️ CONCERN: LevelState Type Missing movedEntities

**Location**: Step 1.3.1

The current `LevelState` type in `src/systems/WorldState.ts` does NOT have `movedEntities`. The design adds it, but `getLevelState()` creates default objects without `movedEntities`. The design addresses this with `??= []` fallback.

**Verification**: The design's `getLevelState()` modification adds:
```typescript
this.worldState.levels[levelName].movedEntities ??= [];
```

This handles:
1. New levels (created by getLevelState) — gets empty array
2. Old saves loaded from JSON — missing field gets empty array
3. Existing levels with movedEntities — preserved

**Verdict**: ✅ Backward compatibility handled correctly.

### ⚠️ CONCERN: Save File Format

**Location**: WorldState serialization

The `WorldState` type definition in `WorldState.ts` defines the levels object inline without `movedEntities`. The design adds it to `LevelState` type. When serialized to JSON, the new field will be included. When old saves are loaded, the field will be missing but the `??= []` fallback handles it.

**Verdict**: ✅ No violation. Backward compatible.

---

## Flow 7: Pushable Spawn with Persistence (Level Load with movedEntities)

### Execution Trace

```
State: Loading a level that has pushable0 at JSON position (5,3)
       WorldState has movedEntities: [{ id: 'pushable0', col: 8, row: 3 }]

1. EntityLoader.loadEntities(levelData, player):
   1.1. Validate unique IDs — 'pushable0' is unique ✓
   1.2. Check suppressOnAnyFlag — none for pushable ✓
   1.3. Check destroyedEntities — 'pushable0' not destroyed ✓
   1.4. Check createOnAnyEvent/createOnAllEvents — none ✓
   1.5. createEntityCreator(entityDef, player, levelData):
        a. case 'pushable':
        b. levelState = worldState.getLevelState(levelName)
        c. movedEntry = levelState.movedEntities.find(e => e.id === 'pushable0')
        d. movedEntry = { id: 'pushable0', col: 8, row: 3 }
        e. spawnCol = 8, spawnRow = 3
        f. return () => createPushableEntity({ col: 8, row: 3, ... })
   1.6. const entity = creatorFunc()
   1.7. createPushableEntity executes:
        a. grid.cellToWorld(8, 3) → world position
        b. TransformComponent at (8,3) center
        c. SpriteComponent created
        d. GridPositionComponent(8, 3, ...) — tracks cell (8,3)
        e. GridCollisionComponent(grid) — will register as occupant
        f. GridCellBlocker() — blocks movement
        g. PushableComponent({ spawnCol: 8, spawnRow: 3, ... })
   1.8. entity.levelName = levelData.name
   1.9. entityManager.add(entity)

2. First frame update:
   2.1. Pushable entity updates
   2.2. GridCollisionComponent.update():
        2.2.1. Registers pushable as occupant in cell (8,3)
        2.2.2. Updates currentCell to (8,3)
   2.3. Pathfinder queries cell (8,3) → finds GridCellBlocker → blocked ✓
```

### Verification Points

- ✅ **Step 1.5.e**: Persisted position overrides JSON position
- ✅ **Step 1.7.d**: GridPositionComponent initialized with persisted col/row
- ✅ **Step 1.7.g**: PushableComponent.spawnCol/spawnRow set to persisted position

### ⚠️ CONCERN: spawnCol/spawnRow Semantics

**Location**: Step 1.7.g

The design passes `spawnCol: 8, spawnRow: 3` (the persisted position) to PushableComponent. But the field name `spawnCol/spawnRow` suggests the ORIGINAL spawn position from JSON. Looking at the design more carefully:

In the factory: `spawnCol: props.col, spawnRow: props.row` — these are the col/row passed to the factory, which is the persisted position.

But PushableComponent stores `spawnCol/spawnRow` for... what purpose? Looking at the design, these fields are stored but not used for any runtime logic in v1. They could be used for a "reset to original position" feature later.

**Issue**: If `spawnCol/spawnRow` is meant to be the ORIGINAL JSON position (for reset), then passing the persisted position is wrong. If it's meant to be the current spawn position, it's fine.

**Verdict**: ⚠️ Minor ambiguity. The design should clarify whether `spawnCol/spawnRow` represents the original JSON position or the effective spawn position. For v1 this has no runtime impact since the fields aren't used for logic. But for future "reset pushable" features, the original JSON position should be preserved separately.

**Recommended Clarification**: Pass original JSON col/row as spawnCol/spawnRow, and use the persisted col/row only for the entity's actual position:
```typescript
return () => createPushableEntity({
  col: spawnCol,        // persisted or JSON position (where to actually place it)
  row: spawnRow,
  spawnCol: data.col,   // always the original JSON position
  spawnRow: data.row,
  ...
});
```

---

## Lifecycle Ownership Table

| Resource | Created By | Destroyed By | Lifetime | Used By |
|----------|-----------|--------------|----------|---------|
| Pushable Entity | EntityLoader / createPushableEntity() | Entity.destroy() on level unload | Level | Grid, CollisionSystem, PlayerPushState |
| TransformComponent | createPushableEntity() | Entity.destroy() | Entity | SpriteComponent, PushableComponent, GridCollisionComponent |
| SpriteComponent | createPushableEntity() | Entity.destroy() → onDestroy() | Entity | Renderer |
| ShadowComponent | createPushableEntity() | Entity.destroy() → onDestroy() | Entity | Renderer |
| GridPositionComponent | createPushableEntity() | Entity.destroy() | Entity | GridCollisionComponent, CollisionSystem |
| GridCollisionComponent | createPushableEntity() | Entity.destroy() → onDestroy() removes occupants | Entity | Grid occupant tracking |
| GridCellBlocker | createPushableEntity() | Entity.destroy() | Entity | canMoveTo(), Pathfinder |
| PushableComponent | createPushableEntity() | Entity.destroy() | Entity | PlayerPushState |
| CollisionComponent | createPushableEntity() | Entity.destroy() | Entity | CollisionSystem |
| Grid cell occupant entry | GridCollisionComponent.update() + PushableComponent.startMove() | GridCollisionComponent.onDestroy() + PushableComponent.startMove() | Dynamic | Pathfinder, canMoveTo(), CollisionSystem |
| movedEntities entry | PlayerPushState (after push) | Never (persists in save) | Save file | EntityLoader on spawn |
| PlayerPushState | Player StateMachine | StateMachine.enter(other state) | Player state | Player entity |
| Push icon override | PlayerPushState.onEnter() | PlayerPushState.disengage() | Push state | AttackButtonComponent |
| push_lean animations | PlayerEntity creation (animation map) | Never (global) | Global | AnimationSystem |
| push_icon texture | AssetRegistry / preload | Scene shutdown | Scene | AttackButtonComponent |

### Ownership Violations

**Grid cell occupant entry** — ❌ DUAL OWNERSHIP (see Flow 2 violation)
- Created by: GridCollisionComponent.update() AND PushableComponent.startMove()
- Destroyed by: GridCollisionComponent.onDestroy() AND PushableComponent.startMove()
- Both systems read and write the same grid occupant data
- Fix: Single owner during moves (disable GridCollisionComponent, or don't manually manage occupants)

All other resources have clear single ownership. ✅

---
