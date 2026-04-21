# Failure Analysis: Rock Throw Ability

## Attack Scenarios Tested

1. Rapid ability presses (spam H key)
2. Press during return phase
3. Press during active throw flight
4. Throw into adjacent wall (point-blank)
5. Throw while swimming / entering water during charge
6. Level transition during throw flight
7. Player death during aim state
8. Pet entity destroyed mid-throw
9. Player takes damage during charge (cancellation path)
10. Simultaneous punch + throw activation
11. Pet swap during active throw
12. Arrow graphics leak on state interruption
13. Projectile entity orphaned on scene cleanup
14. Rock return tween target moves (player moving)
15. Direction change at exact frame of launch

---

## Scenario 1: Rapid Ability Presses (Spam H Key)

### Attack
Player presses H key 10 times in 1 second. `PetAbilityComponent.tryAbility()` fires on each press.

### Expected Behavior
First press activates throw. Subsequent presses ignored while ability is active.

### Actual Behavior (from design)
**Two guards exist:**
1. `PetAbilityComponent` sets `cooldownMs` on activation — blocks re-fire during cooldown (3000ms).
2. `RockThrowAbility.isActive()` returns true when state !== 'idle'.

However, the design routes rock ability through `PetAbilityComponent.tryAbility()`, which currently sets cooldown *before* checking `isActive()`. Looking at the dog pattern:
```typescript
if (config.id === 'dog') {
  if (!barkAbility || barkAbility.isActive()) return false;
  barkAbility.activate(target);
  this.cooldownMs = config.abilityCooldownMs;
}
```
The `isActive()` check happens before cooldown is set. The rock path must follow the same pattern.

**If the rock path sets cooldown first (before checking isActive), the cooldown starts even on rejected presses.** This is a minor timing issue but not a crash.

### Risk Level
LOW — Cooldown + isActive() guard prevents double activation. Just ensure the implementation follows the dog pattern (check isActive before setting cooldown).

### Mitigation
Ensure rock routing in `tryAbility()` follows:
```typescript
if (config.id === 'rock') {
  if (!throwAbility || throwAbility.isActive()) return false;
  throwAbility.activate();
  this.cooldownMs = config.abilityCooldownMs;
}
```

---

## Scenario 2: Press During Return Phase

### Attack
Rock is in `returning` state (tweening back to player). Player presses H again.

### Expected Behavior
Press ignored — ability still active.

### Actual Behavior (from design)
`isActive()` returns true when state !== 'idle'. During `returning`, state is not idle, so `isActive() === true`. `PetAbilityComponent.tryAbility()` will check `isActive()` and return false.

Additionally, cooldown (3000ms) is likely still running since the full throw cycle (charge + aim + flight 500ms + return 400ms) is under 3 seconds.

### Risk Level
LOW — Double guard (isActive + cooldown) prevents this.

### Mitigation
None needed. Design handles this correctly.

---

## Scenario 3: Press During Active Throw Flight

### Attack
Rock is mid-flight as a `RockProjectileEntity`. Player presses H.

### Expected Behavior
Ignored.

### Actual Behavior (from design)
Same as Scenario 2 — `isActive()` is true during `throwing` state. Cooldown also running.

### Risk Level
LOW — Handled.

### Mitigation
None needed.

---

## Scenario 4: Throw Into Adjacent Wall (Point-Blank)

### Attack
Player faces a wall 1 tile away (32px). Rock launches with 250px max distance at 500px/sec. Rock hits wall within ~64ms (1-2 frames).

### Expected Behavior
Rock hits wall, transitions to `returning` immediately. No visual glitch.

### Actual Behavior (from design)
`ProjectileComponent` checks wall collision each frame. On hit, it calls `onWallHit` callback and `entity.destroy()`. The design says "On hit or max distance → transition to `returning`."

**Problem:** `ProjectileComponent.update()` calls `this.entity.destroy()` on wall hit. But `RockThrowAbility` needs the projectile's final position to start the return tween. If the projectile entity is destroyed, its `TransformComponent` is gone (Entity.destroy() clears all components).

The design needs `RockThrowAbility` to capture the projectile's position *before* or *during* the destroy callback. The `onWallHit(x, y)` callback provides coordinates — this is the intended path.

**Secondary concern:** At point-blank, the throw animation (frames 2→6) may not have completed when the rock already hits the wall. The player animation and the projectile lifecycle are decoupled, which is fine — the animation can finish while the rock returns.

