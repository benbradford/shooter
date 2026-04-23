# Runtime Analysis: Escort Entity

## Complexity Assessment

**High complexity** — involves scene lifecycle, cross-level persistence, event-driven state transitions, entity creation/destruction across level loads, and world state flag management.

## Execution Flows Analyzed

1. Level load with dormant escort (origin level)
2. Awakening event fires → escort transitions from dormant to following
3. Cross-level transition: player exits level → escort spawns in new level
4. Escort detects enemies → crouches → enemies leave → resumes
5. Escort reaches destination → completion animation → world state persistence
6. Player death on origin level → escort resets
7. Re-entering destination level after completion → escort in completed pose

---

## Lifecycle Ownership Table

| Resource | Created By | Destroyed By | Lifetime | Used By |
|----------|-----------|--------------|----------|---------|
| Escort Entity | `createEscortEntity()` (EntityLoader or `spawnCrossLevelEscort`) | `EntityManager.destroyAll()` on scene reset/transition | Scene | EntityManager, EscortComponent |
| Phaser Sprite | `SpriteComponent` constructor | `SpriteComponent.onDestroy()` | Entity | AnimationComponent, SpriteComponent |
| Shadow Image | `ShadowComponent.init()` | `ShadowComponent.onDestroy()` | Entity | ShadowComponent |
| Event Listener (awakeOnEvent) | `EscortComponent` constructor (registers with EventManagerSystem) | `EscortComponent.onDestroy()` (if dormant) OR `onEvent()` (one-shot deregister) | Until awakened or entity destroyed | EventManagerSystem |
| Animation Map | `createKnightAnimationMap()` | Garbage collected with entity | Entity | AnimationSystem, AnimationComponent |
| Pathfinder | Created per-call in `recalculatePathToPlayer()` / `checkDestinationReachable()` | Garbage collected after use | Per-call | EscortComponent |
| WorldState flags (escort_*) | `persistEscortDefinition()` on awakening | Never (permanent) / `current_escort` cleared on completion | Permanent | Cross-level spawn, completion check |
| TextureReference (knight_spritesheet) | `SpriteComponent` constructor via `TextureReferenceTracker` | `SpriteComponent.onDestroy()` via `TextureReferenceTracker` | Entity | AssetManager unload safety |

---

## Flow 1: Level Load with Dormant Escort (Origin Level)

### Execution Trace

```
1. LoadingScene.loadLevel() → LevelLoader.load(targetLevel)
2. LoadingScene → scene.start('game', { level, levelData, playerCol, playerRow })
3. GameScene.create() → await initializeScene()
4. initializeScene():
   4.1. Grid created, cells populated
   4.2. EntityLoader created
   4.3. spawnEntities() called
5. spawnEntities():
   5.1. Player entity created and added to EntityManager
   5.2. PetManager initialized
   5.3. CompanionManager initialized
   5.4. entityLoader.loadEntities(level, player, isEditorMode)
6. EntityLoader processes entity list:
   6.1. Finds entity with type='escort'
   6.2. Reads WorldState flags:
        - escort_{id}_completed !== "true"
        - current_escort !== entityId
        → initialState = 'dormant'
   6.3. createEscortEntity() called:
        6.3.1. TransformComponent created (world position from col/row)
        6.3.2. SpriteComponent created → Phaser sprite added to scene
        6.3.3. ShadowComponent created
        6.3.4. GridPositionComponent created
        6.3.5. GridCollisionComponent created
        6.3.6. AnimationComponent created with knight animation map
        6.3.7. For dormant: animSystem.play('crouch_forward'), then setIndex(4)
               → Shows last frame of crouch (frame 52)
        6.3.8. EscortComponent created with initialState='dormant'
        6.3.9. EscortComponent constructor registers awakeOnEvent listener
               with EventManagerSystem
   6.4. Entity added to EntityManager
7. [DESIGN PROPOSES] GameScene.spawnCrossLevelEscort(player) called
   7.1. Reads current_escort flag → empty (dormant escort not yet awakened)
   7.2. Returns immediately — no cross-level spawn needed
8. Each frame: EntityManager.update() calls entity.update()
   8.1. EscortComponent.update() → state='dormant' → returns immediately
   8.2. AnimationComponent.update() → updates animation (static on last frame)
   8.3. SpriteComponent.update() → syncs sprite position
```

### Violations Detected

**None.** Flow is clean. The dormant escort is a passive entity with no async operations.

### ⚠️ CONCERN: ShadowComponent.init() Not Called

`ShadowComponent` has an `init()` method that creates the shadow image. The design's `createEscortEntity()` does `entity.add(new ShadowComponent(...))` but does NOT call `init()`. Looking at the constructor, it only stores props. The shadow image is created in `init()`.

