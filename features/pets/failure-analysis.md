# Failure Analysis: Pet System

## Attack Scenarios Tested

1. Rapid Pet Swapping (Timing)
2. Water Enter/Exit Tween Stacking (Timing)
3. Pathfinding with No Valid Path (Edge Case)
4. Pet Spawn During Level Transition (Timing)
5. WorldState Flag Corruption (Invalid State)
6. Missing Metadata Files (Invalid State)
7. 4-Direction vs 8-Direction Mapping Gaps (Edge Case)
8. PetManager Singleton Stale Reference (Timing)
9. Double Destroy on Swap (Timing)
10. Ability Use During Hidden/Swap State (Edge Case)

---

## Scenario 1: Rapid Pet Swapping

### Attack

User cycles `selectNext()` 10 times in 1 second (spam arrow key on carousel).

```
Frame 1: selectNext() → despawnPet(rock) → spawnPet(dog)
Frame 2: selectNext() → despawnPet(dog) → spawnPet(rock)  [dog spawn still in progress]
Frame 3: selectNext() → despawnPet(rock) → spawnPet(dog)
...
```

### Expected Behavior

Only the final selection takes effect. Intermediate spawns are cancelled or queued.

### Actual Behavior (from design)

`spawnPet` is `async` (fetches metadata JSON, creates entity). `despawnPet` is synchronous (destroys entity). The design has `isSwapping` flag but:

1. `isSwapping` is set in `PetManager` but **no guard exists on `selectNext()`/`selectPrevious()`** to check it
2. If `selectNext()` calls `despawnPet()` then `spawnPet()`, and user calls `selectNext()` again before the async `spawnPet()` resolves:
   - First `spawnPet()` is still fetching metadata
   - Second `despawnPet()` sets `activePetEntity = null`
   - First `spawnPet()` resolves, sets `activePetEntity` to dog
   - Second `spawnPet()` resolves, sets `activePetEntity` to rock
   - **Two pet entities exist in EntityManager, only one tracked**
   - Orphaned entity leaks: never destroyed, never updated correctly

### Risk Level

**HIGH** — Easy to trigger (spam carousel arrows), causes entity leak and ghost sprites.

### Mitigation

```typescript
async selectNext(): Promise<void> {
  if (this.isSwapping) return;  // Guard
  this.isSwapping = true;
  try {
    // ... cycle + despawn + spawn
  } finally {
    this.isSwapping = false;
  }
}
```

**Test:** `test/tests/pets/test-rapid-swap.js` → `testRapidPetSwap`

---

## Scenario 2: Water Enter/Exit Tween Stacking

### Attack

Player oscillates on water edge — enters water, exits, enters, exits — 10 times in rapid succession.

```
Frame 1: enterWater → hidePet() → tween(alpha→0, y-200)
Frame 3: exitWater → showPet() → tween(alpha→1, y+200)
Frame 5: enterWater → hidePet() → tween(alpha→0, y-200)
...
```

### Expected Behavior

Each hide/show cleanly cancels the previous tween. Pet ends in correct visual state.

### Actual Behavior (from design)

`hidePet()` and `showPet()` both call `scene.tweens.add()` on the same sprite **without killing existing tweens first**. Phaser tweens stack — multiple tweens fight over the same `alpha` and `y` properties simultaneously.

Results:
- Sprite flickers between alpha values
- Y position oscillates wildly (multiple +200/-200 offsets compounding)
- `onComplete` callback in `showPet()` sets `follow.setHidden(false)` — but an overlapping `hidePet()` tween may still be running, so the pet starts following while visually invisible
- `isHidden` flag desyncs from visual state

### Risk Level

**HIGH** — Water edges are common in levels. Player walking along a water border triggers this naturally.

### Mitigation

