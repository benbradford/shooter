# Failure Analysis: Pushable Objects

## Summary

| Criterion | Status |
|-----------|--------|
| Edge cases handled | ✅ PASS |
| Timing attacks don't crash | ⚠️ PASS with notes |
| Resource stress stable | ✅ PASS |
| Invalid states fail gracefully | ⚠️ PASS with notes |
| Recovery paths defined | ✅ PASS |

**Overall: PASS**

**Risk summary:** 0 critical, 1 high, 3 medium, 2 low

---

## Scenario 1: Push Into Every Blocker Type

### Attack

Push a pushable toward each blocker type and verify `isPushBlocked()` rejects every one.

| Target Cell | `isPushBlocked` Check | Covered? |
|---|---|---|
| Wall | `grid.isWall(cell)` | ✅ |
| Water (no bridge) | `cell.properties.has('water') && !cell.properties.has('bridge')` | ✅ |
| Platform | `cell.properties.has('platform')` | ✅ |
| Stair/transition | `grid.isTransition(cell)` | ✅ |
| Another pushable | `occupant.get(GridCellBlocker)` | ✅ |
| Entity with GridCellBlocker (breakable, bug base) | `occupant.get(GridCellBlocker)` | ✅ |
| Out of bounds | `!cell` (null check) | ✅ |
| Blocked area polygon | `blockedAreaManager.getBlockedCells().has(cellKey)` | ✅ |
| Different layer | `grid.getLayer(cell) !== pushableLayer` | ✅ |

### Expected Behavior

Push animation plays (player strains), pushable does not move, player stays in push state.

### Actual Behavior (from design)

All blocker types are explicitly checked in `isPushBlocked()`. The function returns `true` for each case, `tryPush()` plays the strain animation and returns without calling `startMove()`.

### Risk Level

LOW

### Verdict

✅ All blocker types covered. The occupant loop catches any entity with `GridCellBlocker`, which is a good catch-all for future entity types.

---

## Scenario 2: Rapid Button Mashing During Push

### Attack

Player enters contact phase and mashes the attack button rapidly (10 presses in 1 second).

### Expected Behavior

Only one push executes at a time. Subsequent presses are ignored until the current cell move completes.

### Actual Behavior (from design)

`tryPush()` is only called from `onUpdate` when `phase === 'contact'`. Once `tryPush()` succeeds, `phase` becomes `'pushing'`, and `onUpdate` switches to the pushing branch which interpolates position — it does NOT check the attack button for new pushes. The attack button is only re-checked after `pushableComponent.getIsMoving() === false`, at which point the move is complete.

**Sequence:**
```
Frame 1: phase='contact', button pressed → tryPush() → phase='pushing'
Frame 2: phase='pushing', button pressed → ignored (pushing branch runs)
Frame 3: phase='pushing', button pressed → ignored
...
Frame N: pushable arrives → getIsMoving()=false → check button → if held, tryPush() again
```

### Risk Level

LOW

### Verdict

✅ Safe. The phase gate (`'contact'` vs `'pushing'`) acts as a natural lock. No double-push possible.

---

## Scenario 3: Push + Damage Simultaneously

### Attack

Player is mid-push (pushable sliding between cells) and gets hit by an enemy projectile.

### Expected Behavior

Current cell move completes (neither player nor pushable left between cells), then player disengages and takes damage normally.

### Actual Behavior (from design)

**Contact phase damage:** `onUpdate` checks `health.getHealth() < lastKnownHealth` → calls `disengage()` immediately → transitions to `idle`. The `CollisionComponent.onHit` on PlayerEntity handles the actual damage (takeDamage, hitFlash, or death). This works because `disengage()` re-enables WalkComponent and transitions to idle before the next frame.

**Pushing phase damage:** `onUpdate` detects health decrease → sets `damagePending = true` → current move continues interpolating → when `getIsMoving() === false`, `disengage()` is called.

**⚠️ Potential issue — death during push:**

The `CollisionComponent.onHit` callback on PlayerEntity calls `sm.stateMachine.enter('death')` when health reaches 0. The `StateMachine.enter()` method has a guard: `if (this.currentKey === key) return`. But if the player is in `'push'` state and `onHit` fires, it will call `enter('death')` directly — bypassing `PlayerPushState.disengage()`.