**Confirmed:** Every entity factory in the codebase calls `shadow.init()` explicitly after `entity.add(new ShadowComponent(...))`. The design's `createEscortEntity()` omits this call. The shadow Phaser Image will never be created, causing `ShadowComponent.update()` to crash on `this.shadow.setPosition(...)` since `this.shadow` is `undefined`.

**Fix:** Add `shadow.init()` after adding ShadowComponent in `createEscortEntity()`:
```typescript
const shadow = entity.add(new ShadowComponent(props.scene, { scale: 1, offsetX: 0, offsetY: 0 }));
shadow.init();
```

---

## Flow 2: Awakening Event Fires → Escort Transitions from Dormant to Following

### Execution Trace

```
1. External system raises awakeOnEvent (e.g., trigger, Lua script)
2. EventManagerSystem.raiseEvent(awakeOnEvent)
   2.1. Copies listener list (safe iteration)
   2.2. Calls EscortComponent.onEvent(awakeOnEvent)
3. EscortComponent.onEvent():
   3.1. Checks eventName === this.awakeOnEvent → true
   3.2. Checks state === 'dormant' → true
   3.3. Sets state = 'awakening'
   3.4. Calls this.playAnim('crouch_reverse')
        3.4.1. lastAnimKey !== 'crouch_reverse' → proceeds
        3.4.2. animationSystem.play('crouch_reverse')
        3.4.3. Animation.reset() → index=0, elapsed=0
               → Now showing frame 52 (first frame of reversed sequence)
        3.4.4. lastAnimKey = 'crouch_reverse'
   3.5. WorldState: setFlag('current_escort', entityId)
   3.6. persistEscortDefinition() → writes all escort_* flags
   3.7. eventManager.deregister(awakeOnEvent, this) → one-shot cleanup
4. Next frames: EntityManager.update() → EscortComponent.update()
   4.1. state = 'awakening' → updateAwakening()
   4.2. Gets AnimationComponent, checks isOnLastFrame('crouch_reverse')
        [NOTE: isOnLastFrame(animKey) does not exist on AnimationSystem yet]
        4.2.1. Design proposes adding this method — checks currentKey match + delegates
   4.3. Animation progresses: frames 52→51→50→49→48
   4.4. When on last frame (48): state = 'following', plays idle animation
5. Escort now in 'following' state — begins pathfinding toward player
```

### Violations Detected

**None for the core flow.** The awakening sequence is synchronous and well-ordered.

### ⚠️ CONCERN: Animation Reset on Dormant→Awakening Transition

When dormant, the factory sets `crouch_forward` animation at index 4 (last frame, showing frame 52). When awakening calls `playAnim('crouch_reverse')`:

1. `AnimationSystem.play('crouch_reverse')` is called
2. `crouch_reverse` is a DIFFERENT animation object than `crouch_forward`
3. So `next !== this.current` → sets `this.current = crouch_reverse`, calls `reset()`
4. `crouch_reverse` frames are `['52','51','50','49','48']`, reset sets index=0 → frame '52'

This is **correct** — the visual transition is seamless (frame 52 → frame 52 → animates to 48).

### ⚠️ CONCERN: Event Listener Cleanup on Non-Dormant Event

If `awakeOnEvent` fires while escort is already active (e.g., player re-enters origin level with escort already following), the `onEvent()` check `state !== 'dormant'` correctly ignores it. However, the event listener is still registered. It was only deregistered in the awakening path.

**Scenario:** Escort spawns with `initialState='following'` (because `current_escort` matches). The constructor registers the `awakeOnEvent` listener. The escort is never dormant, so `onEvent()` always returns early. The listener is never deregistered until `onDestroy()`.

**Impact:** Minor — the listener fires but is ignored. The `onDestroy()` cleanup only deregisters if `state === 'dormant'`. If the escort was spawned directly into 'following', the state is never 'dormant', so `onDestroy()` won't deregister.

**Fix:** Either:
- Don't register the event listener when `initialState !== 'dormant'`
- OR change `onDestroy()` to always deregister (track registration state with a boolean)

```typescript
// Option A: Don't register if not dormant
constructor(props) {
  ...
  if (this.state === 'dormant' && this.awakeOnEvent) {
    this.eventManager.register(this.awakeOnEvent, this);
    this.isEventRegistered = true;
  }
}

// Option B: Track registration
onDestroy(): void {
  if (this.isEventRegistered) {
    this.eventManager.deregister(this.awakeOnEvent, this);
  }
}
```


---