```typescript
private hideTween?: Phaser.Tweens.Tween;

hidePet(scene: Phaser.Scene): void {
  if (!this.activePetEntity) return;
  this.hideTween?.destroy();  // Kill any existing tween
  const sprite = this.activePetEntity.require(SpriteComponent);
  const follow = this.activePetEntity.require(PetFollowComponent);
  follow.setHidden(true);
  this.hideTween = scene.tweens.add({
    targets: sprite.sprite,
    y: sprite.sprite.y - 200,
    alpha: 0,
    duration: 300,
    ease: 'Power2',
  });
}

showPet(scene: Phaser.Scene, playerEntity: Entity): void {
  if (!this.activePetEntity) return;
  this.hideTween?.destroy();  // Kill any existing tween
  // ... rest of show logic
}
```

**Test:** `test/tests/pets/test-water-edge-cases.js` → `testRapidWaterToggle`

---

## Scenario 3: Pathfinding with No Valid Path

### Attack

Pet is on one side of an impassable wall, player is on the other. `Pathfinder.findPath()` returns `null`.

```
recalculatePath():
  this.path = pathfinder.findPath(...);  // returns null
  this.currentPathIndex = 0;

moveAlongPath():
  if (!this.path || this.currentPathIndex >= this.path.length) {
    // Fallback: move directly toward player
    this.moveToward(transform, playerTransform.x, playerTransform.y, ...);
  }
```

### Expected Behavior

Pet gracefully falls back to direct movement or teleports to player.

### Actual Behavior (from design)

The design **does handle null path** — `moveAlongPath()` checks `!this.path` and falls back to direct movement toward the player. However:

1. Direct movement ignores walls — pet walks through walls toward player
2. Path recalculates every 500ms, each time returning null, each time falling back to wall-clipping movement
3. If pet reaches `TOO_FAR_DISTANCE_PX` (150px), `isTooFar` becomes true, but the pet **keeps moving** (no stop on too-far)
4. Pet ability becomes unusable (`getIsTooFar()` returns true) but pet is visually present and moving

### Risk Level

**MEDIUM** — Causes visual glitch (pet clipping through walls). Not a crash, but looks broken.

### Mitigation

```typescript
private moveAlongPath(delta, transform, anim): void {
  if (!this.path || this.currentPathIndex >= this.path.length) {
    // No valid path — idle in place, don't clip through walls
    if (this.isFollowing) {
      this.isFollowing = false;
      anim.animationSystem.play(`idle_${this.currentDirection}`);
    }
    return;
  }
  // ... normal path following
}
```

Add teleport when too far:
```typescript
if (this.isTooFar) {
  // Teleport near player instead of walking through walls
  transform.x = playerTransform.x - 30;
  transform.y = playerTransform.y - 30;
  this.path = null;
}
```

**Test:** `test/tests/pets/test-pathfinding-edge.js` → `testNoValidPath`

---

## Scenario 4: Pet Spawn During Level Transition

### Attack

Level transition starts (500ms fade-out). During fade, `PetManager.initialize()` is NOT called yet (that happens in the new `GameScene.create()`). But the old pet entity is still in the old `EntityManager`.

```
1. startLevelTransition() → fade out (500ms)
2. Old EntityManager saved to GameScene.previousEntityManager
3. scene.start('LoadingScene')
4. LoadingScene → scene.start('game')
5. GameScene.create():
   5.1. previousEntityManager.destroyAll()  ← old pet destroyed
   5.2. new EntityManager created
   5.3. petManager.initialize()  ← spawns new pet
```

### Expected Behavior

Old pet destroyed cleanly, new pet spawned at new player position.

### Actual Behavior (from design)

The flow is **mostly correct** because:
- Old pet entity is destroyed with `previousEntityManager.destroyAll()` in step 5.1
- PetManager singleton's `activePetEntity` still points to the **destroyed** entity
- `initialize()` in step 5.3 calls `spawnPet()` which sets a new `activePetEntity`

**BUT:** Between steps 5.1 and 5.3, if anything accesses `PetManager.getActivePetEntity()`, it gets a destroyed entity. The `isActive()` method checks `activePetEntity !== null && !this.isSwapping` — it does NOT check `activePetEntity.isDestroyed`.