**What happens:**
1. `onHit` fires → `health.takeDamage()` → health = 0
2. `onHit` calls `sm.stateMachine.enter('death')` immediately
3. `StateMachine.enter('death')` calls `PlayerPushState.onExit()` (if it exists) then enters `PlayerDeathState`
4. `PlayerPushState` never calls `disengage()` — WalkComponent stays disabled, icon override stays set

### Risk Level

**HIGH** — Death during push skips cleanup.

### Mitigation

Add `onExit()` to `PlayerPushState` that performs cleanup:

```typescript
onExit(): void {
  const walk = this.entity.require(WalkComponent);
  walk.setEnabled(true);
  const attackButton = joystick.get(AttackButtonComponent);
  attackButton?.setIconOverride(null);
}
```

This ensures cleanup runs regardless of whether exit happens via `disengage()` or a forced state transition (death). The `disengage()` method becomes redundant for cleanup but still handles the "wait for move to complete" logic during the pushing phase.

**Additional concern:** If death triggers mid-push, the pushable is still interpolating between cells. `PlayerDeathState` doesn't know about the pushable. The pushable's `PushableComponent.update()` will continue interpolating via the ECS update loop and arrive at the target cell normally — this is safe because the grid occupant was already updated at move start. The visual interpolation completing independently is acceptable.

---

## Scenario 4: Push + Level Transition (Push Near Exit)

### Attack

1. Push a pushable so it lands on or adjacent to a level exit trigger cell.
2. Player follows behind the pushable into the cell the pushable vacated — could this cell be a trigger cell?
3. Push a pushable while another entity triggers a level transition event.

### Expected Behavior

Pushable cannot be pushed onto a transition cell. Level transitions during push complete safely.

### Actual Behavior (from design)

**Push onto exit/transition cell:** `isPushBlocked()` checks `grid.isTransition(cell)` and returns `true`. Pushables cannot be pushed onto stair or transition cells. ✅

**Player follows into trigger cell:** After a push, the player moves into the cell the pushable vacated. If that cell happens to be a level exit trigger zone, the player is in `PlayerPushState` with input locked. Level exit triggers fire via `LevelExitComponent` which listens for events from `EventManagerSystem`. The trigger entity checks overlap with the player's `GridPositionComponent`. Since the player IS moving into that cell, the trigger could fire.

**⚠️ Potential issue:** If the player follows the pushable into a trigger cell, the level exit event fires. `GameScene.startLevelTransition()` disables input and starts a 500ms fade. Meanwhile `PlayerPushState` is still active. The scene then transitions to `LoadingScene`, destroying all entities. This is actually safe because:
- The scene transition destroys everything (entities, components, the state machine)
- No cleanup is needed since the entire scene is being torn down
- `startLevelTransition` disables input first, preventing further pushes

**Push during externally-triggered transition:** If another entity triggers a level transition while the player is mid-push, `startLevelTransition()` runs the same fade+destroy sequence. The pushable's interpolation continues during the 500ms fade (cosmetic only) and everything is destroyed when the scene switches.

### Risk Level

MEDIUM — The player following into a trigger cell is an edge case level designers should be aware of.

### Mitigation

Level designers should avoid placing level exit triggers directly behind pushable objects. Document this as a level design guideline. No code change needed — the system handles it safely, but the gameplay result (accidental level exit while pushing) may be undesirable.

---

## Scenario 5: Multiple Pushables Adjacent

### Attack

1. Two pushables side by side: push one into the other.
2. Three pushables in a row: push the first toward the other two.
3. Push a pushable, then immediately walk to an adjacent pushable and try to push it.

### Expected Behavior

No chain pushing. Push into another pushable is blocked. Player can disengage and push a different pushable.

### Actual Behavior (from design)

**Push into another pushable:** `isPushBlocked()` iterates `cell.occupants` and checks for `GridCellBlocker`. The second pushable has `GridCellBlocker`, so the push is blocked. Player sees strain animation. ✅

**Chain push attempt:** Design explicitly states "No chain pushing: another pushable's GridCellBlocker blocks the destination." ✅

**Sequential push of different pushables:** Player disengages (joystick input), walks to adjacent pushable, `PlayerWalkState` detects new pushable contact, enters `PlayerPushState` with new target. Each push state instance stores its own `pushableEntity` reference. ✅