## Flow 3: Cross-Level Transition — Player Exits Level → Escort Spawns in New Level

### Execution Trace

```
1. Player touches exit trigger
2. GameScene.startLevelTransition(targetLevel, spawnCol, spawnRow)
   2.1. WorldState: saves player health, modified cells, current level
   2.2. WorldState: setCurrentLevel(targetLevel), setPlayerSpawnPosition(col, row)
   2.3. WorldState: saveToFile() [async, fire-and-forget]
   2.4. GameScene.previousEntityManager = this.entityManager
   2.5. Camera fadeOut(500ms)
   2.6. time.delayedCall(500ms, callback)
3. [500ms later] Callback fires:
   3.1. scene.start('LoadingScene', { targetLevel, ... })
4. LoadingScene.init():
   4.1. Gets GameScene reference
   4.2. worldState.setTrackDestructions(false)
   4.3. gameScene.entityManager.destroyAll()
        → All entities destroyed, including escort
        → EscortComponent.onDestroy() called
           → If state was 'dormant': deregisters awakeOnEvent listener
           → If state was 'following': onDestroy does nothing (see Flow 2 concern)
        → SpriteComponent.onDestroy(): sprite.destroy(), texture ref removed
        → ShadowComponent.onDestroy(): shadow.destroy()
   4.4. worldState.setTrackDestructions(true)
   4.5. scene.stop('game')
5. LoadingScene.create() → loadLevel():
   5.1. LevelLoader.load(targetLevel)
   5.2. AssetLoadCoordinator.loadLevelAssets() [async]
   5.3. Renderer tileset preparation [async]
   5.4. Unload previous level assets (knight_spritesheet may be unloaded!)
   5.5. scene.start('game', { level: targetLevel, levelData, ... })
6. GameScene.create() for new level:
   6.1. await initializeScene()
   6.2. spawnEntities()
        → Player created
        → entityLoader.loadEntities() — loads entities from new level JSON
        → Escort NOT in new level's JSON (it's from origin level)
   6.3. [DESIGN PROPOSES] spawnCrossLevelEscort(player) called:
        6.3.1. ws.getFlag('current_escort') → escortId (set during awakening)
        6.3.2. Check if entity already exists → no (new level)
        6.3.3. Check followToLevels includes current level → yes
        6.3.4. Read all escort_* flags from WorldState
        6.3.5. Get player spawn position
        6.3.6. createEscortEntity() with initialState='waiting_for_player_move'
               → Sprite created at player spawn cell
               → sprite.setAlpha(0) — invisible [WAIT: design says setAlpha(1) later]
        6.3.7. Entity added to EntityManager
7. Each frame: EscortComponent.update()
   7.1. state = 'waiting_for_player_move'
   7.2. Checks if player has moved off spawn cell
   7.3. When player moves: sprite.setAlpha(1), shadow.setAlpha(1), state='following'
```

### Violations Detected

#### ❌ VIOLATION: knight_spritesheet May Be Unloaded Before Cross-Level Spawn

**Type:** Temporal Coupling / Asset Lifecycle

**Location:** LoadingScene.unloadPreviousLevelAssets() (step 5.4) vs createEscortEntity() (step 6.3.6)

**Problem:** `unloadPreviousLevelAssets()` unloads textures from the previous level that aren't needed by the next level. If the next level has no escort entity in its JSON, `knight_spritesheet` won't be in the next level's asset manifest. It will be unloaded. Then `spawnCrossLevelEscort()` creates a sprite referencing the now-missing texture.

**Why it fails:**
- `AssetLoadCoordinator.loadLevelAssets()` loads assets based on the new level's JSON
- The new level has no escort entity → `knight_spritesheet` not loaded
- `unloadPreviousLevelAssets()` sees `knight_spritesheet` not in next level's manifest → unloads it
- `createEscortEntity()` → `new SpriteComponent(scene, 'knight_spritesheet', ...)` → missing texture

**Fix:** The `AssetLoader.getRequiredAssetGroups()` must also check `WorldState.getFlag('current_escort')` to include the escort asset group even when no escort entity is in the level JSON. Alternatively, add `knight_spritesheet` to the enemy textures exclusion set in `unloadPreviousLevelAssets()`.

```typescript
// In AssetLoader.getRequiredAssetGroups():
if (levelData.entities?.some(e => e.type === 'escort') ||
    WorldStateManager.getInstance().getFlag('current_escort')) {
  groups.push('escort');
}
```

#### ⚠️ CONCERN: Cross-Level Escort Invisible Mechanism

