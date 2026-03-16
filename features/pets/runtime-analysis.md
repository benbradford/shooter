# Runtime Analysis: Pet System

## Execution Flows Analyzed

1. Pet Spawn on Level Load
2. Level Transition with Active Pet
3. Pet Follow (Pathfinding + Animation)
4. Water Enter/Exit (Hide/Show)
5. Rapid Pet Swap (Carousel Cycling)
6. Pet Ability Activation
7. Interaction Pause with Active Pet
8. Slide Removal Refactor
9. Pet Swap During Water Hide
10. Scene Reset (Player Death) with Active Pet

---

## Flow 1: Pet Spawn on Level Load

### Execution Trace
```
1. GameScene.create() runs
2. Player entity created via spawnEntities()
3. PetManager.getInstance() called (singleton)
4. PetManager.initialize(scene, grid, playerEntity)
   4.1. refreshCollectedPets() reads WorldState flags
   4.2. getSelectedPetId() reads WorldState flag 'pet_selected'
   4.3. If selected pet exists → spawnPet(scene, grid, playerEntity, petId)
        4.3.1. fetch() metadata JSON [ASYNC]
        4.3.2. createPetEntity() builds entity
        4.3.3. entityManager.add(petEntity)
        4.3.4. this.activePetEntity = petEntity
```

### Lifecycle Ownership Table
| Resource | Created By | Destroyed By | Lifetime | Used By |
|----------|-----------|--------------|----------|---------|
| PetManager | PetManager.getInstance() | Never (singleton) | App | GameScene, HUD |
| Pet Entity | PetManager.spawnPet() | EntityManager.destroyAll() or PetManager.despawnPet() | Scene | EntityManager, PetManager |
| Pet Sprite | SpriteComponent constructor | SpriteComponent.onDestroy() | Entity | Renderer, Tweens |
| Pet AnimationMap | createPetAnimationMap() | Garbage collected with entity | Entity | AnimationComponent |
| Metadata JSON | fetch() in spawnPet | Cached (design says "cached after first load") | App | createPetAnimationMap |

### Violations Detected

#### ⚠️ RISK: Async Metadata Fetch During Initialize

**Type:** Temporal Coupling

**Location:** design.md - PetManager.initialize() → spawnPet() is async

**Problem:** `spawnPet()` is `async` (fetches metadata JSON). `initialize()` is called in `GameScene.create()` which is also async. But the design doesn't show `await` on `initialize()` in the GameScene integration point.

**Why it matters:**
- If `initialize()` is not awaited, the pet entity may not exist when the first `update()` fires
- The pet could spawn mid-frame, causing a visual pop
- Not a crash, but a timing inconsistency

**Fix:** Ensure `GameScene.create()` awaits `petManager.initialize()`:
```typescript
await petManager.initialize(this, this.grid, playerEntity);
```

---

## Flow 2: Level Transition with Active Pet

### Execution Trace
```
1. Player touches exit → startLevelTransition()
2. GameScene.previousEntityManager = this.entityManager
   2.1. Pet entity is in this entityManager
3. Camera fadeOut (500ms) [ASYNC - delayedCall]
4. scene.start('LoadingScene', data)
5. LoadingScene.init()
   5.1. gameScene.entityManager.destroyAll() [trackDestructions=false]
        5.1.1. Pet entity destroyed
        5.1.2. SpriteComponent.onDestroy() → sprite.destroy()
        5.1.3. TextureReferenceTracker.removeReference('rock_spritesheet')
   5.2. scene.stop('game')
6. LoadingScene.create() → loadLevel() [ASYNC]
7. scene.start('game') → new GameScene.create()
8. GameScene.create():
   8.1. previousEntityManager.destroyAll() — already destroyed in step 5.1
        ⚠️ Double-destroy attempt (but entities already have isDestroyed=true)
   8.2. Player spawned
   8.3. PetManager.initialize() called
        8.3.1. PetManager singleton still has activePetEntity pointing to DESTROYED entity
        8.3.2. refreshCollectedPets() re-reads WorldState (OK)
        8.3.3. spawnPet() creates new pet entity
        8.3.4. this.activePetEntity = new entity (overwrites stale reference)
```