**⚠️ Edge case — pushable moved away during contact phase:** Player is in contact with pushable A. Another system (hypothetical future feature) moves pushable A away. `PlayerPushState` still holds a reference to pushable A. On `tryPush()`, it calculates the destination based on pushable A's current position. If pushable A moved, the destination validation runs against the new position. This is safe — the push either succeeds at the new location or fails validation.

### Risk Level

LOW

### Verdict

✅ The `GridCellBlocker` occupant check handles all adjacent-pushable scenarios correctly. No chain pushing is possible.

---

## Scenario 6: Pushable on Layer Boundary

### Attack

1. Place a pushable on a cell adjacent to a layer transition (stairs).
2. Push it toward the transition cell.
3. Push it toward a cell on a different layer.
4. Place a pushable on a transition cell itself (editor placement).

### Expected Behavior

Pushable cannot cross layers or enter transition cells.

### Actual Behavior (from design)

**Push toward transition cell:** `isPushBlocked()` checks `grid.isTransition(cell)` → returns `true`. Blocked. ✅

**Push toward different layer:** `isPushBlocked()` checks `grid.getLayer(cell) !== pushableLayer` → returns `true`. Blocked. ✅

**Pushable placed ON a transition cell in editor:** The `PushableComponent` constructor reads the layer from the spawn cell: `grid.getLayer(spawnCell)`. Transition cells have a layer value. The pushable's `layer` is set to that value. If the player then tries to push it, `isPushBlocked()` checks the target cell's layer against `pushableLayer`. If the target is on the same layer as the transition cell, the push succeeds. If the target is a different layer, it's blocked.

**⚠️ Concern:** A pushable placed on a transition cell could be pushed onto a non-transition cell of the same layer, which is fine. But the pushable itself sits on a transition cell, which is a stair — visually odd. This is a level design issue, not a code bug.

### Risk Level

LOW

### Verdict

✅ Layer checks are solid. The `pushableLayer` is fixed at spawn time and never changes, which prevents any layer-crossing exploits. Transition cells are always blocked as destinations.

---

## Scenario 7: pushEnabled=false Interaction

### Attack

1. Walk into a pushable with `pushEnabled: false`.
2. Mash attack button while adjacent to a disabled pushable.
3. Push a pushable, then hypothetically toggle `pushEnabled` to false mid-push (future feature).

### Expected Behavior

Disabled pushables behave like breakables — block movement, block projectiles, but no push interaction.

### Actual Behavior (from design)

**Contact detection:** In `PlayerWalkState.onUpdate()`, the detection code checks `pushable?.pushEnabled` before entering push state. If `pushEnabled` is `false`, the condition fails and no state transition occurs. The player slides along the pushable as if it were a wall. ✅

**Attack button near disabled pushable:** Player stays in `walk` or `idle` state. Attack button triggers normal punch/attack combo via `handlePunchInput()`. ✅

**Toggle mid-push (future):** `pushEnabled` is `readonly` in the current design. If a future feature makes it mutable, toggling it during a push would have no effect because `PlayerPushState` doesn't re-check `pushEnabled` after entering. The current push would complete. This is acceptable behavior — the toggle would take effect on the next push attempt.

### Risk Level

LOW

### Verdict

✅ The `pushEnabled` check is in the right place (contact detection) and the `readonly` modifier prevents runtime mutation in v1.

---

## Scenario 8: Persistence Edge Cases

### Attack

1. Push a persistent pushable 3 cells, leave level, return — does it spawn at the last pushed position?
2. Push a non-persistent pushable, leave level, return — does it reset?
3. Push a persistent pushable, die, respawn — does the position persist or reset?
4. Push a persistent pushable, save, reload game — does position survive?
5. Load an old save file that has no `movedEntities` field.

### Expected Behavior

Persistent pushables remember position across level transitions. Non-persistent ones reset. Death reloads the level entry snapshot.

### Actual Behavior (from design)

**Persistent push + leave + return:** Each successful push calls `worldStateManager.updateMovedEntity(levelName, entityId, col, row)`. On re-entry, `EntityLoader` checks `levelState.movedEntities.find(e => e.id === entityDef.id)` and uses the persisted col/row. ✅