The design says the escort spawns invisible and becomes visible when the player moves off the spawn cell. The factory code shows:
```typescript
const sprite = this.entity.require(SpriteComponent);
sprite.sprite.setAlpha(1);
```
But the factory does NOT set alpha to 0 initially for `waiting_for_player_move` state. The `createEscortEntity()` function doesn't handle this.

**Fix:** Add alpha=0 initialization in the factory when `initialState === 'waiting_for_player_move'`:
```typescript
if (props.initialState === 'waiting_for_player_move') {
  sprite.sprite.setAlpha(0);
  if (shadow) shadow.shadow.setAlpha(0);
}
```

#### ⚠️ CONCERN: playerSpawnCol/Row Not Set in EscortComponent for Cross-Level

The `EscortComponent` has `playerSpawnCol` and `playerSpawnRow` fields initialized to -1. The `updateWaitingForPlayerMove()` method compares the player's current cell to these values. But the constructor never sets them from the actual player spawn position.

**Fix:** The constructor (or factory) must set `playerSpawnCol` and `playerSpawnRow` when `initialState === 'waiting_for_player_move'`. The design's `spawnCrossLevelEscort()` passes `spawnCol`/`spawnRow` as the entity's col/row, but these aren't forwarded to `EscortComponent` as spawn tracking fields.

```typescript
// In EscortComponent constructor:
if (this.state === 'waiting_for_player_move') {
  const cell = this.grid.worldToCell(transform.x, transform.y);
  this.playerSpawnCol = cell.col;
  this.playerSpawnRow = cell.row;
}
```

---

## Flow 4: Escort Detects Enemies → Crouches → Enemies Leave → Resumes

### Execution Trace

```
1. EscortComponent.update() in 'following' state:
   1.1. checkEnemies() called
   1.2. Gets escort TransformComponent
   1.3. entityManager.getAll() → copies entity array
   1.4. Filters for entities with 'enemy' tag and !isDestroyed
   1.5. For each enemy: Math.hypot distance check
   1.6. Enemy within enemyDetectDistancePx → enemyNearby = true
   1.7. state !== 'crouching' → enters crouch:
        1.7.1. previousActiveState = 'following'
        1.7.2. state = 'crouching'
        1.7.3. crouchPhase = 'crouching_down'
        1.7.4. playAnim('crouch_forward') → frames 48→52, once
        1.7.5. path = null (stop moving)
        1.7.6. return true (skip following update)

2. Next frames: state = 'crouching', updateCrouching():
   2.1. crouchPhase = 'crouching_down'
   2.2. Check isOnLastFrame('crouch_forward')
   2.3. Animation progresses: 48→49→50→51→52
   2.4. On last frame (52): crouchPhase = 'holding'

3. Holding phase: updateCrouching():
   3.1. crouchPhase = 'holding'
   3.2. areEnemiesNearby() → checks all enemies
   3.3. While enemies nearby: stays in holding (no animation change needed)

4. Enemies leave range:
   4.1. areEnemiesNearby() → false
   4.2. crouchPhase = 'standing_up'
   4.3. playAnim('crouch_reverse') → frames 52→48, once

5. Standing up: updateCrouching():
   5.1. crouchPhase = 'standing_up'
   5.2. Check isOnLastFrame('crouch_reverse')
   5.3. Animation progresses: 52→51→50→49→48
   5.4. On last frame (48):
        5.4.1. state = this.previousActiveState ('following')
        5.4.2. playAnim(`idle_${this.currentDirection}`)
   5.5. Next frame: back in 'following' state, resumes pathfinding
```

### Violations Detected

**None.** The crouch flow is fully synchronous with clean state transitions.

### ⚠️ CONCERN: Performance — getAll() + Filter Every Frame

`checkEnemies()` calls `entityManager.getAll()` which creates a copy of the entire entity array, then filters for 'enemy' tags. This runs every frame while in 'following' or 'walking_to_destination' state.

**Impact:** Minor performance concern. The entity list is typically small (<50 entities). The copy + filter is O(n) per frame. Not a correctness issue.

### ⚠️ CONCERN: Enemy Destroyed Mid-Crouch

If the enemy that triggered crouching is destroyed while the escort is in `crouching_down` phase, the escort will still complete the crouch-down animation, then in `holding` phase, `areEnemiesNearby()` returns false, and it immediately starts standing up. This is correct behavior — the escort reacts to the current state of enemies, not the triggering enemy specifically.

---

## Flow 5: Escort Reaches Destination → Completion Animation → World State Persistence

### Execution Trace