### Risk Level
MEDIUM — The `onWallHit(x, y)` callback provides position data, so the return tween can start from those coordinates. But the implementation must use the callback coordinates, not read from the destroyed entity.

### Mitigation
In `RockThrowAbility`, use the `onWallHit(x, y)` / `onMaxDistance(x, y)` callback coordinates to set the return tween origin:
```typescript
onWallHit: (x, y) => {
  this.returnFromPosition(x, y);
}
```
Do NOT read from the projectile entity after destroy.

---

## Scenario 5: Throw While Swimming / Enter Water During Charge

### Attack
**5a:** Player is swimming, presses H.
**5b:** Player starts charging, then walks into water.

### Expected Behavior
**5a:** Ability blocked — can't use while swimming.
**5b:** Charge cancelled, rock drops and returns.

### Actual Behavior (from design)

**5a:** `PetAbilityComponent.tryAbility()` already checks:
```typescript
const water = this.entity.get(WaterEffectComponent);
if (water?.getIsInWater()) return false;
```
This blocks activation while swimming. ✅

**5b:** The design says "Player enters water during charge → cancel throw, drop rock." But there's no mechanism described for *detecting* water entry during charge/aim states. `RockThrowAbility.update()` would need to check `WaterEffectComponent.getIsInWater()` each frame.

**Additionally:** When the player enters water, `PetFollowComponent` transitions to `riding` state and the pet sprite rides on the player. If `RockThrowAbility` is active and the pet transitions to riding, the rock sprite positioning logic conflicts with the riding offset logic.

### Risk Level
HIGH — Water entry during charge/aim is not detected by the design. The pet's `PetFollowComponent` will switch to `riding` state independently, potentially conflicting with `RockThrowAbility`'s control of the rock sprite position.

### Mitigation
`RockThrowAbility.update()` must check water state each frame:
```typescript
const water = this.playerEntity.get(WaterEffectComponent);
if (water?.getIsInWater() || water?.isHopping()) {
  this.cancelThrow(); // drop rock, transition to returning
  return;
}
```
Also: `PetFollowComponent` checks `isBarking` to skip follow updates. The design should use the same pattern — set a flag (e.g., `setThrowing(true)`) so `PetFollowComponent` skips its update during throw states, preventing the riding transition from conflicting.

---

## Scenario 6: Level Transition During Throw Flight

### Attack
Rock projectile is mid-flight. Player steps on a level exit trigger. `GameScene.startLevelTransition()` fires.

### Expected Behavior
All entities cleaned up. No orphaned sprites or tweens. No crash on next level.

### Actual Behavior (from design)

Level transition flow:
1. `InputComponent.setEnabled(false)` — stops new input
2. Camera fade out (500ms)
3. `GameScene.previousEntityManager = this.entityManager` — saves for cleanup
4. Scene starts `LoadingScene`
5. On next `GameScene.create()`: `previousEntityManager.destroyAll()` — destroys all old entities

**The projectile entity** (`RockProjectileEntity`) is in the `EntityManager`, so `destroyAll()` will call `entity.destroy()` on it, which calls `onDestroy()` on all components. `ShadowComponent.onDestroy()` destroys the shadow image. `SpriteComponent.onDestroy()` (if it has one) destroys the sprite.

**The arrow Graphics object** is owned by `RockThrowAbility` (on the pet entity). When the pet entity is destroyed via `destroyAll()`, `RockThrowAbility.onDestroy()` must clean up the Graphics object.

**The return tween** — if a Phaser tween is active when the scene transitions, Phaser's scene lifecycle should handle tween cleanup. But if `RockThrowAbility` uses `scene.tweens.add()`, the tween references a potentially-destroyed sprite. Phaser tweens on destroyed targets typically fail silently, but this should be verified.

**The rock sprite** — during charge/aim, the rock sprite is the pet's own sprite (repositioned). During flight, a separate projectile entity exists. During return, a tween moves the rock sprite. If the scene transitions during return, the tween target (pet sprite) is destroyed by `destroyAll()`.

### Risk Level
MEDIUM — Entity cleanup via `destroyAll()` handles most cases. The main risks are:
1. Arrow Graphics not cleaned up in `onDestroy()`
2. Active tweens referencing destroyed sprites

