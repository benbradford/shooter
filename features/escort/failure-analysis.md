# Failure Analysis: Escort Entity

## Attack Scenarios Tested

1. Rapid level transitions while escort is following
2. Player awakens escort then immediately exits level
3. Multiple events fire simultaneously (awakeOnEvent + enemy detection)
4. Escort pathfinding fails (no path to player or destination)
5. Player dies during escort awakening animation
6. Destination cell becomes blocked after escort starts walking to it
7. Player enters a level NOT in followToLevels while escort is active
8. Two escorts in different levels (edge case with current_escort flag)
9. Escort spawns on player cell but player never moves off
10. Level transition during escort completion animation

---

## Scenario 1: Rapid Level Transitions While Escort Is Following

### Attack

Player enters an exit cell, triggering `startLevelTransition()`. During the 500ms fade-out delay, the player (or a second trigger) fires another transition. The escort is in `following` state and `current_escort` is set.

```
Frame 0: Player steps on exit → startLevelTransition("level2")
Frame 1: 500ms fade timer starts, input disabled
Frame 500: LoadingScene.init() → entityManager.destroyAll() → EscortComponent.onDestroy()
Frame 501: LoadingScene starts game scene for level2
Frame 502: spawnCrossLevelEscort() reads current_escort → spawns escort
```

### Expected Behavior

Only one transition executes. Escort is destroyed cleanly in old scene, reconstructed in new scene.

### Actual Behavior (from design)

The existing `startLevelTransition()` disables player input (`input.setEnabled(false)`) during the fade, which prevents the player from walking onto another exit cell. The `LevelExitComponent` is event-driven (trigger cell), so without player movement, no second exit fires.

However, `startLevelTransition()` has **no transition lock**. If two exits fire in the same frame (player on two overlapping trigger cells, or a Lua script calls transition), both would execute. The second `scene.start('LoadingScene')` would overwrite the first.

The escort itself is fine — `entityManager.destroyAll()` in `LoadingScene.init()` destroys it once. `onDestroy()` deregisters the event listener only if dormant. In non-dormant states, there's nothing to clean up. The `current_escort` flag persists in WorldState, so the escort reconstructs correctly in the target level.

### Risk Level

**LOW** — Input is disabled during fade, making double-transition very hard to trigger in normal gameplay. The escort design itself handles this correctly via WorldState persistence.

### Mitigation

None needed for the escort specifically. The existing input-disable during fade is sufficient. A general transition lock in `startLevelTransition()` would be a defense-in-depth improvement but is outside the escort feature scope.

---

## Scenario 2: Player Awakens Escort Then Immediately Exits Level

### Attack

```
Frame 0: awakeOnEvent fires → EscortComponent.onEvent()
  - state = 'awakening'
  - current_escort = entityId (WorldState flag SET)
  - persistEscortDefinition() writes all flags
  - Event listener deregistered
Frame 1: Player steps on exit cell → startLevelTransition()
Frame 2-500: Fade out (escort still in 'awakening' state, animation playing)
Frame 501: LoadingScene.init() → entityManager.destroyAll()
  - EscortComponent.onDestroy() → state !== 'dormant', no deregister needed
Frame 502: New level loads
Frame 503: spawnCrossLevelEscort() reads current_escort → finds entityId
  - Reads escort_{id}_follow_to_levels → checks if new level is in list
  - If yes: spawns escort in 'waiting_for_player_move' state
```

### Expected Behavior

Escort awakening is interrupted but WorldState flags are already set. Escort appears in the new level in following state (skipping the rest of the awakening animation).

### Actual Behavior (from design)

This works correctly. The critical WorldState flags (`current_escort`, all `escort_{id}_*` definition flags) are set **synchronously in `onEvent()`** before any frame updates. The awakening animation is cosmetic — interrupting it loses nothing. The escort reconstructs in the new level via `spawnCrossLevelEscort()` in `waiting_for_player_move` state, which transitions to `following` when the player moves.

### Risk Level

**LOW** — Degrades gracefully. Player misses the stand-up animation but escort functionality is preserved.