Also: `PetManager.initialize()` calls `refreshCollectedPets()` then `spawnPet()`. If `spawnPet()` is async (metadata fetch), there's a window where the pet doesn't exist yet but the game is running.

### Risk Level

**HIGH** — Stale reference to destroyed entity between scene transitions. Any code that calls `PetManager.getActivePetEntity()` during this window gets a destroyed entity.

### Mitigation

```typescript
// In PetManager, clear reference when old scene dies
initialize(scene, grid, playerEntity): void {
  this.activePetEntity = null;  // Clear stale reference FIRST
  this.refreshCollectedPets();
  const selected = this.getSelectedPetId();
  if (selected) {
    this.spawnPet(scene, grid, playerEntity, selected);
  }
}

isActive(): boolean {
  return this.activePetEntity !== null
    && !this.activePetEntity.isDestroyed
    && !this.isSwapping;
}
```

**Test:** `test/tests/pets/test-level-transition-pets.js` → `testPetSpawnDuringTransition`

---

## Scenario 5: WorldState Flag Corruption

### Attack

Corrupt the WorldState flags:
- `pet_rock_collected` = `'maybe'` (not `'true'`)
- `pet_dog_collected` = `''` (empty string)
- `pet_selected` = `'nonexistent_pet'` (invalid ID)

### Expected Behavior

System falls back gracefully — no collected pets, or ignores invalid selection.

### Actual Behavior (from design)

`refreshCollectedPets()` uses `ws.isFlagCondition(config.worldStateFlag, 'eq', 'true')`:
- `'maybe'` eq `'true'` → false ✅ (correctly excluded)
- `''` eq `'true'` → false ✅ (correctly excluded)

`getSelectedPetId()` checks `this.collectedPets.includes(selected)`:
- `'nonexistent_pet'` not in collected → falls back to `collectedPets[0]` ✅

**However:** If `collectedPets` is empty AND `pet_selected` is set to a valid pet ID that isn't collected:
- `getSelectedPetId()` returns `null` (correct)
- But `PetAbilityComponent.tryAbility()` does `PET_REGISTRY[petManager.getSelectedPetId()!]` — the `!` non-null assertion on a null value → `PET_REGISTRY[null]` → `undefined` → `undefined.abilityCooldownMs` → **CRASH**

### Risk Level

**MEDIUM** — Requires specific flag state (no pets collected but ability button pressed). The `!` assertion is the root cause.

### Mitigation

```typescript
tryAbility(): boolean {
  const petManager = PetManager.getInstance();
  if (!petManager.isActive()) return false;
  const petId = petManager.getSelectedPetId();
  if (!petId) return false;  // Guard against null
  const config = PET_REGISTRY[petId];
  if (!config) return false;  // Guard against invalid ID
  // ...
}
```

**Test:** `test/tests/pets/test-invalid-state.js` → `testCorruptedPetFlags`

---

## Scenario 6: Missing Metadata Files

### Attack

Delete or rename `rock_spritesheet_metadata.json`. Pet spawn attempts to fetch it.

### Expected Behavior

Design says: "Missing metadata: Log error, don't spawn pet."

### Actual Behavior (from design)

The design mentions metadata is "fetched at runtime when spawning a pet (cached after first load)" but **does not show the fetch code or error handling**. The `spawnPet()` method signature is `private async spawnPet(scene, grid, playerEntity, petId): Promise<void>` but the implementation is `{ ... }` (not shown).

The `createPetEntity()` factory takes `metadata: PetSpritesheetMetadata` as a required parameter. If the fetch fails and metadata is undefined/null:
- `metadata.animations[config.idleAnim]` → crash on property access of undefined
- `createPetAnimationMap()` iterates metadata — crash

The design **claims** error handling but **doesn't implement it**. The factory function has no null checks on metadata.

### Risk Level

**HIGH** — Missing asset file causes crash. No try/catch shown around metadata fetch. No fallback animation.

### Mitigation