```
1. EscortComponent.update() in 'following' state:
   1.1. checkEnemies() → no enemies nearby
   1.2. checkDestinationReachable():
        1.2.1. currentLevelName === destinationLevel → true
        1.2.2. Creates new Pathfinder (per-call, synchronous)
        1.2.3. findPath to (destinationCol, destinationRow) → path found
        1.2.4. path.length <= reachDistance → true
        1.2.5. state = 'walking_to_destination'
        1.2.6. this.path = path, currentPathIndex = 1
        1.2.7. return true (skip following update)

2. Next frames: state = 'walking_to_destination', updateWalkingToDestination():
   2.1. Calculates distance to destination world position
   2.2. distToDest >= 8 → follows path using followPath()
   2.3. Path recalculates every 500ms
   2.4. Walk animation plays in movement direction

3. Escort arrives at destination cell:
   3.1. distToDest < 8
   3.2. Snaps position to destination center
   3.3. state = 'completing'
   3.4. playAnim('arms_stretched') → frames 40→44, once
   3.5. eventManager.raiseEvent(`${entityId}_reached_destination`)
        → Any listeners (Lua scripts, triggers) receive this event

4. Next frames: state = 'completing', updateCompleting():
   4.1. Check isOnLastFrame('arms_stretched')
   4.2. Animation progresses: 40→41→42→43→44
   4.3. On last frame (44):
        4.3.1. state = 'completed'
        4.3.2. ws.setFlag('current_escort', '') → clears active escort
        4.3.3. ws.setFlag('escort_{id}_completed', 'true')
        4.3.4. ws.setFlag('escort_{id}_completed_level', currentLevelName)
        4.3.5. ws.setFlag('escort_{id}_completed_col', destinationCol)
        4.3.6. ws.setFlag('escort_{id}_completed_row', destinationRow)

5. After completion: state = 'completed'
   5.1. update() → returns immediately (no processing)
   5.2. AnimationComponent still updates → holds last frame (44)
   5.3. Sprite stays at destination position permanently
```

### Violations Detected

**None.** The completion flow is clean and synchronous. World state flags are set atomically within a single frame.

### ⚠️ CONCERN: Event Raised Before Flags Set

In step 3.5, `raiseEvent` is called BEFORE the completion flags are set (step 4.3). If a listener for `{entityId}_reached_destination` checks `escort_{id}_completed`, it will be `undefined`/`false` because the flag isn't set until the animation finishes.

**Impact:** This is actually correct by design — the event signals arrival, not completion. The completion flags are set after the animation. However, this should be documented clearly so Lua scripts don't assume completion on the `reached_destination` event.

### ⚠️ CONCERN: Pathfinder Created Per-Call in checkDestinationReachable

`checkDestinationReachable()` creates a `new Pathfinder(...)` every frame while in 'following' state on the destination level. This includes `grid.getBlockedAreaCells()` which may also allocate.

**Impact:** Minor GC pressure. The pathfinder is lightweight (no persistent state), but creating it + running A* every frame is wasteful. The design already has `pathRecalcTimerMs` for the following path, but the destination check has no throttle.

**Fix (optional):** Throttle the destination reachability check to every 500ms, similar to path recalculation.

---

## Flow 6: Player Death on Origin Level → Escort Resets

### Execution Trace

```
1. Player health reaches 0
2. Death system triggers → GameScene.reloadCurrentLevel()
3. reloadCurrentLevel():
   3.1. Checks this.levelEntrySnapshot
        [NOTE: levelEntrySnapshot is declared but NEVER ASSIGNED in current code]
   3.2. If snapshot exists: worldState.loadFromJSON(snapshot)
        → Restores ALL flags to level-entry state
        → If escort was awakened THIS visit: current_escort reverts to ""
        → If escort was already active on entry: current_escort stays set
   3.3. If no snapshot: just restores health (fallback)
   3.4. Gets spawn position from world state
   3.5. Calls startLevelTransition(currentLevelName, spawnCol, spawnRow)
4. startLevelTransition():
   4.1. Saves player health, modified cells
   4.2. Sets current level and spawn position
   4.3. Saves to file [async]
   4.4. Camera fadeOut(500ms)
   4.5. delayedCall(500ms) → scene.start('LoadingScene')
5. LoadingScene.init():
   5.1. entityManager.destroyAll()
        → Escort entity destroyed
        → EscortComponent.onDestroy() called
        → SpriteComponent.onDestroy() → sprite destroyed
        → ShadowComponent.onDestroy() → shadow destroyed
   5.2. scene.stop('game')
6. LoadingScene loads same level → scene.start('game')
7. GameScene.create() → initializeScene() → spawnEntities()
   7.1. entityLoader.loadEntities() processes escort from JSON
   7.2. Checks WorldState flags:
        - If snapshot restored current_escort="" → initialState='dormant'
        - If snapshot restored current_escort=escortId → initialState='following'
   7.3. Escort spawns in correct state
```