**Non-persistent push + leave + return:** `doesPersist` is `false`, so `updateMovedEntity` is never called. No entry in `movedEntities`. EntityLoader uses JSON-defined col/row. ✅

**⚠️ Push + death + respawn:** `PlayerDeathState.reloadLevel()` calls `GameScene.reloadCurrentLevel()`, which restores `this.levelEntrySnapshot` — a JSON snapshot of WorldState taken when the level was entered. This snapshot was taken BEFORE any pushes in this session. So `movedEntities` reverts to the state when the player entered the level.

This means: if you enter a level, push a persistent pushable 3 cells, then die — the pushable resets to where it was when you entered the level (not the JSON default, but the last-saved position from a previous visit). This is correct and expected behavior for a death-rollback system. ✅

**Save + reload:** `worldStateManager.saveToFile()` serializes the entire `WorldState` including `movedEntities`. On reload, `loadFromFile()` restores it. ✅

**Old save without movedEntities:** `getLevelState()` uses `movedEntities ??= []` to initialize missing field. EntityLoader's `find()` on an empty array returns `undefined`, falling back to JSON defaults. ✅

### Risk Level

MEDIUM — The death-rollback behavior is correct but could surprise players who pushed a persistent object far and then died.

### Mitigation

This is working as designed (death rolls back to level entry state). No code change needed. Consider documenting this behavior for level designers so they can account for it in puzzle design.

---

## Scenario 9: Entity Spawns on Pushable's Cell Mid-Push

### Attack

1. A bug base spawns a bug entity on the cell the pushable is moving INTO (target cell).
2. An event-triggered entity (`createOnAnyEvent`) spawns on the pushable's current cell during a push.
3. A projectile spawns at the pushable's position during a push.

### Expected Behavior

No two GridCellBlocker entities occupy the same cell. Projectiles interact via CollisionComponent, not grid occupancy.

### Actual Behavior (from design)

**Bug spawns on target cell:** `PushableComponent.startMove()` calls `grid.addOccupant(targetCol, targetRow, entity)` at move START. The pushable is registered in the target cell immediately. When the bug base tries to spawn a bug, `BugEntity` creation checks for valid spawn cells. The pathfinder's `getValidNeighbor()` checks occupants for `GridCellBlocker` — the pushable's blocker is already there. The bug cannot spawn on that cell. ✅

**Event-triggered entity spawns on pushable's source cell:** After `startMove()`, the source cell is freed via `grid.removeOccupant(sourceCol, sourceRow, entity)`. A new entity could spawn there. This is fine — the pushable has vacated that cell. The player is following into it, but the player doesn't have `GridCellBlocker`. If the spawned entity has `GridCellBlocker`, the player's `GridCollisionComponent` will block the player from entering. This would leave the player stuck mid-interpolation.

**⚠️ Potential issue:** The player's position during push is interpolated by `PlayerPushState`, NOT by `WalkComponent` + `GridCollisionComponent`. The player's `GridCollisionComponent` is effectively bypassed during push (WalkComponent is disabled). So if an entity spawns on the cell the player is moving into, the player will overlap with it because `PlayerPushState` doesn't check for new blockers mid-move.

### Risk Level

MEDIUM — Requires a specific timing coincidence (event-triggered spawn on the exact cell the player is following into, during the ~640ms push window).

### Mitigation

This is an extremely unlikely edge case in practice. Event-triggered spawns are level-designer controlled and predictable. If this becomes a real concern, `PlayerPushState` could check the follow-target cell for new occupants after the move completes and force a disengage if blocked. For v1, document as a known limitation.

---

## Scenario 10: Player Death During Push

### Attack

1. Player is in contact phase and takes lethal damage.
2. Player is mid-push (pushable sliding) and takes lethal damage.
3. Player is mid-push, takes non-lethal damage, then takes lethal damage before move completes.

### Expected Behavior

Player dies cleanly. Pushable ends up in a valid cell. No leaked state (disabled walk, stuck icon).

### Actual Behavior (from design)