```typescript
private async spawnPet(scene, grid, playerEntity, petId): Promise<void> {
  const config = PET_REGISTRY[petId];
  if (!config) { console.error(`Unknown pet: ${petId}`); return; }

  let metadata;
  try {
    const resp = await fetch(`/assets/pets/${petId}/${petId}_spritesheet_metadata.json`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    metadata = await resp.json();
  } catch (e) {
    console.error(`Failed to load pet metadata for ${petId}:`, e);
    return;  // Don't spawn, don't crash
  }

  this.activePetEntity = createPetEntity(scene, grid, playerEntity, config, metadata, startX, startY);
  scene.entityManager.add(this.activePetEntity);
}
```

**Test:** `test/tests/pets/test-invalid-state.js` → `testMissingMetadataFile`

---

## Scenario 7: 4-Direction vs 8-Direction Mapping Gaps

### Attack

Rock pet (4-dir) receives `Direction.DownRight`. The `DIR_8_TO_4` map sends this to `'east'`. But the rock metadata only has keys: `east`, `north`, `south`, `west`.

Verify: Does `createPetAnimationMap()` create animation keys for ALL `Direction` enum values, or only for the metadata's direction keys?

### Expected Behavior

All 9 Direction enum values (8 directions + None) map to valid animation keys.

### Actual Behavior (from design)

```typescript
for (const dir of ALL_DIRECTIONS) {
  const metaDir = dirMap[dir];
  const idleData = metadata.animations[config.idleAnim][metaDir];
  animMap.set(`idle_${dir}`, new Animation(...));
}
```

This iterates ALL directions and maps each to a metadata direction. For rock:
- `Direction.UpRight` → `'north'` → `metadata.animations['breathing-idle']['north']` ✅
- `Direction.None` → `'south'` → `metadata.animations['breathing-idle']['south']` ✅

The mapping is **correct** — all 9 enum values map to valid 4-direction metadata keys.

**However:** If `ALL_DIRECTIONS` includes `Direction.None` and the `AnimationSystem` default key is `idle_${Direction.Down}`, but `play()` is called with `walk_${Direction.None}`:
- `walk_8` (assuming None=8) exists in the map → plays south walk animation
- This is technically correct but semantically odd — pet walks south when direction is None

Also: The `PetFollowComponent.moveToward()` method calls `dirFromDelta(dx, dy)` which can return `Direction.None` when dx=0 and dy=0. The code checks `if (newDir !== Direction.None)` before updating direction — so `Direction.None` never triggers a walk animation. ✅

### Risk Level

**LOW** — Mapping is complete. Minor semantic oddity with Direction.None but guarded in code.

### Mitigation

None required. Mapping is correct.

**Test:** `test/tests/pets/test-invalid-state.js` → `testDirectionMappingEdgeCases`

---

## Scenario 8: PetManager Singleton Stale Reference After Scene Destroy

### Attack

```
1. GameScene A creates pet entity, PetManager.activePetEntity = petA
2. Level transition: GameScene A destroyed
3. previousEntityManager.destroyAll() → petA.destroy() called
4. petA.isDestroyed = true, components cleared
5. PetManager.activePetEntity still === petA (destroyed)
6. HUD code calls PetManager.isActive() → true (no isDestroyed check)
7. HUD calls petManager.getActivePetEntity().require(PetFollowComponent)
8. CRASH: components map is empty, require() throws
```

### Expected Behavior

`isActive()` returns false when pet entity is destroyed.

### Actual Behavior (from design)

`isActive()` checks `this.activePetEntity !== null && !this.isSwapping`. It does NOT check `this.activePetEntity.isDestroyed`. Between `destroyAll()` and `initialize()`, any code accessing the active pet entity will crash.

This is the same issue as Scenario 4 but from the HUD's perspective. The HUD scene persists across level transitions and may query PetManager during the gap.

### Risk Level

**CRITICAL** — HUD updates every frame. If HUD queries PetManager between scene destroy and re-initialize, it crashes. This is a guaranteed crash on every level transition if HUD pet display is active.

### Mitigation