### Mitigation
`RockThrowAbility.onDestroy()` must:
1. Destroy the arrow Graphics object if it exists
2. Stop any active tweens (or let Phaser handle it — tweens on destroyed objects are no-ops in Phaser 3)
3. If a projectile entity was spawned, it's in EntityManager and will be destroyed separately

---

## Scenario 7: Player Death During Aim State

### Attack
Player is in `aiming` state (holding button, arrow visible). Enemy bullet hits player, health reaches 0. `PlayerDeathState.onEnter()` fires.

### Expected Behavior
Throw cancelled. Rock drops and returns. Death animation plays.

### Actual Behavior (from design)

`PlayerDeathState.onEnter()`:
1. `walk.setEnabled(false)` — disables movement
2. Plays death animation

**Problem:** `PlayerDeathState` does NOT notify `RockThrowAbility` about the death. The ability continues running:
- `RockThrowAbility.update()` still ticks (pet entity is still alive)
- It still reads player's `InputComponent` for joystick direction
- It still controls player's `AnimationComponent` (overwriting death animation!)
- Arrow graphics still drawn
- Movement lock still active (but WalkComponent is disabled anyway)

**Critical issue:** `RockThrowAbility` overwrites the player's death animation with `throw_${dir}` frame 2. The player appears frozen in throw pose instead of playing death animation.

After death animation + fade, `reloadCurrentLevel()` calls `startLevelTransition()` which eventually calls `destroyAll()`. But during the ~2 second death sequence, the throw ability fights with the death state for animation control.

### Risk Level
HIGH — Player death animation is overwritten by throw ability. Visually broken. Easy to trigger (get hit while aiming).

### Mitigation
`RockThrowAbility.update()` must check if the player is dead or in death state:
```typescript
const health = this.playerEntity.get(HealthComponent);
if (health && health.getHealth() <= 0) {
  this.cancelThrow();
  return;
}
```
Or: the design's existing cancellation trigger ("player takes damage during charging/aiming") should also cover lethal damage. But the design only mentions damage during `charging` or `aiming` — it should also handle damage during `throwing` and `returning` states (for the animation conflict).

Actually, for `throwing` and `returning`, the ability doesn't control the player animation, so death during those states is fine. The critical fix is: on player death during `charging`/`aiming`, cancel immediately and relinquish animation control.

---

## Scenario 8: Pet Entity Destroyed Mid-Throw

### Attack
`PetManager.despawnPet()` is called while throw is active (e.g., player swaps pet via menu, or some game event destroys the pet).

### Expected Behavior
Throw cancelled cleanly. No orphaned sprites or tweens.

### Actual Behavior (from design)

`PetManager.despawnPet()` calls `activePetEntity.destroy()`. This calls `onDestroy()` on all components including `RockThrowAbility`.

**During charging/aiming:** The rock sprite IS the pet's sprite (repositioned). Destroying the pet entity destroys the sprite via `SpriteComponent.onDestroy()`. The arrow Graphics must also be cleaned up in `RockThrowAbility.onDestroy()`.

**During throwing:** A separate `RockProjectileEntity` exists in the EntityManager. Destroying the pet does NOT destroy the projectile entity. The projectile continues flying, hits something, and tries to trigger the return phase — but `RockThrowAbility` no longer exists (pet destroyed).

**During returning:** The return tween targets the pet's sprite position. If the pet is destroyed, the tween target is gone.

### Risk Level
HIGH — Orphaned projectile entity during `throwing` state. The projectile's `onWallHit`/`onMaxDistance` callbacks reference `RockThrowAbility` which is destroyed. Calling methods on a destroyed component → potential crash or undefined behavior.

### Mitigation
1. `RockThrowAbility.onDestroy()` must destroy any active projectile entity:
```typescript
onDestroy(): void {
  this.arrowGraphics?.destroy();
  this.activeProjectile?.destroy(); // clean up orphaned projectile
}
```
2. The `onWallHit`/`onMaxDistance` callbacks must check if the ability/entity is still alive before proceeding:
```typescript
onWallHit: (x, y) => {
  if (this.entity.isDestroyed) return;
  this.returnFromPosition(x, y);
}
```

---

## Scenario 9: Player Takes Damage During Charge (Cancellation Path)

### Attack
Player is in `charging` state. Enemy bullet hits player (non-lethal).

### Expected Behavior
Design says: "Rock drops 20px down from current position (quick tween). Transition to `returning`."