**Death during contact phase:**
1. `CollisionComponent.onHit` fires → `health.takeDamage()` → health = 0
2. `onHit` calls `sm.stateMachine.enter('death')` immediately
3. `StateMachine.enter('death')` calls `PlayerPushState.onExit()` (if defined), then enters `PlayerDeathState`
4. `PlayerDeathState.onEnter()` disables WalkComponent and plays death animation

**⚠️ Issue (same as Scenario 3):** If `PlayerPushState` has no `onExit()`, the icon override is never cleared and WalkComponent re-enable is skipped. However, `PlayerDeathState.onEnter()` also disables WalkComponent, and the death sequence leads to `reloadCurrentLevel()` which destroys the entire scene. So the leaked state is destroyed with the scene.

**Death mid-push:**
1. `onHit` fires → health = 0 → `enter('death')` immediately
2. `PlayerPushState` is exited mid-push. The pushable's `PushableComponent.update()` continues running in the ECS loop because the pushable entity is independent of the player state machine.
3. The pushable completes its interpolation to the target cell. Grid occupancy is already correct (updated at move start).
4. `PlayerDeathState` plays death animation → fade → `reloadCurrentLevel()` → scene destroyed.

**Non-lethal then lethal mid-push:**
1. First hit: `PlayerPushState.onUpdate()` detects health decrease → `damagePending = true`
2. Second hit (before move completes): `onHit` fires → health = 0 → `enter('death')` immediately
3. Same as above — forced state transition, pushable finishes independently.

### Risk Level

MEDIUM — The `onExit()` cleanup gap is real but mitigated by scene destruction on death.

### Mitigation

Same as Scenario 3: implement `onExit()` on `PlayerPushState` for defensive cleanup. Even though death leads to scene destruction, `onExit()` is good practice and protects against future state transitions that don't destroy the scene (e.g., a future "stunned" state).

```typescript
onExit(): void {
  const walk = this.entity.require(WalkComponent);
  walk.setEnabled(true);
  const attackButton = joystick.get(AttackButtonComponent);
  attackButton?.setIconOverride(null);
}
```

---

## Risk Register

| # | Scenario | Risk | Level | Mitigation |
|---|----------|------|-------|------------|
| 3/10 | Death during push skips `disengage()` cleanup | WalkComponent stays disabled, icon override leaked | **HIGH** | Add `onExit()` to `PlayerPushState` for cleanup |
| 4 | Player follows pushable into trigger cell | Accidental level exit while pushing | MEDIUM | Level design guideline: no exit triggers behind pushables |
| 8 | Death rolls back persistent push progress | Player loses push progress on death | MEDIUM | Working as designed; document for level designers |
| 9 | Entity spawns on player's follow-target cell mid-push | Player overlaps with new entity | MEDIUM | Extremely unlikely; document as known limitation for v1 |
| 1 | All blocker types | — | LOW | All covered in `isPushBlocked()` |
| 2 | Rapid button mashing | — | LOW | Phase gate prevents double-push |

---

## Required Design Revision

### ❌ HIGH: Add `onExit()` to PlayerPushState

The design defines `disengage()` as the cleanup path but does not account for forced state transitions (death, future stun/freeze states) that bypass `disengage()`. The `StateMachine.enter()` method calls `onExit()` on the current state before entering the new one.

**Required change to design.md:**

Add `onExit()` method to `PlayerPushState`:

```typescript
onExit(): void {
  // Defensive cleanup — runs on ANY state exit, including forced transitions
  const walk = this.entity.require(WalkComponent);
  walk.setEnabled(true);
  const attackButton = joystick.get(AttackButtonComponent);
  attackButton?.setIconOverride(null);
  this.damagePending = false;
}
```

Update `disengage()` to only handle the "wait for move to complete" logic:

```typescript
disengage(): void {
  if (this.phase === 'pushing') {
    this.damagePending = true;
    return; // onUpdate will transition to idle when move finishes
  }
  const sm = this.entity.require(StateMachineComponent);
  sm.stateMachine.enter('idle');
  // cleanup happens in onExit()
}
```

This ensures cleanup runs regardless of exit path.

---

## Confidence Level

**HIGH** — The pushable design is well-structured. The grid occupant update at move start (not end) is the key insight that prevents most race conditions. The single HIGH risk (missing `onExit()`) is straightforward to fix. All other scenarios are handled by existing systems (GridCellBlocker, isPushBlocked, phase gating).