### Violations Detected

#### ❌ VIOLATION: levelEntrySnapshot Never Assigned

**Type:** State Corruption / Missing Implementation

**Location:** GameScene.reloadCurrentLevel() (step 3.1)

**Problem:** `levelEntrySnapshot` is declared as `private levelEntrySnapshot: string | null = null` but is never assigned a value anywhere in the codebase. The `reloadCurrentLevel()` method checks `if (this.levelEntrySnapshot)` which will always be false. The fallback path only restores health, NOT world state flags.

**Why it fails:**
- Player enters origin level → snapshot should be captured
- Player awakens escort → `current_escort` flag set
- Player dies → `reloadCurrentLevel()` called
- `levelEntrySnapshot` is null → fallback: only health restored
- `current_escort` flag still set to escortId
- Level reloads → escort spawns in 'following' state instead of 'dormant'
- **Escort never resets to dormant on death**

**Impact:** This is a pre-existing issue in the codebase, not specific to the escort design. However, the escort design RELIES on this mechanism working correctly (R9 states "No special death-handling code needed — standard levelEntrySnapshot rollback handles it").

**Fix:** This is a pre-existing bug. The escort design should either:
1. Wait for `levelEntrySnapshot` to be implemented properly, OR
2. Add explicit death-handling code for the escort that manually resets `current_escort` flag if the escort was awakened during the current level visit

```typescript
// Option 2: Track awakening in EscortComponent
private awakenedThisVisit = false;

onEvent(eventName: string): void {
  ...
  this.awakenedThisVisit = true;
}

// Called by death system or scene reset:
resetOnDeath(): void {
  if (this.awakenedThisVisit) {
    const ws = WorldStateManager.getInstance();
    ws.setFlag('current_escort', '');
    // Clear persisted definition flags too
  }
}
```

#### ⚠️ CONCERN: Event Listener Leak on Death

When the escort entity is destroyed during `entityManager.destroyAll()`, `EscortComponent.onDestroy()` only deregisters the event listener if `state === 'dormant'`. If the escort was in 'following' state (awakened before death), the listener was already deregistered in `onEvent()`. This is correct.

But if the escort was in 'awakening' state when death occurs (mid-animation), the listener was already deregistered in `onEvent()` (step 3.7 of Flow 2). So `onDestroy()` correctly skips deregistration. **No leak.**

---

## Flow 7: Re-entering Destination Level After Completion → Escort in Completed Pose

### Execution Trace

```
1. Player transitions to destination level (escort previously completed here)
2. LoadingScene → GameScene.create() → initializeScene() → spawnEntities()
3. entityLoader.loadEntities():
   3.1. If destination level has escort in JSON (origin level):
        3.1.1. Reads WorldState: escort_{id}_completed === "true"
        3.1.2. initialState = 'completed'
        3.1.3. createEscortEntity() with initialState='completed'
   3.2. If destination level does NOT have escort in JSON (non-origin):
        3.2.1. spawnCrossLevelEscort() called
        3.2.2. ws.getFlag('current_escort') → "" (cleared on completion)
        3.2.3. Returns immediately — no escort spawned
        3.2.4. ❌ Escort does NOT appear in completed pose!

4. For case 3.1 (origin level IS destination level):
   4.1. createEscortEntity() with initialState='completed':
        4.1.1. All components created normally
        4.1.2. animSystem.play('arms_stretched')
        4.1.3. anim.setIndex(4) → last frame (frame 44)
        4.1.4. EscortComponent created with state='completed'
   4.2. Each frame: update() → state='completed' → returns immediately
   4.3. AnimationComponent updates → holds frame 44
   4.4. Sprite displays arms_stretched last frame permanently
```

### Violations Detected

#### ❌ VIOLATION: Completed Escort Not Shown on Non-Origin Destination Level

**Type:** Missing Logic / State Reconstruction

**Location:** `spawnCrossLevelEscort()` (step 3.2)

**Problem:** `spawnCrossLevelEscort()` only checks `current_escort` flag. After completion, `current_escort` is cleared to `""`. The method returns early, and no escort is spawned. But the escort should appear in its completed pose at the destination cell.

**Why it fails:**
- Escort completes on destination level (non-origin) → `current_escort` cleared
- Player leaves destination level
- Player re-enters destination level
- `spawnCrossLevelEscort()` checks `current_escort` → empty → returns
- No escort entity created
- Player sees empty destination cell where escort should be standing

**This only matters when the origin level ≠ destination level.** If they're the same level, the escort is in the level JSON and EntityLoader handles it correctly (case 3.1).