### Violations Detected

#### ❌ VIOLATION: Stale activePetEntity Reference

**Type:** Lifecycle Ownership

**Location:** design.md - PetManager singleton across level transitions

**Problem:** PetManager.activePetEntity holds a reference to the old pet entity after LoadingScene destroys it. Between step 5.1.1 (entity destroyed) and step 8.3.4 (new entity assigned), `activePetEntity` points to a destroyed entity.

**Why it fails:**
- If anything calls `PetManager.isActive()` during transition → returns true (entity exists but is destroyed)
- If anything calls `getActivePetEntity().require(PetFollowComponent)` → crash (components cleared)
- The `isSwapping` flag doesn't protect against this

**Fix:** PetManager needs a `cleanup()` or `onSceneShutdown()` method:
```typescript
// Called before entityManager.destroyAll() or in despawnPet
cleanup(): void {
  this.activePetEntity = null;
}
```
Or check `activePetEntity.isDestroyed` in `isActive()`:
```typescript
isActive(): boolean {
  return this.activePetEntity !== null 
    && !this.activePetEntity.isDestroyed 
    && !this.isSwapping;
}
```

#### ⚠️ RISK: Double destroyAll() on previousEntityManager

**Type:** Redundant Operation

**Location:** LoadingScene.init() step 5.1 + GameScene.create() step 8.1

**Problem:** LoadingScene.init() already calls `gameScene.entityManager.destroyAll()`. Then GameScene.create() checks `previousEntityManager` and calls `destroyAll()` again.

**Why it's OK:** Entity.destroy() sets `isDestroyed=true` and clears components. EntityManager.destroyAll() iterates and calls destroy on each. Second call iterates empty array (entities already spliced or destroyed). No crash, but wasteful.

**Recommendation:** Design should document that PetManager.activePetEntity is nulled during the first destroyAll, not rely on the second pass.

---

## Flow 3: Pet Follow (Pathfinding + Animation)

### Execution Trace
```
1. EntityManager.update(delta)
2. Pet entity.update(delta)
3. Update order: TransformComponent → SpriteComponent → PetFollowComponent → AnimationComponent
   3.1. TransformComponent.update() — no-op (just stores position)
   3.2. SpriteComponent.update() — syncs sprite to transform position
   3.3. PetFollowComponent.update(delta)
        3.3.1. If hidden → return early
        3.3.2. Calculate distance to player
        3.3.3. If close enough → play idle animation, return
        3.3.4. If pathRecalcTimer expired:
               3.3.4.1. new Pathfinder(grid) — creates new instance each time
               3.3.4.2. findPath(start, goal, layer, true, true)
               3.3.4.3. Store path, reset index
        3.3.5. moveAlongPath(delta)
               3.3.5.1. Move toward next waypoint
               3.3.5.2. Update direction → play walk animation
   3.4. AnimationComponent.update(delta) — advances frame, sets sprite texture
```

### Violations Detected

#### ⚠️ RISK: Animation Play Called Every Frame While Following

**Type:** Performance / Logic Error

**Location:** design.md - PetFollowComponent.moveToward()

**Problem:** In `moveToward()`, the walk animation is played when direction changes OR when `!this.isFollowing`. But `isFollowing` is set to `true` at the start of the follow block (before `moveAlongPath`). So the `!this.isFollowing` branch in `moveToward()` is dead code — it will never be true when called from the follow path.

**Why it matters:** Not a crash, but the condition `else if (!this.isFollowing)` in `moveToward()` is unreachable during normal follow. The animation only changes on direction change, which is correct behavior. This is a minor logic clarity issue.

**Fix:** Remove the dead branch or clarify intent:
```typescript
// Only update animation on direction change
if (newDir !== Direction.None && newDir !== this.currentDirection) {
  this.currentDirection = newDir;
  anim.animationSystem.play(`walk_${this.currentDirection}`);
}
```