### Actual Behavior (from design)
The design specifies this cancellation behavior but doesn't specify HOW damage is detected. `RockThrowAbility` needs to observe player health changes.

**Options:**
- Poll `HealthComponent.getHealth()` each frame and detect decreases
- Listen for a damage event (no event system for this exists in the codebase)
- Have the damage system notify the ability directly

The codebase has no damage event system. `HealthComponent.takeDamage()` just decrements health. There's no callback or event.

**Problem:** Polling health each frame requires storing `lastHealth` and comparing. This works but is fragile — what if health changes for non-damage reasons (healing)?

### Risk Level
MEDIUM — The cancellation trigger mechanism is unspecified. Polling health works but needs careful implementation to distinguish damage from healing.

### Mitigation
Store `lastHealth` at ability activation. Each frame during `charging`/`aiming`:
```typescript
const currentHealth = health.getHealth();
if (currentHealth < this.lastHealth) {
  this.cancelThrow();
}
this.lastHealth = currentHealth;
```
This correctly detects damage (health decrease) without false-triggering on heals.

---

## Scenario 10: Simultaneous Punch + Throw Activation

### Attack
Player presses attack button and H key on the same frame.

### Expected Behavior
One action wins. No conflicting animation/movement locks.

### Actual Behavior (from design)

`PetAbilityComponent.tryAbility()` checks:
```typescript
const punch = this.entity.get(AttackComboComponent);
if (punch?.isPunching()) return false;
```

If punch starts first (same frame), `isPunching()` returns true, throw is blocked. ✅

If throw starts first, `AttackComboComponent` doesn't check for throw lock. The punch could start while throw is active, creating two competing movement/animation locks.

**WalkComponent** currently checks `AttackComboComponent.isMovementLocked()` and `AttackComboComponent.isFacingLocked()`. The design proposes adding a `throwLocked` flag or checking `RockThrowAbility.isPlayerLocked()`. If both systems set locks independently, the unlock order matters — if punch unlocks movement while throw still needs it locked, movement resumes prematurely.

### Risk Level
MEDIUM — Punch during active throw creates competing animation control. The throw locks movement via a separate mechanism from punch, so unlocking one doesn't affect the other. But animation control conflicts (throw sets frame 2, punch sets punch animation).

### Mitigation
`AttackComboComponent` should check throw state before starting a punch:
```typescript
// In AttackComboComponent, before starting punch:
const petManager = PetManager.getInstance();
const pet = petManager.getActivePetEntity();
const throwAbility = pet?.get(RockThrowAbility);
if (throwAbility?.isPlayerLocked()) return; // don't punch during throw
```
Or simpler: `PetAbilityComponent.tryAbility()` already blocks throw during punch. Add the reverse check in `AttackComboComponent`.

---

## Scenario 11: Pet Swap During Active Throw

### Attack
Player opens pet menu and swaps from rock to dog while throw is in `aiming` state.

### Expected Behavior
Throw cancelled. Rock pet despawned. Dog pet spawned.

### Actual Behavior (from design)

`PetManager.spawnPet()` calls `this.despawnPet()` first, which calls `activePetEntity.destroy()`. This triggers Scenario 8 (pet destroyed mid-throw).

Same risks apply: orphaned projectile, destroyed callbacks, arrow graphics leak.

### Risk Level
HIGH — Same as Scenario 8. Pet swap is a user-triggerable action.

### Mitigation
Same as Scenario 8. Additionally, consider blocking pet swap while throw is active:
```typescript
// In PetManager or pet swap UI:
const throwAbility = this.activePetEntity?.get(RockThrowAbility);
if (throwAbility?.isActive()) return; // block swap during throw
```

---

## Scenario 12: Arrow Graphics Leak on State Interruption

### Attack
Arrow Graphics object is created during `aiming` state. Any interruption (damage, death, water, level transition) must destroy it.

### Expected Behavior
Graphics object destroyed on any exit from `aiming` state.