### Mitigation

None needed. Design handles this correctly.

---

## Scenario 3: Multiple Events Fire Simultaneously (awakeOnEvent + Enemy Detection)

### Attack

```
Frame N: EventManagerSystem delivers awakeOnEvent
  → EscortComponent.onEvent() fires
  → state changes from 'dormant' to 'awakening'
  → Event listener deregistered

Same frame N: EscortComponent.update() runs
  → switch(this.state) hits 'awakening' case
  → updateAwakening() checks if animation is on last frame (it's not — just started)
  → Returns without issue

Enemy detection: checkEnemies() is only called in 'following' and 'walking_to_destination' states
  → NOT called during 'awakening'
```

### Expected Behavior

Awakening takes priority. Enemy detection doesn't interfere until escort reaches `following` state.

### Actual Behavior (from design)

Safe. The state machine is sequential within a single frame:
1. `onEvent()` runs first (event delivery happens before component updates in the ECS loop)
2. `update()` runs after, sees `state === 'awakening'`, calls `updateAwakening()`
3. `checkEnemies()` is only called from `following` and `walking_to_destination` states

Even if event delivery and update happen in the same frame, the state transition in `onEvent()` is synchronous, so `update()` always sees the new state.

**Edge case**: What if `awakeOnEvent` fires while the escort is already in `following` state (e.g., event fires twice)? The `onEvent()` guard `if (this.state !== 'dormant') return;` handles this — the second event is ignored.

### Risk Level

**LOW** — State machine guards prevent conflicting transitions.

### Mitigation

None needed. Design handles this correctly.

---

## Scenario 4: Escort Pathfinding Fails (No Path to Player or Destination)

### Attack

```
Scenario A: Player is on a different layer or behind walls with no path
  → recalculatePathToPlayer() returns null
  → this.path = null

Scenario B: Destination cell is completely walled off
  → checkDestinationReachable() tries destination cell → null
  → findPathToAdjacentCell() tries adjacent cells → all null
  → Returns false (stays in 'following')

Scenario C: Player teleports to unreachable area, escort is >800px away
  → Teleport triggers (dist > TELEPORT_DISTANCE_PX)
  → Escort teleports to player position (which may be inside walls)
```

### Expected Behavior

Escort idles in place when no path exists. Never clips through walls.

### Actual Behavior (from design)

**Scenario A**: Handled correctly. `updateFollowing()` checks `if (this.path && this.path.length > 0)` — when path is null, it falls through to the else branch which plays idle animation. Escort stays put.

**Scenario B**: Handled correctly. `checkDestinationReachable()` returns false when no path exists, so escort stays in `following` state. The adjacent-cell fallback provides additional robustness.

**Scenario C**: **Potential issue.** The teleport sets `transform.x = playerTransform.x; transform.y = playerTransform.y` directly, which could place the escort inside a wall. However, the escort has `GridCollisionComponent` for wall avoidance but **no `GridCellBlocker`** — it's walk-through. The `GridCollisionComponent` only affects pathfinding movement, not direct position sets. After teleport, the next pathfinding recalc would find a valid path from the new position (or fail and idle).

In practice, the player can't be inside a wall (player has collision), so teleporting to the player's position is safe. The escort ends up at a valid player position.

### Risk Level

**LOW** — Pathfinding failure degrades to idle. Teleport targets player position which is always valid.

### Mitigation

None needed. The design's fallback behavior (idle on no path, teleport to player) is correct.

---

## Scenario 5: Player Dies During Escort Awakening Animation

### Attack

```
Frame 0: awakeOnEvent fires → state = 'awakening', current_escort = entityId, flags persisted
Frame 10: Player takes lethal damage → health reaches 0
Frame 11: Death system triggers → reloadCurrentLevel()
  → levelEntrySnapshot restored (if it exists)
  → startLevelTransition(currentLevel, spawnCol, spawnRow)
Frame 500: LoadingScene.init() → entityManager.destroyAll()
Frame 501: Level reloads
Frame 502: EntityLoader case 'escort' checks WorldState:
  - Was levelEntrySnapshot captured BEFORE or AFTER awakening?
```