#### ⚠️ RISK: Pathfinder Allocates New Instance Every 500ms

**Type:** Performance

**Location:** design.md - PetFollowComponent.recalculatePath()

**Problem:** `new Pathfinder(this.grid)` is created every recalculation. The existing Pathfinder class allocates internal data structures.

**Why it's OK:** Design says "Pathfinder runs every 500ms per pet (negligible)". One allocation per 500ms is fine for a single pet. Not a violation, just a note.

#### ✅ Update Order is Correct

TransformComponent → SpriteComponent → PetFollowComponent → AnimationComponent

This ensures:
- Transform position is current before sprite syncs
- PetFollowComponent modifies transform and triggers animation
- AnimationComponent runs last, setting the correct frame on sprite

---

## Flow 4: Water Enter/Exit (Hide/Show)

### Execution Trace
```
ENTER WATER:
1. PlayerWalkState/PlayerIdleState detects water via WaterEffectComponent
2. Code calls PetManager.getInstance().hidePet(scene)
3. hidePet():
   3.1. If no activePetEntity → return (OK)
   3.2. Get SpriteComponent and PetFollowComponent
   3.3. follow.setHidden(true) — immediately stops updates
   3.4. scene.tweens.add({ targets: sprite.sprite, y: -200, alpha: 0, duration: 300 })
        [ASYNC - tween runs over 300ms]

EXIT WATER:
4. Player exits water cell
5. Code calls PetManager.getInstance().showPet(scene, playerEntity)
6. showPet():
   6.1. If no activePetEntity → return (OK)
   6.2. Teleport pet transform to player position - 200
   6.3. Set sprite alpha to 0
   6.4. scene.tweens.add({ y: playerY, alpha: 1, duration: 300, onComplete: follow.setHidden(false) })
        [ASYNC - tween runs over 300ms]
```

### Violations Detected

#### ❌ VIOLATION: Tween Stacking on Rapid Water Toggle

**Type:** Race Condition

**Location:** design.md - hidePet() / showPet() tween management

**Problem:** If player rapidly enters/exits water (e.g., walking along water edge), multiple tweens stack on the same sprite. Each tween targets `sprite.sprite.y` and `sprite.sprite.alpha`. Phaser does NOT automatically cancel previous tweens on the same target.

**Why it fails:**
- Frame 0: hidePet() → tween A starts (alpha 1→0, y→-200)
- Frame 100ms: showPet() → tween B starts (alpha 0→1, y→playerY)
- Frame 150ms: hidePet() → tween C starts (alpha→0, y→-200)
- Tweens A, B, C all running simultaneously on same sprite
- Final state is unpredictable (last tween to complete wins)
- `follow.setHidden(false)` from tween B's onComplete fires even though pet should be hidden

**Fix:** Kill existing tweens before starting new ones:
```typescript
hidePet(scene: Phaser.Scene): void {
  if (!this.activePetEntity) return;
  const sprite = this.activePetEntity.require(SpriteComponent);
  const follow = this.activePetEntity.require(PetFollowComponent);
  scene.tweens.killTweensOf(sprite.sprite); // Kill any existing tweens
  follow.setHidden(true);
  scene.tweens.add({ /* ... */ });
}

showPet(scene: Phaser.Scene, playerEntity: Entity): void {
  if (!this.activePetEntity) return;
  const sprite = this.activePetEntity.require(SpriteComponent);
  scene.tweens.killTweensOf(sprite.sprite); // Kill any existing tweens
  // ... rest of show logic
}
```

#### ⚠️ RISK: showPet() Modifies Transform Directly

**Type:** Temporal Coupling

**Location:** design.md - showPet() sets transform.x/y

**Problem:** showPet() sets `transform.x = playerTransform.x` and `transform.y = playerTransform.y - 200`. But the tween targets `sprite.sprite.y`, not `transform.y`. On the next update cycle, SpriteComponent.update() will overwrite `sprite.y` with `transform.y` (which is playerY - 200), fighting the tween.