**Fix:** `spawnCrossLevelEscort()` (or a new method) must also check for completed escorts:

```typescript
private spawnCompletedEscorts(): void {
  const ws = WorldStateManager.getInstance();
  // Scan for any escort_*_completed flags where completed_level matches current level
  // This requires iterating flags or maintaining a registry of escort IDs
  // Simplest: check all flags matching pattern escort_*_completed
  for (const [key, value] of Object.entries(ws.getFlags())) {
    if (key.endsWith('_completed') && value === 'true') {
      const id = key.replace('escort_', '').replace('_completed', '');
      const completedLevel = ws.getFlag(`escort_${id}_completed_level`);
      if (completedLevel !== this.currentLevelName) continue;
      
      // Check if entity already exists (origin level has it in JSON)
      if (this.entityManager.getAll().find(e => e.id === id)) continue;
      
      const col = Number(ws.getFlag(`escort_${id}_completed_col`));
      const row = Number(ws.getFlag(`escort_${id}_completed_row`));
      const escortType = ws.getFlag(`escort_${id}_type`) ?? 'knight';
      
      // Create completed escort entity
      createEscortEntity({ ..., initialState: 'completed', col, row });
    }
  }
}
```

#### ⚠️ CONCERN: Completed Escort Position

When the escort completes on a non-origin level, it's spawned via cross-level mechanism. On re-entry, the completed escort should appear at `(completed_col, completed_row)`, NOT at the player spawn cell. The fix above handles this by reading the completed position from flags.

---

## Race Condition Analysis

### Race 1: Awakening Event During Level Transition

**Scenario:** Player triggers the awakeOnEvent and immediately steps on an exit trigger in the same frame (or within the 500ms fade).

**Trace:**
1. Frame N: awakeOnEvent fires → `EscortComponent.onEvent()` → state='awakening', flags set
2. Frame N: Exit trigger fires → `startLevelTransition()` → camera fadeOut starts
3. Frame N+1 to N+30: Escort is in 'awakening' state, animation playing
4. 500ms later: `LoadingScene.init()` → `entityManager.destroyAll()` → escort destroyed mid-animation
5. New level loads → `current_escort` is set → cross-level spawn works

**Result:** Safe. The escort is destroyed cleanly. World state flags were set synchronously in step 1. The cross-level spawn in the new level will reconstruct the escort correctly. The interrupted animation is irrelevant — the escort spawns fresh in the new level.

### Race 2: Multiple Events Firing Same Frame

**Scenario:** Two different systems raise the `awakeOnEvent` in the same frame.

**Trace:**
1. First `raiseEvent()` → `onEvent()` → state='awakening', listener deregistered
2. Second `raiseEvent()` → listener no longer in list (deregistered in step 1)

**Result:** Safe. `EventManagerSystem.raiseEvent()` copies the listener list before iterating, but `deregister()` modifies the original list. The copy-then-check pattern (`if (list.includes(listener))`) prevents calling a deregistered listener. Even if called twice, the second call would hit `state !== 'dormant'` and return.

### Race 3: Enemy Spawns While Escort Is Standing Up

**Scenario:** Escort is in `crouching` state, `standing_up` phase. A new enemy spawns within detection range.

**Trace:**
1. Escort in 'crouching' state, crouchPhase='standing_up'
2. `updateCrouching()` called — does NOT call `checkEnemies()`
3. Animation plays to completion → state = previousActiveState ('following')
4. Next frame: 'following' state → `checkEnemies()` → enemy detected → back to 'crouching'

**Result:** Safe but slightly jarring visually — the escort fully stands up, then immediately crouches again. This is acceptable behavior per the design (the escort reacts to current enemy state, not predicted state).

### Race 4: Escort Reaches Destination While Crouching

**Scenario:** Escort is walking to destination, enters crouch due to enemy. Enemy is killed. Escort stands up. Is it still within reach distance?

**Trace:**
1. state='walking_to_destination' → enemy detected → state='crouching', previousActiveState='walking_to_destination'
2. Enemy killed → standing_up → state='walking_to_destination'
3. `updateWalkingToDestination()` resumes — path may be stale (was nulled on crouch entry)
4. `pathRecalcTimerMs` triggers recalculation → new path to destination
5. Escort continues walking

**Result:** Safe. Path is recalculated. The escort may briefly idle (null path) for one frame before recalculation, which is imperceptible.

---

## Async Boundary Analysis

### Boundary 1: Level Transition (500ms Fade)

The 500ms `delayedCall` between `startLevelTransition()` and `LoadingScene.init()` is the main async boundary.