### Expected Behavior

If awakened during this visit, escort reverts to dormant. If already active on entry, escort stays active.

### Actual Behavior (from design)

**Critical finding:** The `levelEntrySnapshot` field is declared (`private levelEntrySnapshot: string | null = null;`) but **never assigned** in the current codebase. The `reloadCurrentLevel()` method checks `if (this.levelEntrySnapshot)` but it's always null.

This means on death:
1. `levelEntrySnapshot` is null → fallback branch runs: `worldState.setPlayerHealth(PLAYER_MAX_HEALTH)`
2. WorldState flags are **NOT rolled back** — `current_escort` remains set to the escort's ID
3. Level reloads → EntityLoader sees `current_escort === entityId` → spawns escort in `following` state

**Result:** If the player dies after awakening the escort, the escort stays awakened on reload instead of reverting to dormant. This is actually **acceptable behavior** for gameplay (the escort was awakened, death doesn't undo that). The requirements doc says "Death on origin level: escort reverts to dormant if awakened during this visit" but this relies on `levelEntrySnapshot` which isn't implemented yet.

**If/when `levelEntrySnapshot` is implemented:** The snapshot would be taken at level entry (before awakening), so restoring it would clear `current_escort` and all `escort_{id}_*` flags, correctly reverting the escort to dormant.

### Risk Level

**MEDIUM** — The escort doesn't crash or corrupt state, but the death-rollback behavior described in R9 won't work until `levelEntrySnapshot` is implemented. The escort will stay awakened after death, which is a gameplay inconsistency with the requirements but not a crash.

### Mitigation

**Required:** Implement `levelEntrySnapshot` capture at the start of `initializeScene()`:
```typescript
this.levelEntrySnapshot = worldState.serializeToJSON();
```

This is a pre-existing gap in the codebase, not specific to the escort feature. The escort design correctly relies on this mechanism — it just needs to be wired up.

---

## Scenario 6: Destination Cell Becomes Blocked After Escort Starts Walking To It

### Attack

```
Frame 0: Escort in 'following' state, destination is reachable
  → checkDestinationReachable() returns true
  → state = 'walking_to_destination', path calculated
Frame 50: A pushable block is pushed onto the destination cell
Frame 51: updateWalkingToDestination() runs
  → pathRecalcTimerMs >= PATH_RECALC_MS → recalculatePathToDestination()
  → Pathfinder can't reach destination cell (blocked by pushable)
  → path = null
Frame 52: updateWalkingToDestination() → path is null → no movement
  → Escort idles at current position
Frame 53+: PATH_RECALC_MS elapses → recalculates again → still blocked → still idle
```

### Expected Behavior

Escort stops and waits, or walks to nearest reachable cell adjacent to destination.

### Actual Behavior (from design)

**Partial issue.** The `checkDestinationReachable()` method has adjacent-cell fallback logic (`findPathToAdjacentCell`), but `recalculatePathToDestination()` (called during `walking_to_destination` state) is not shown in the design with the same fallback. Looking at the design:

- `checkDestinationReachable()` tries destination, then adjacent cells ✓
- `updateWalkingToDestination()` recalculates path periodically but the `recalculatePathToDestination()` method isn't fully specified in the design

If `recalculatePathToDestination()` only targets the exact destination cell (no adjacent fallback), the escort would idle indefinitely when the destination becomes blocked mid-walk.

However, the arrival check uses `distToDest < 8` (pixel distance to destination center). If the escort reaches an adjacent cell, it won't trigger completion because it's not close enough to the destination center.

**Worse case:** If the destination is permanently blocked, the escort is stuck in `walking_to_destination` with no path, idling forever. It won't revert to `following` because there's no "give up" transition from `walking_to_destination` back to `following`.

### Risk Level

**MEDIUM** — Escort gets stuck in `walking_to_destination` state with no recovery path. Doesn't crash, but the escort becomes permanently non-functional (won't follow player, won't complete).

### Mitigation

**Required:** Add fallback logic to `recalculatePathToDestination()`:
1. Try exact destination cell first
2. If blocked, try adjacent cells (same as `checkDestinationReachable()`)
3. If no adjacent cell is reachable either, transition back to `following` state (give up on destination, resume following player)

```typescript
private recalculatePathToDestination(): void {
  // ... try destination cell, then adjacent cells ...
  if (!this.path) {
    // Destination became unreachable — fall back to following
    this.state = 'following';
  }
}
```

Also: the arrival check should accept adjacent cells if the exact destination is blocked (use the same `findPathToAdjacentCell` target as the arrival point).

---

## Scenario 7: Player Enters a Level NOT in followToLevels While Escort Is Active

### Attack

```
Frame 0: Escort is following in dungeon1, current_escort = "escort0"
  followToLevels = ["dungeon1", "dungeon2", "dungeon3"]
Frame 1: Player exits to "village1" (not in followToLevels)
Frame 2: LoadingScene destroys all entities (including escort)
Frame 3: village1 loads → spawnCrossLevelEscort() runs:
  → reads current_escort = "escort0" ✓
  → reads escort_escort0_follow_to_levels = "dungeon1,dungeon2,dungeon3"
  → checks if "village1" is in list → NO
  → returns (no escort spawned) ✓
Frame 4: Player plays village1 normally, no escort visible
Frame 5: Player exits village1 to dungeon2 (in followToLevels)
Frame 6: spawnCrossLevelEscort() → "dungeon2" IS in list → spawns escort ✓
```

### Expected Behavior

Escort doesn't appear in non-allowed levels. `current_escort` flag persists. Escort reappears when player enters an allowed level.

### Actual Behavior (from design)

Handled correctly. The `spawnCrossLevelEscort()` method checks `if (!allowedLevels.includes(this.currentLevelName)) return;` — escort is simply not spawned. The `current_escort` flag remains set in WorldState, so the escort reappears when the player enters an allowed level.

**Edge case:** What if the player dies in a non-allowed level? `reloadCurrentLevel()` reloads the same non-allowed level. `spawnCrossLevelEscort()` runs again, still returns early. `current_escort` flag persists (assuming no snapshot rollback). Escort reappears when player eventually reaches an allowed level. This is correct.

### Risk Level

**LOW** — Design handles this correctly.

### Mitigation

None needed.

---

## Scenario 8: Two Escorts in Different Levels (Edge Case with current_escort Flag)

### Attack

```
Level JSON:
  dungeon1 has escort0 (awakeOnEvent: "awake_knight1")
  dungeon3 has escort1 (awakeOnEvent: "awake_knight2")

Frame 0: Player awakens escort0 in dungeon1
  → current_escort = "escort0"
  → escort0 definition persisted to WorldState
Frame 100: Player travels to dungeon3 with escort0 following
Frame 101: escort0 spawned via cross-level mechanism in dungeon3
Frame 102: escort1 exists in dungeon3 JSON, spawned by EntityLoader
  → EntityLoader checks: current_escort === "escort1"? NO (it's "escort0")
  → escort1 spawns in 'dormant' state ✓
Frame 200: Player awakens escort1 in dungeon3
  → escort1.onEvent() fires
  → current_escort = "escort1" (OVERWRITES "escort0")
  → escort1 definition persisted
```

### Expected Behavior

Only one escort active at a time. Awakening escort1 should deactivate escort0.

### Actual Behavior (from design)

**Issue detected.** When `current_escort` is overwritten from `"escort0"` to `"escort1"`:
- escort0 is still alive in the EntityManager, still in `following` state
- escort0's `EscortComponent` doesn't monitor the `current_escort` flag — it has no mechanism to detect that it's been "deactivated"
- Both escorts would be active simultaneously in the same level
- escort0 would continue following the player
- On next level transition, `spawnCrossLevelEscort()` reads `current_escort = "escort1"` and only spawns escort1. escort0 is gone (destroyed with the old scene). But in the current level, both are active.

The requirements say "Only one active escort at a time" and "setting `current_escort` implicitly deactivates any previous escort." But the design has no mechanism for this implicit deactivation.

### Risk Level

**MEDIUM** — Two escorts following simultaneously in the same level. Doesn't crash, but violates the single-escort invariant. Self-corrects on next level transition (only the new escort spawns). The completion flow for escort0 would also fail — `updateCompleting()` would clear `current_escort` (which is now "escort1"), corrupting escort1's state.

### Mitigation

**Required:** When `onEvent()` sets `current_escort`, check if another escort is already active and deactivate it:

```typescript
onEvent(eventName: string): void {
  if (eventName !== this.awakeOnEvent) return;
  if (this.state !== 'dormant') return;

  // Deactivate any existing active escort in this scene
  const ws = WorldStateManager.getInstance();
  const previousEscortId = ws.getFlag('current_escort');
  if (previousEscortId) {
    const prev = this.entityManager.getAll().find(e => e.id === previousEscortId);
    if (prev) {
      const prevComp = prev.get(EscortComponent);
      if (prevComp) prevComp.forceComplete();
    }
  }

  this.state = 'awakening';
  // ... rest of awakening logic
}
```

Or simpler: add a `deactivate()` method that transitions the old escort to `completed` state (or a new `deactivated` state that behaves like `completed`).

---

## Scenario 9: Escort Spawns on Player Cell but Player Never Moves Off

### Attack

```
Cross-level spawn:
Frame 0: spawnCrossLevelEscort() → escort at player spawn cell, invisible
  → state = 'waiting_for_player_move'
  → playerSpawnCol/Row recorded

Player scenario: Player enters level, stands still indefinitely (AFK, reading dialogue, etc.)

Frame N: updateWaitingForPlayerMove() runs every frame
  → playerCell.col === playerSpawnCol && playerCell.row === playerSpawnRow
  → Condition false → returns
  → Escort remains invisible
```

### Expected Behavior

Escort stays invisible until player moves. No performance or state issues.

### Actual Behavior (from design)

Handled correctly. The `updateWaitingForPlayerMove()` check is lightweight (one grid cell comparison per frame). The escort is invisible (`setAlpha(0)`) and doesn't interact with anything. No performance concern.

**Edge case:** What if the player enters an interaction (cutscene) on the spawn cell without moving? The interaction system pauses entity updates (per requirements: "Pauses during interactions like all other entities"). When the interaction ends, the escort resumes checking. If the player hasn't moved, it stays invisible. If the interaction moved the player (e.g., teleport), the escort becomes visible. All correct.

**Edge case:** What if the player dies on the spawn cell without moving? `reloadCurrentLevel()` reloads the level. The escort is destroyed and re-created via `spawnCrossLevelEscort()` in the same `waiting_for_player_move` state. Correct.

### Risk Level

**LOW** — Degrades gracefully. Escort waits indefinitely with negligible cost.

### Mitigation

None needed.

---

## Scenario 10: Level Transition During Escort Completion Animation

### Attack

```
Frame 0: Escort arrives at destination cell
  → state = 'completing'
  → playAnim('arms_stretched')
  → raiseEvent('{entityId}_reached_destination')
Frame 1: The raised event triggers a Lua script that opens an exit / forces transition
  → startLevelTransition() called
Frame 2-500: Fade out. Escort still in 'completing' state, animation playing.
  → updateCompleting() runs each frame, checking isOnLastFrame('arms_stretched')
Frame 501: LoadingScene.init() → entityManager.destroyAll()
  → EscortComponent.onDestroy() → state !== 'dormant', no cleanup needed
  → BUT: WorldState flags NOT yet set (completion flags are set in updateCompleting()
    only when animation reaches last frame)
```

### Expected Behavior

Escort completion should be finalized before transition, or the incomplete state should be recoverable.

### Actual Behavior (from design)

**Issue detected.** The completion flags (`current_escort = ""`, `escort_{id}_completed = "true"`, etc.) are only set when the `arms_stretched` animation reaches its last frame in `updateCompleting()`. If a level transition interrupts the animation:

1. `current_escort` still equals the escort's entity ID
2. `escort_{id}_completed` is NOT set to `"true"`
3. On next level load, the system sees an active escort that hasn't completed
4. If the new level is in `followToLevels`, the escort spawns in `waiting_for_player_move` / `following` state — as if it never reached the destination

**Result:** The escort's completion is lost. The player would need to escort it back to the destination again.

**How likely?** The `{entityId}_reached_destination` event fires at the start of `completing` state. If a Lua script or trigger listens for this event and immediately transitions levels, the animation never completes. This is a designer-triggered scenario (the level designer would wire the event to an exit), so it's plausible.

### Risk Level

**HIGH** — Escort completion is silently lost. No crash, but the player loses progress on the escort quest. The escort reappears as if it never completed, which is confusing.

### Mitigation

**Required:** Set completion flags at the START of the `completing` state (when transitioning from `walking_to_destination`), not at the end of the animation:

```typescript
// When arriving at destination:
this.state = 'completing';
this.playAnim('arms_stretched');
this.eventManager.raiseEvent(`${this.entity.id}_reached_destination`);

// Set completion flags immediately (animation is cosmetic)
const ws = WorldStateManager.getInstance();
ws.setFlag('current_escort', '');
ws.setFlag(`escort_${this.entity.id}_completed`, 'true');
ws.setFlag(`escort_${this.entity.id}_completed_level`, this.currentLevelName);
ws.setFlag(`escort_${this.entity.id}_completed_col`, this.destinationCol);
ws.setFlag(`escort_${this.entity.id}_completed_row`, this.destinationRow);
```

The `completing` state then only manages the animation playback. If interrupted, the flags are already set. The `updateCompleting()` method just waits for the animation to finish and sets `state = 'completed'` (which is now purely cosmetic — the WorldState already reflects completion).

---

## Summary

| # | Scenario | Result | Risk |
|---|----------|--------|------|
| 1 | Rapid level transitions | ✅ Handled — input disabled during fade | LOW |
| 2 | Awaken then exit immediately | ✅ Handled — flags set synchronously | LOW |
| 3 | Simultaneous events | ✅ Handled — state guards prevent conflicts | LOW |
| 4 | Pathfinding fails | ✅ Handled — idles on no path, teleport to player | LOW |
| 5 | Death during awakening | ⚠️ Partial — works but snapshot not implemented | MEDIUM |
| 6 | Destination blocked mid-walk | ❌ Stuck — no fallback from walking_to_destination | MEDIUM |
| 7 | Non-allowed level | ✅ Handled — escort not spawned, flag persists | LOW |
| 8 | Two escorts active | ❌ Violation — both active, no deactivation mechanism | MEDIUM |
| 9 | Player never moves off spawn | ✅ Handled — escort waits indefinitely | LOW |
| 10 | Transition during completion | ❌ Lost progress — completion flags not yet set | HIGH |

### Overall: FAIL

- 0 critical risks
- 1 high risk (scenario 10)
- 3 medium risks (scenarios 5, 6, 8)
- 6 low risks (pass)

### Required Design Revisions

1. **Scenario 10 (HIGH):** Move completion flag writes to the start of `completing` state, before the animation and event. Animation becomes cosmetic-only.

2. **Scenario 6 (MEDIUM):** Add adjacent-cell fallback to `recalculatePathToDestination()`. Add a fallback transition from `walking_to_destination` back to `following` when destination becomes completely unreachable.

3. **Scenario 8 (MEDIUM):** Add deactivation mechanism — when a new escort awakens, force-complete or deactivate any existing active escort in the EntityManager.

4. **Scenario 5 (MEDIUM):** Implement `levelEntrySnapshot` capture at the start of `initializeScene()`. This is a pre-existing codebase gap, not escort-specific, but the escort's death-rollback behavior (R9) depends on it.

### Confidence Level

**High** — after applying the 3 escort-specific mitigations (scenarios 6, 8, 10), the design is robust. Scenario 5 depends on a codebase-wide fix that should be tracked separately.