**Why it fails:**
- showPet() sets transform.y = playerY - 200
- Tween animates sprite.sprite.y from playerY-200 to playerY
- Next frame: SpriteComponent.update() sets sprite.y = transform.y (playerY - 200)
- Tween and SpriteComponent fight each other every frame
- Pet visually jitters or doesn't animate smoothly

**Fix:** Either:
1. Tween the transform component instead of the sprite directly, OR
2. Set `follow.setHidden(true)` during the show tween (which skips PetFollowComponent.update but SpriteComponent still runs), OR
3. Disable SpriteComponent sync during tween by adding a flag:
```typescript
showPet(scene: Phaser.Scene, playerEntity: Entity): void {
  // ... setup ...
  follow.setHidden(true); // Keep hidden during tween (prevents follow updates)
  // But SpriteComponent.update() still runs and overwrites sprite position!
  // Need to tween transform.y instead:
  scene.tweens.add({
    targets: transform, // Tween the transform, not the sprite
    y: playerTransform.y,
    duration: 300,
    onComplete: () => { follow.setHidden(false); }
  });
  // And handle alpha separately on sprite
  sprite.sprite.setAlpha(0);
  scene.tweens.add({
    targets: sprite.sprite,
    alpha: 1,
    duration: 300
  });
}
```

---

## Flow 5: Rapid Pet Swap (Carousel Cycling)

### Execution Trace
```
1. Player presses cycle button
2. PetManager.selectNext()
   2.1. Update selectedPetId
   2.2. WorldState.setFlag('pet_selected', newId)
   2.3. despawnPet(scene)
        2.3.1. entityManager.remove(activePetEntity)
               → entity.destroy() → SpriteComponent.onDestroy() → sprite.destroy()
        2.3.2. this.activePetEntity = null
   2.4. spawnPet(scene, grid, playerEntity, newId) [ASYNC - fetch metadata]
        2.4.1. this.isSwapping = true
        2.4.2. fetch metadata [ASYNC]
        2.4.3. createPetEntity()
        2.4.4. entityManager.add(newEntity)
        2.4.5. this.activePetEntity = newEntity
        2.4.6. this.isSwapping = false
```

### Violations Detected

#### ❌ VIOLATION: Race Condition on Rapid Swap

**Type:** Race Condition / Async Boundary

**Location:** design.md - PetManager.selectNext() → spawnPet() is async

**Problem:** If player cycles rapidly (10 times in 1 second), each call to `selectNext()` triggers `despawnPet()` (sync) then `spawnPet()` (async). The despawn is immediate but spawn awaits metadata fetch.

**Why it fails:**
```
Swap 1: despawn(rock) → spawn(dog) [fetch starts...]
Swap 2: despawn(dog) ← dog entity doesn't exist yet! activePetEntity is null
         → despawnPet does nothing (null check passes)
         → spawn(rock) [fetch starts...]
Swap 1 fetch completes: activePetEntity = dog entity
Swap 2 fetch completes: activePetEntity = rock entity
Result: TWO pet entities in entityManager, only one tracked by activePetEntity
```

**Fix:** Guard against concurrent swaps and cancel pending spawns:
```typescript
private spawnAbortController: AbortController | null = null;

async selectNext(): Promise<void> {
  if (this.isSwapping) return; // Reject while swap in progress
  // ... cycle logic ...
  await this.swapPet(scene, grid, playerEntity, newId);
}

private async swapPet(scene, grid, playerEntity, petId): Promise<void> {
  this.isSwapping = true;
  this.despawnPet(scene);
  
  // Cancel any pending spawn
  this.spawnAbortController?.abort();
  this.spawnAbortController = new AbortController();
  
  try {
    await this.spawnPet(scene, grid, playerEntity, petId);
  } finally {
    this.isSwapping = false;
  }
}
```

---

## Flow 6: Pet Ability Activation