```typescript
isActive(): boolean {
  return this.activePetEntity !== null
    && !this.activePetEntity.isDestroyed
    && !this.isSwapping;
}
```

---

## Scenario 9: Double Destroy on Swap

### Attack

```
1. selectNext() → despawnPet() → entity.destroy(), activePetEntity = null
2. spawnPet() [async, in progress]
3. Level transition starts → previousEntityManager.destroyAll()
4. destroyAll() iterates entities — if old pet was already removed from EM, no issue
   BUT: if spawnPet() resolved and added new pet to EM before destroyAll()...
5. destroyAll() destroys the new pet
6. PetManager.activePetEntity points to destroyed entity (again)
```

### Expected Behavior

Swap completes or is cancelled before transition proceeds.

### Actual Behavior (from design)

No coordination between swap lifecycle and transition lifecycle. The `isSwapping` flag is not checked by `startLevelTransition()`. A swap in progress can interleave with transition cleanup.

### Risk Level

**MEDIUM** — Requires precise timing (swap + transition simultaneously). Causes stale reference.

### Mitigation

```typescript
startLevelTransition(...): void {
  // Cancel any in-progress swap
  this.isSwapping = false;
  this.activePetEntity = null;
  // ... proceed with transition
}
```

---

## Scenario 10: Ability Use During Hidden/Swap State

### Attack

Player presses H (pet ability) while pet is hidden in water or mid-swap.

### Expected Behavior

Ability blocked, no effect.

### Actual Behavior (from design)

`tryAbility()` checks:
1. `petManager.isActive()` → checks `!isSwapping` ✅
2. `follow?.getIsHidden()` → returns true if hidden ✅
3. `follow?.getIsTooFar()` → returns true if too far ✅

These guards are **correct**. Ability is blocked during hidden and swap states.

**However:** If `getActivePetEntity()` returns a destroyed entity (Scenario 8), then `pet.get(PetFollowComponent)` returns undefined (components cleared), and `follow?.getIsHidden()` returns undefined, which is falsy — the guard passes, and `this.cooldownMs = config.abilityCooldownMs` executes on a destroyed pet. No crash (cooldown is on PetAbilityComponent which is on the player), but the ability "succeeds" with no visible effect.

### Risk Level

**LOW** — No crash, just a wasted cooldown. Mitigated by fixing Scenario 8.

### Mitigation

Already covered by Scenario 8's `isActive()` fix.

---

## Summary

| Criterion | Status | Notes |
|---|---|---|
| Edge cases handled | ❌ | Null path wall-clipping, Direction.None (minor) |
| Timing attacks don't crash | ❌ | Rapid swap leaks entities, tween stacking |
| Resource stress stable | ❌ | Orphaned entities from rapid swap |
| Invalid states fail gracefully | ❌ | Missing metadata crashes, null assertion in tryAbility |
| Recovery paths defined | ❌ | No stale-reference recovery, no swap cancellation on transition |

### Overall: ❌ FAIL

### Risk Summary

- **1 Critical:** PetManager.isActive() doesn't check isDestroyed — guaranteed crash on level transition if HUD queries pet state
- **3 High:** Rapid swap entity leak, tween stacking on water edges, missing metadata crash
- **2 Medium:** Null-path wall clipping, double destroy on swap+transition race
- **1 Low:** Wasted ability cooldown on destroyed pet

### Required Design Revisions

1. **Add `isDestroyed` check to `isActive()`** — Critical, blocks all level transitions
2. **Guard `selectNext()`/`selectPrevious()` with `isSwapping`** — Prevents entity leaks
3. **Kill existing tweens before starting new hide/show tweens** — Prevents visual corruption at water edges
4. **Add try/catch around metadata fetch in `spawnPet()`** — Prevents crash on missing assets
5. **Remove `!` non-null assertion in `tryAbility()`** — Prevents crash when no pet selected
6. **Clear `activePetEntity` at start of `initialize()`** — Prevents stale reference window
7. **Idle pet in place when path is null** instead of direct movement through walls
8. **Cancel swap on level transition** — Prevents interleaved async operations