**During this window:**
- Escort entity still exists and updates
- If in 'following' state: continues pathfinding toward player (harmless)
- If in 'awakening' state: animation continues (harmless)
- Player input is disabled (step 2.2 of Flow 3)

**Risk:** None. The escort's behavior during the fade is cosmetic only. All state changes are already persisted to WorldState.

### Boundary 2: Asset Loading in LoadingScene

`AssetLoadCoordinator.loadLevelAssets()` is async. During this time, the old GameScene is stopped and the new one hasn't started.

**Risk:** None for escort. No escort code runs during this phase.

### Boundary 3: WorldState.saveToFile() (Fire-and-Forget)

`startLevelTransition()` calls `worldState.saveToFile()` which is async. If the save fails, the in-memory state is still correct. The escort's flags are in memory and will be used by the next scene.

**Risk:** If the game crashes between `saveToFile()` and the next level load, the escort state may be lost. This is a pre-existing risk for all world state, not escort-specific.

---

## Temporal Coupling Analysis

### Coupling 1: spawnCrossLevelEscort() Must Run After spawnEntities()

**Location:** Design proposes calling `spawnCrossLevelEscort()` after `spawnEntities()` in `initializeScene()`.

**Why it matters:** `spawnCrossLevelEscort()` checks if the escort entity already exists (origin level has it in JSON). If called before `spawnEntities()`, the check would always return false, potentially creating a duplicate escort on the origin level.

**Current design:** Correct — called after `entityLoader.loadEntities()`.

### Coupling 2: persistEscortDefinition() Must Run Before Level Transition

**Location:** `onEvent()` calls `persistEscortDefinition()` synchronously during awakening.

**Why it matters:** If the player awakens the escort and immediately transitions, the flags must already be set for cross-level reconstruction.

**Current design:** Correct — `persistEscortDefinition()` is synchronous and runs in the same frame as awakening.

### Coupling 3: Completion Flags Must Be Set Atomically

**Location:** `updateCompleting()` sets multiple flags when animation completes.

**Why it matters:** If a level transition interrupts between flag writes, partial state could occur (e.g., `current_escort` cleared but `completed` not set).

**Current design:** All flag writes happen in a single synchronous block within one frame. Level transitions are triggered by player input or delayed calls, not mid-update. **Safe.**

---

## Summary

### Violations Found

| # | Type | Severity | Flow | Description |
|---|------|----------|------|-------------|
| V1 | Missing Init Call | 🔴 Critical | 1 | `ShadowComponent.init()` never called — shadow crash |
| V2 | Event Listener Leak | 🟡 Minor | 2 | Event listener not deregistered when spawned non-dormant |
| V3 | Asset Lifecycle | 🔴 Critical | 3 | `knight_spritesheet` unloaded before cross-level spawn |
| V4 | Missing Initialization | 🟡 Medium | 3 | Escort not set invisible for `waiting_for_player_move` |
| V5 | Missing Initialization | 🟡 Medium | 3 | `playerSpawnCol/Row` never set in EscortComponent |
| V6 | Missing Implementation | 🔴 Critical | 6 | `levelEntrySnapshot` never assigned — death reset broken |
| V7 | Missing Logic | 🔴 Critical | 7 | Completed escort not spawned on non-origin destination level |

### Success Criteria

- ❌ **No resource destroyed while referenced** — V3: texture unloaded before sprite creation
- ✅ **No async race conditions** — All race scenarios analyzed, none found
- ❌ **Lifecycle ownership clearly defined** — V1: ShadowComponent.init() missing; V2: event listener leak
- ❌ **All execution flows trace correctly** — V4, V5: cross-level spawn incomplete; V7: completed escort missing
- ✅ **No temporal coupling violations** — All couplings are correctly ordered

### Overall: ❌ FAIL — Design Must Be Revised

### Required Design Revisions

1. **V1 (Critical):** Add `shadow.init()` call in `createEscortEntity()` after adding ShadowComponent
2. **V2 (Minor):** Track event listener registration state; deregister in `onDestroy()` unconditionally or skip registration when not dormant
3. **V3 (Critical):** Ensure `knight_spritesheet` is loaded for cross-level escort by checking `current_escort` flag in asset loading, or add to enemy texture exclusion set
4. **V4 (Medium):** Set sprite and shadow alpha to 0 in factory when `initialState === 'waiting_for_player_move'`
5. **V5 (Medium):** Initialize `playerSpawnCol/Row` from entity position when state is `waiting_for_player_move`
6. **V6 (Critical):** Either implement `levelEntrySnapshot` capture, or add explicit escort death-reset logic
7. **V7 (Critical):** Add `spawnCompletedEscorts()` method to handle completed escorts on non-origin levels