### Execution Trace
```
1. Player presses H key (or pet action button)
2. InputComponent.isPetActionPressed() returns true
3. handlePetAbilityInput() called (replaces handleSlideInput)
4. PetAbilityComponent.tryAbility()
   4.1. PetManager.getInstance().isActive() check
   4.2. Get PetFollowComponent from active pet entity
   4.3. Check isTooFar and isHidden
   4.4. Get PetConfig from PET_REGISTRY
   4.5. Check cooldown
   4.6. Set cooldown, log ability
   4.7. Return true
```

### Violations Detected

#### ⚠️ RISK: PetAbilityComponent Reaches Into Another Entity

**Type:** Lifecycle Ownership / Coupling

**Location:** design.md - PetAbilityComponent.tryAbility()

**Problem:** PetAbilityComponent (on player entity) calls `petManager.getActivePetEntity()?.get(PetFollowComponent)`. This creates a cross-entity dependency. If the pet entity is destroyed between the `isActive()` check and the `get(PetFollowComponent)` call (extremely unlikely in single-threaded JS but possible if destroy happens in same frame), it would return undefined.

**Why it's low risk:** JavaScript is single-threaded. Between `isActive()` and `get()`, no other code runs. The `?.` optional chaining handles the null case. This is acceptable.

**Recommendation:** The design handles this correctly with optional chaining. No change needed.

---

## Flow 7: Interaction Pause with Active Pet

### Execution Trace
```
1. Player triggers NPC interaction
2. InteractionState.onEnter()
   2.1. scene.isInInteraction = true
3. EntityManager.update(delta) checks isInInteraction
   3.1. Only updates entities with 'interaction_active' tag or in HudScene
   3.2. Pet entity has NO 'interaction_active' tag
   3.3. Pet entity is in GameScene (not HudScene)
   3.4. → Pet entity is NOT updated during interaction
4. PetFollowComponent.update() NOT called → pet freezes in place
5. AnimationComponent.update() NOT called → pet animation freezes
6. InteractionState.onExit()
   6.1. scene.isInInteraction = false
7. Next frame: EntityManager.update() resumes all entities
   7.1. Pet entity resumes with stale pathRecalcTimerMs
   7.2. Pet immediately recalculates path (timer accumulated)
```

### Violations Detected

✅ **No violations.** The design correctly states "EntityManager already handles this. No special handling needed." The pet freezes during interaction and resumes after, which is correct behavior. The stale timer causes an immediate path recalc on resume, which is actually desirable (player may have moved during interaction).

---

## Flow 8: Slide Removal Refactor

### Execution Trace
```
CURRENT STATE:
- PlayerEntity.ts adds SlideAbilityComponent
- PlayerIdleState requires SlideAbilityComponent
- PlayerWalkState requires SlideAbilityComponent
- PlayerStateHelpers.handleSlideInput() uses SlideAbilityComponent
- InputComponent.isSlidePressed() reads H key
- SlideButtonComponent references SlideAbilityComponent
- Update order includes SlideAbilityComponent

PROPOSED CHANGES:
1. Remove SlideAbilityComponent from PlayerEntity factory
2. Add PetAbilityComponent to PlayerEntity factory
3. Replace handleSlideInput() with handlePetAbilityInput() in PlayerStateHelpers
4. Replace isSlidePressed() with isPetActionPressed() in InputComponent
5. Update PlayerIdleState and PlayerWalkState to use new helper
6. Remove SlideAbilityComponent from update order, add PetAbilityComponent
```

### Violations Detected

#### ❌ VIOLATION: SlideAbilityComponent.require() Will Crash If Not Fully Removed

**Type:** Configuration Mismatch

**Location:** design.md - Refactor 1

**Problem:** PlayerIdleState and PlayerWalkState use `this.entity.require(SlideAbilityComponent)`. If SlideAbilityComponent is removed from the entity but the state classes still reference it, `require()` throws an error.

**Why it fails:**
```
PlayerIdleState.onUpdate()
  → const slide = this.entity.require(SlideAbilityComponent)
  → Error: Entity player missing required component SlideAbilityComponent
```