### Actual Behavior (from design)
Design says: "Destroyed on state exit." But doesn't specify which exits. The arrow could leak if:
- `cancelThrow()` doesn't destroy it
- `onDestroy()` doesn't destroy it
- Direct state jump from `aiming` to `idle` (shouldn't happen per state machine, but defensive coding)

### Risk Level
MEDIUM — Graphics leak causes visual artifact (arrow stays on screen forever) and memory leak.

### Mitigation
Destroy arrow in ALL exit paths:
1. Normal exit (button release → `throwing`): destroy arrow
2. `cancelThrow()`: destroy arrow
3. `onDestroy()`: destroy arrow
4. Any state transition: destroy arrow in a `cleanupAimState()` helper called from all transitions out of `aiming`

---

## Scenario 13: Projectile Entity Orphaned on Scene Cleanup

### Attack
Scene transitions while `RockProjectileEntity` exists in EntityManager.

### Expected Behavior
Projectile destroyed with all other entities.

### Actual Behavior (from design)
`EntityManager.destroyAll()` iterates all entities and calls `destroy()`. The projectile entity is in the EntityManager (design says it's added via EntityManager). So it will be destroyed.

`ProjectileComponent` has no `onDestroy()` — it just stops updating. `SpriteComponent.onDestroy()` (if implemented) destroys the Phaser sprite. `ShadowComponent.onDestroy()` destroys the shadow image.

**Check:** Does `SpriteComponent` have `onDestroy()`?

Looking at the codebase, `SpriteComponent` likely destroys its sprite in `onDestroy()`. If not, the Phaser sprite would be orphaned.

### Risk Level
LOW — EntityManager cleanup handles this. Verify `SpriteComponent.onDestroy()` exists.

### Mitigation
Ensure `SpriteComponent.onDestroy()` calls `this.sprite.destroy()`. (Likely already implemented given the codebase patterns.)

---

## Scenario 14: Rock Return Tween Target Moves (Player Moving)

### Attack
Rock starts returning to player position. Player moves during the 400ms return tween. Rock arrives at the player's old position, not current position.

### Expected Behavior
Rock returns to player's current position (tracks player).

### Actual Behavior (from design)
Design says: "Rock tweens back to player collision box position (< 500ms)."

If implemented as a simple Phaser tween to a fixed (x, y), the rock returns to where the player WAS when the return started. If the player moves, the rock arrives at empty space, then snaps to the pet's follow position.

This is a visual glitch, not a crash. The rock would appear to land in empty space then teleport to the pet.

### Risk Level
LOW — Visual-only issue. Not a crash. The pet follow component will reposition the rock sprite on the next frame after the tween completes.

### Mitigation
Option A: Update tween target each frame to track player position.
Option B: Accept the minor visual imperfection — the return is only 400ms and the player moves slowly relative to the return speed.

Recommendation: Option B is acceptable for v1. Option A is a polish item.

---

## Scenario 15: Direction Change at Exact Frame of Launch

### Attack
Player changes joystick direction on the exact frame that the button is released (transitioning from `aiming` to `throwing`).

### Expected Behavior
Rock launches in the direction the player was facing when the button was released.

### Actual Behavior (from design)
The `aiming` state updates direction each frame based on joystick. On button release, the state transitions to `throwing`. The launch direction should be read from the current facing direction at the moment of transition.

If the direction update and the button release check happen in the same `update()` call, the order matters:
1. If direction updates first, then button release is checked → rock launches in new direction ✅
2. If button release is checked first → rock launches in old direction (one frame stale)

This is a single-frame discrepancy. Not noticeable to the player.

### Risk Level
LOW — Single-frame direction discrepancy. Imperceptible.

### Mitigation
None needed. Ensure direction is updated before checking button release in the `update()` method.

---

## Resource Stress Test: Multiple Throws in Quick Succession

### Attack
Player completes throw cycle, waits for cooldown (3s), throws again. Repeat 20 times.

### Expected Behavior
Each throw creates and destroys a projectile entity cleanly. No memory growth.

### Actual Behavior (from design)
Each throw cycle:
1. Creates arrow Graphics (destroyed on aim exit) ✅
2. Creates `RockProjectileEntity` (destroyed on hit/max distance) ✅
3. Creates return tween (completes and is GC'd) ✅
4. Shadow on projectile (destroyed via `ShadowComponent.onDestroy()`) ✅

**Potential leak:** If `RockProjectileEntity` is added to EntityManager but never removed after destroy, the EntityManager's `update()` filters out destroyed entities:
```typescript
this.entities = this.entities.filter(entity => !entity.isDestroyed);
```
So destroyed projectiles are cleaned up on the next frame. ✅

**Phaser tweens:** `scene.tweens.add()` returns a tween that is automatically cleaned up after completion. No leak. ✅

**Arrow Graphics:** Created and destroyed each aim cycle. No leak if properly destroyed. ✅

### Risk Level
LOW — No resource leaks identified, assuming proper cleanup in `onDestroy()` and state transitions.

### Mitigation
None needed beyond ensuring `onDestroy()` cleanup is thorough (covered in Scenarios 8, 12).

---

## Failure Recovery Paths

### Recovery 1: Projectile Hits Nothing (Flies Off-Screen)
**Trigger:** Rock thrown in a direction with no walls within 250px and no enemies.
**Recovery:** `ProjectileComponent` destroys entity at `maxDistance` (250px). `onMaxDistance` callback triggers return. ✅

### Recovery 2: Asset Load Failure (Rock Texture Missing)
**Trigger:** `rock_spritesheet` texture not loaded.
**Recovery:** Pet entity creation would fail or show `__MISSING` texture. This is a pre-existing issue not specific to the throw ability. The throw ability uses the pet's existing sprite during charge/aim, and the projectile uses the same spritesheet.
**Risk:** LOW — asset loading is handled at level load time.

### Recovery 3: Throw Cancelled → Return Fails
**Trigger:** `cancelThrow()` starts return tween, but tween target (pet sprite) is destroyed before tween completes.
**Recovery:** Phaser tweens on destroyed targets fail silently. The pet entity's `onDestroy()` cleans up. No crash, but the rock sprite may not visually return.
**Risk:** LOW — edge case of edge case.

### Recovery 4: Ability Stuck in Non-Idle State
**Trigger:** Bug causes state machine to get stuck (e.g., return tween never completes).
**Recovery:** No timeout mechanism in the design. The ability would be permanently locked.
**Risk:** MEDIUM — if this happens, the player can never use the ability again until level reload.
**Mitigation:** Add a maximum duration timeout (e.g., 5 seconds) that force-resets to idle:
```typescript
if (this.totalActiveTimeMs > MAX_ABILITY_DURATION_MS) {
  this.forceReset();
}
```

---

## Summary

| Criterion | Status | Notes |
|---|---|---|
| Edge cases handled | ⚠️ PARTIAL | Water entry during charge not detected (Scenario 5) |
| Timing attacks don't crash | ✅ PASS | Cooldown + isActive guards prevent double activation |
| Resource stress stable | ✅ PASS | No leaks identified with proper onDestroy |
| Invalid states fail gracefully | ❌ FAIL | Pet destroy mid-throw orphans projectile (Scenario 8) |
| Recovery paths defined | ⚠️ PARTIAL | No timeout for stuck state machine (Recovery 4) |

### Overall: FAIL

### Risk Summary
- **Critical:** 0
- **High:** 3 (Scenarios 5, 7, 8/11)
- **Medium:** 4 (Scenarios 4, 9, 10, 12)
- **Low:** 6 (Scenarios 1, 2, 3, 13, 14, 15)

### Required Design Revisions

1. **[HIGH] Water detection during charge/aim** (Scenario 5): `RockThrowAbility.update()` must check `WaterEffectComponent` each frame and cancel on water entry. Must also coordinate with `PetFollowComponent` to prevent riding state conflict (use `setThrowing(true)` pattern like `setBarking(true)`).

2. **[HIGH] Player death during aim** (Scenario 7): `RockThrowAbility.update()` must check `HealthComponent.getHealth() <= 0` and cancel immediately, relinquishing animation control so death animation plays.

3. **[HIGH] Pet destroy / pet swap during throw** (Scenarios 8, 11): `RockThrowAbility.onDestroy()` must destroy any active projectile entity. Callbacks from projectile must guard against destroyed ability entity. Consider blocking pet swap while throw is active.

4. **[MEDIUM] Damage detection mechanism** (Scenario 9): Design must specify how damage is detected — recommend polling health with `lastHealth` comparison.

5. **[MEDIUM] Punch-during-throw guard** (Scenario 10): `AttackComboComponent` should check throw lock before starting a punch, or the throw should block punch input.

6. **[MEDIUM] Arrow Graphics cleanup** (Scenario 12): All exit paths from `aiming` must destroy the arrow. Implement a `cleanupAimState()` helper.

7. **[MEDIUM] Stuck state timeout** (Recovery 4): Add a maximum ability duration timeout that force-resets to idle.