**Fix:** The design correctly identifies all 6 locations that need updating. This is a checklist item, not a design flaw. But the design should explicitly note that ALL references must be updated atomically — partial removal will crash.

**Specific files requiring changes:**
1. `PlayerEntity.ts` — remove `entity.add(new SlideAbilityComponent(scene))` and update order
2. `PlayerIdleState.ts` — replace `require(SlideAbilityComponent)` with `require(PetAbilityComponent)`
3. `PlayerWalkState.ts` — same
4. `PlayerStateHelpers.ts` — replace `handleSlideInput` function
5. `InputComponent.ts` — replace `isSlidePressed()` with `isPetActionPressed()`
6. `SlideButtonComponent.ts` — replace with PetActionButtonComponent or remove

#### ⚠️ RISK: SlideButtonComponent in HudScene

**Location:** Not explicitly in design

**Problem:** SlideButtonComponent is NOT in the JoystickEntity (checked JoystickEntity.ts — it's not there). But if it's added elsewhere in the HUD, it needs to be replaced with PetActionButtonComponent.

**Status:** SlideButtonComponent exists as a class but is not wired into JoystickEntity.ts. It may be unused or added elsewhere. Design should verify where SlideButtonComponent is instantiated.

---

## Flow 9: Pet Swap During Water Hide

### Execution Trace
```
1. Player is in water → pet is hidden (follow.isHidden = true, sprite alpha = 0)
2. Player swaps pet via carousel
3. PetManager.selectNext()
   3.1. despawnPet() → destroys hidden pet entity
        3.1.1. Active tween on sprite? If hide tween still running → tween targets destroyed sprite
   3.2. spawnPet() → creates new pet entity
        3.2.1. New pet spawned with default state (isHidden = false, alpha = 1)
        3.2.2. Player is still in water!
        3.2.3. New pet is VISIBLE while player is swimming
```

### Violations Detected

#### ❌ VIOLATION: New Pet Visible While Player In Water

**Type:** State Management

**Location:** design.md - spawnPet() doesn't check water state

**Problem:** When swapping pets while in water, the old pet is correctly hidden, but the new pet spawns with default visible state. The water detection in PlayerWalkState only triggers on water ENTRY, not on current state.

**Why it fails:**
- Old pet: hidden (correct)
- New pet: visible, following player through water (incorrect)
- Player sees pet swimming/walking on water surface

**Fix:** spawnPet() should check if player is currently in water and set initial hidden state:
```typescript
private async spawnPet(scene, grid, playerEntity, petId): Promise<void> {
  // ... create entity ...
  
  // Check if player is currently in water
  const water = playerEntity.get(WaterEffectComponent);
  if (water?.getIsInWater()) {
    const follow = entity.require(PetFollowComponent);
    follow.setHidden(true);
    const sprite = entity.require(SpriteComponent);
    sprite.sprite.setAlpha(0);
  }
}
```

#### ⚠️ RISK: Tween on Destroyed Sprite

**Type:** Resource Destroyed While Referenced

**Location:** design.md - despawnPet() during active tween

**Problem:** If hidePet() tween is still running (300ms duration) and despawnPet() destroys the entity, the tween's target (`sprite.sprite`) is destroyed. Phaser tweens on destroyed objects typically fail silently, but this should be explicitly handled.

**Fix:** Kill tweens before despawn:
```typescript
despawnPet(scene: Phaser.Scene): void {
  if (!this.activePetEntity) return;
  const sprite = this.activePetEntity.get(SpriteComponent);
  if (sprite) scene.tweens.killTweensOf(sprite.sprite);
  scene.entityManager.remove(this.activePetEntity);
  this.activePetEntity = null;
}
```

---

## Flow 10: Scene Reset (Player Death) with Active Pet

### Execution Trace
```
1. Player health reaches 0
2. PlayerDeathState.onEnter() → reloadLevel()
3. GameScene.reloadCurrentLevel()
   3.1. Restore WorldState from snapshot
   3.2. startLevelTransition(currentLevel, spawnCol, spawnRow)
4. Same as Flow 2 (Level Transition)
   4.1. previousEntityManager = this.entityManager (contains pet)
   4.2. Fade out → LoadingScene
   4.3. LoadingScene destroys entities
   4.4. PetManager.activePetEntity is stale (same violation as Flow 2)
```

### Violations Detected

Same as Flow 2 — stale `activePetEntity` reference. See Flow 2 fix.

---

## Lifecycle Ownership Table (Complete)

| Resource | Created By | Destroyed By | Lifetime | Used By |
|----------|-----------|--------------|----------|---------|
| PetManager (singleton) | PetManager.getInstance() | Never | App | GameScene, PlayerStates, HUD |
| Pet Entity | PetManager.spawnPet() | EntityManager.destroyAll() / despawnPet() | Scene | EntityManager, PetManager, Tweens |
| Pet Sprite (Phaser) | SpriteComponent constructor | SpriteComponent.onDestroy() | Entity | Renderer, Tweens |
| Pet AnimationMap | createPetAnimationMap() | GC with entity | Entity | AnimationComponent |
| Pet AnimationSystem | PetEntity factory | GC with entity | Entity | AnimationComponent |
| PetFollowComponent | PetEntity factory | Entity.destroy() | Entity | PetManager (cross-entity access) |
| PetAbilityComponent | PlayerEntity factory | Entity.destroy() | Scene (player) | PlayerStates |
| Metadata JSON | fetch() | Cached in PetManager | App | createPetAnimationMap |
| WorldState flags | Lua scripts / triggers | Never (persistent) | Save file | PetManager.refreshCollectedPets() |
| Texture: rock_spritesheet | AssetLoader (core group) | Never (always loaded) | App | SpriteComponent |
| Texture: dog_spritesheet | AssetLoader (core group) | Never (always loaded) | App | SpriteComponent |
| HUD Carousel icons | PetCarouselComponent | PetCarouselComponent.onDestroy() | HudScene | Renderer |
| HUD Action button | PetActionButtonComponent | PetActionButtonComponent.onDestroy() | HudScene | Renderer, Input |

---

## Summary

### Success Criteria

- ❌ **No resource destroyed while referenced** — FAIL
  - Stale `activePetEntity` reference after scene transition (Flow 2, 10)
  - Tween targets destroyed sprite during swap (Flow 9)

- ❌ **No async race conditions** — FAIL
  - Rapid pet swap creates duplicate entities (Flow 5)
  - Metadata fetch not awaited in initialize (Flow 1)

- ⚠️ **Lifecycle ownership clearly defined** — PARTIAL
  - PetManager singleton ownership is clear
  - But cleanup on scene transition is not defined

- ❌ **All execution flows trace correctly** — FAIL
  - showPet() tween fights SpriteComponent.update() (Flow 4)
  - New pet visible while player in water after swap (Flow 9)

- ❌ **No temporal coupling violations** — FAIL
  - Tween stacking on rapid water toggle (Flow 4)
  - spawnPet() doesn't check current water state (Flow 9)

### Overall: ❌ FAIL

### Required Design Revisions

1. **PetManager.isActive() must check `activePetEntity.isDestroyed`** — prevents stale reference crashes during transitions
2. **PetManager needs cleanup on scene shutdown** — null out `activePetEntity` before `entityManager.destroyAll()`
3. **Rapid swap guard** — reject `selectNext()` while `isSwapping` is true, or use abort controller for pending fetches
4. **Kill tweens before despawn/hide/show** — call `scene.tweens.killTweensOf(sprite.sprite)` at start of hidePet(), showPet(), and despawnPet()
5. **Fix showPet() tween target** — tween `transform` component (not `sprite.sprite`) so SpriteComponent.update() doesn't fight the tween, OR disable follow component updates during tween
6. **spawnPet() must check water state** — if player is in water when pet spawns, set pet to hidden immediately
7. **Await initialize() in GameScene.create()** — ensure pet entity exists before first update frame
