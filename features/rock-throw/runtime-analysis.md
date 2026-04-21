# Runtime Analysis: Rock Throw Ability

## Complexity Assessment

Medium complexity — involves cross-entity state management (pet ↔ player), Phaser tweens (async), a spawned projectile entity, and Graphics lifecycle. No scene transitions or asset loading involved.

## Execution Flows Analyzed

1. **Activation → Charge → Aim → Throw → Return → Idle** (happy path)
2. **Quick Throw** (button released during charge, before rock arrives)
3. **Cancel on Damage** (player hit during charge/aim)
4. **Rapid Re-activation** (button pressed while returning)
5. **Pet Despawn During Throw** (pet swap or scene transition mid-ability)
6. **Concurrent Punch + Throw** (AttackComboComponent interaction)

---

## Flow 1: Happy Path (Charge → Aim → Throw → Return)

### Execution Trace

```
1.  Player presses pet ability button (touch or H key)
2.  PetActionButtonComponent.handlePointerDown() fires
    2.1  Gets player entity, calls PetAbilityComponent.tryAbility()
3.  PetAbilityComponent.tryAbility()
    3.1  Checks PetManager.isActive() → true
    3.2  Checks AttackComboComponent.isPunching() → false
    3.3  Checks WaterEffectComponent.getIsInWater() → false
    3.4  Checks PetFollowComponent.getIsTooFar() → false
    3.5  Gets config.id === 'rock'
    3.6  Checks cooldownMs <= 0 → true
    3.7  ⚠️ DESIGN GAP: Currently logs and returns true, no RockThrowAbility routing
    3.8  Sets cooldownMs = 3000
4.  [After modification] Gets RockThrowAbility from pet entity
    4.1  Checks rockThrowAbility.isActive() → false
    4.2  Calls rockThrowAbility.activate()
5.  RockThrowAbility.activate()
    5.1  State: idle → charging
    5.2  Gets player entity reference (via PetManager or constructor)
    5.3  Locks player movement (sets flag on WalkComponent or exposes isPlayerLocked())
    5.4  Locks player facing direction
    5.5  Plays player animation: throw_${dir} frames 0→2
    5.6  Creates tween: rock sprite from current position → player + PLAYER_THROW_OFFSETS[dir]
         Duration: 300ms [ROCK_CHARGE_TWEEN_DURATION_MS]
         [async — Phaser tween]
6.  PetFollowComponent.update() called each frame
    6.1  Checks this.isBarking → should be true (design says reuse setBarking)
    6.2  Returns early — pet follow paused ✓
7.  RockThrowAbility.update(delta) — each frame during charging
    7.1  Checks if button still held (via InputComponent.isPetActionPressed() or PetActionButtonComponent.isPressed)
    7.2  Checks if charge tween complete
    7.3  If tween complete AND button held → state: charging → aiming
    7.4  If tween complete AND button released → state: charging → throwing (skip aim)
8.  State: aiming
    8.1  Player holds frame 2 of throw_${dir}
    8.2  Reads joystick from player InputComponent.getRawInputDelta()
    8.3  Converts to 8-dir for animation, continuous angle for arrow
    8.4  Creates Phaser.GameObjects.Graphics for arrow indicator
    8.5  Draws arrow each frame (30px, blue gradient)
    8.6  On direction change: updates player anim to throw_${newDir} frame 2, repositions rock
    8.7  On button release → state: aiming → throwing
9.  State: throwing
    9.1  Continues throw animation from frame 2 to frame 6
    9.2  Destroys arrow Graphics
    9.3  Creates RockProjectileEntity via EntityManager.add()
         - TransformComponent at rock's current position
         - SpriteComponent with rock texture
         - ShadowComponent at ground level
         - ProjectileComponent/RockProjectileComponent for wall collision
         - CollisionComponent for enemy/breakable hits
         - DamageComponent(20)
    9.4  Hides pet rock sprite (or the rock sprite IS the projectile)
    9.5  ProjectileComponent.update() moves rock each frame
    9.6  Arc component interpolates Y offset -50px → 0 over flight
    9.7  On hit (CollisionComponent.onHit) or max distance (ProjectileComponent):
         - Projectile entity destroyed
         - Callback notifies RockThrowAbility → state: throwing → returning
10. State: returning
    10.1 Creates tween: rock sprite from landing position → player position
         Duration: 400ms [ROCK_RETURN_DURATION_MS]
         [async — Phaser tween]
    10.2 On tween complete:
         - State: returning → idle
         - Unlocks player movement
         - Resumes PetFollowComponent (setBarking(false))
         - Shows pet rock sprite at player position
```

### Verification Points

- Step 3.7: ✅ Design acknowledges PetAbilityComponent needs modification for rock routing
- Step 5.3: ✅ WalkComponent has `setEnabled()` and checks `InteractionComponent.isActive` — design proposes `throwLocked` flag or `isPlayerLocked()` check, both viable
- Step 6.1: ✅ PetFollowComponent.setBarking(true) pauses follow — confirmed in source
- Step 7.1: ⚠️ See Violation 1 below (button hold detection)
- Step 9.3: ✅ Entity creation pattern matches existing projectile entities
- Step 10.1: ⚠️ See Violation 3 below (return tween target)

---

## Flow 2: Quick Throw (Button Released During Charge)

### Execution Trace

```
1.  activate() called, state → charging
2.  Charge tween starts (300ms)
3.  RockThrowAbility.update() — frame N (e.g., 100ms in)
    3.1  Checks button held → false (released early)
    3.2  ⚠️ Design says "skip to throwing" — but charge tween is still running
    3.3  Rock sprite is mid-tween between pet position and player offset
4.  State: charging → throwing
    4.1  Must stop/kill the charge tween
    4.2  Rock launches from wherever it currently is
    4.3  Throw animation plays from frame 2 to 6
    4.4  Projectile entity created at rock's current (mid-tween) position
```

### ⚠️ Risk: Orphaned Charge Tween

If the charge tween is not explicitly killed when transitioning to `throwing` early, it will continue running and reposition the rock sprite after the projectile has already been created. The tween's `onComplete` callback may also fire later, causing a spurious state transition.

**Recommendation:** Always call `tween.stop()` or `tween.remove()` on the charge tween when leaving `charging` state for any reason.

---

## Flow 3: Cancel on Damage

### Execution Trace

```
1.  State: charging or aiming
2.  Enemy projectile hits player
    2.1  CollisionComponent.onHit() fires on player entity
    2.2  health.takeDamage(amount)
    2.3  HitFlashComponent.flash(300)
3.  ⚠️ How does RockThrowAbility know damage occurred?
    3.1  HealthComponent has NO damage callback/event system
    3.2  No observer pattern on takeDamage()
4.  [If notified] RockThrowAbility cancels:
    4.1  Kills charge tween (if charging)
    4.2  Destroys arrow Graphics (if aiming)
    4.3  Tweens rock 20px down from current position
    4.4  State → returning
```

### ❌ VIOLATION 1: No Damage Notification Mechanism

**Type:** Missing Integration Point

**Location:** design.md — "Cancellation" section

**Problem:** The design states "If player takes damage during charging or aiming → cancel throw." However, `HealthComponent.takeDamage()` has no callback, event, or observer mechanism. There is no way for `RockThrowAbility` to be notified that the player took damage.

**Why it fails:** `RockThrowAbility` lives on the pet entity. The player's `CollisionComponent.onHit` fires on the player entity. There is no cross-entity notification path.

**Current patterns in codebase:**
- `AttackComboComponent` checks `WaterEffectComponent.isHopping()` each frame (polling)
- `WalkComponent` checks `AttackComboComponent.isMovementLocked()` each frame (polling)
- No event bus or observer pattern exists for damage

**Fix options (in order of simplicity):**

1. **Polling (matches codebase pattern):** `RockThrowAbility.update()` stores `lastKnownHealth` and compares to `HealthComponent.getHealth()` each frame. If decreased → cancel. Simple, no new infrastructure.

2. **Direct reference:** Pass player's `HealthComponent` to `RockThrowAbility` constructor. Poll health each frame.

3. **Callback on HealthComponent:** Add `onDamage` callback to `HealthComponent`. More invasive, changes shared component.

**Recommendation:** Option 1 (polling). Matches existing patterns, zero infrastructure changes.

---

## Flow 4: Rapid Re-activation (Button During Return)

### Execution Trace

```
1.  State: returning (rock tweening back to player)
2.  Player presses ability button
3.  PetAbilityComponent.tryAbility()
    3.1  Gets RockThrowAbility
    3.2  Checks isActive() → true (state !== 'idle')
    3.3  Returns false — ability blocked ✓
4.  ⚠️ But cooldownMs was already set to 3000 in the original activation
    4.1  If return takes 400ms, cooldown has 2600ms remaining
    4.2  Even after return completes (state → idle), cooldown still blocks
    4.3  This is correct behavior ✓
```

### Verification: ✅ No violation

The design correctly states "Ability button pressed while rock is returning → ignored (isActive() = true)." The cooldown timer provides additional protection after return completes.

---

## Flow 5: Pet Despawn During Throw

### Execution Trace

```
1.  State: throwing (projectile entity in flight)
2.  Player swaps pet (PetManager.selectNext())
    2.1  PetManager.despawnPet() called
    2.2  activePetEntity.destroy() called
    2.3  All components on pet entity get onDestroy()
    2.4  RockThrowAbility.onDestroy() fires
3.  ⚠️ Projectile entity is a SEPARATE entity in EntityManager
    3.1  Pet entity destroyed, but projectile entity still alive
    3.2  Projectile's onHit/onComplete callbacks reference RockThrowAbility
    3.3  RockThrowAbility is destroyed → callback fires on destroyed component
```

### ❌ VIOLATION 2: Orphaned Projectile Entity on Pet Despawn

**Type:** Lifecycle Ownership

**Location:** design.md — "Rock Projectile Entity" section

**Problem:** The projectile entity is added to `EntityManager` as a separate entity. When the pet entity is destroyed (pet swap, scene transition), the projectile entity continues to exist. Its `onHit`/`onComplete` callbacks reference `RockThrowAbility` which has been destroyed.

**Why it fails:**
- Callback fires → accesses `this.entity` (pet entity) → `entity.isDestroyed === true`
- Tries to start return tween on destroyed pet → crash or silent failure
- Arrow Graphics may not be cleaned up
- Player movement may remain locked forever

**Fix:** `RockThrowAbility.onDestroy()` must:
1. Destroy the projectile entity if it exists (store reference)
2. Destroy arrow Graphics if they exist
3. Kill any active tweens (charge tween, return tween)
4. Unlock player movement
5. Resume PetFollowComponent (though pet is being destroyed, this is defensive)

**Additionally:** The projectile's `onHit`/`onComplete` callbacks should guard against `this.entity.isDestroyed` before accessing RockThrowAbility state.

---

## Flow 6: Concurrent Punch + Throw

### Execution Trace

```
1.  State: charging or aiming (player movement locked by RockThrowAbility)
2.  Player presses attack button
3.  AttackComboComponent.tryStartPunch()
    3.1  Checks currentPhase !== 'idle' → false (idle, can punch)
    3.2  ⚠️ No check for RockThrowAbility active state
    3.3  Starts punch animation → overwrites throw animation
    3.4  AttackComboComponent.isFacingLocked() → true
    3.5  WalkComponent skips facing updates
4.  Both systems fight over player animation:
    4.1  RockThrowAbility.update() sets throw_${dir} frame 2
    4.2  AttackComboComponent.update() advances punch animation
    4.3  Animation flickers between throw and punch frames
```

### ❌ VIOLATION 3: No Mutual Exclusion Between Punch and Throw

**Type:** State Conflict

**Location:** design.md — "Player Integration" section

**Problem:** The design locks movement via `WalkComponent` but does not prevent `AttackComboComponent` from starting a punch during charge/aim. Both systems independently control the player's `AnimationComponent`.

**Why it fails:**
- Both write to `AnimationComponent` each frame
- `AttackComboComponent` has its own facing lock that conflicts with throw's facing lock
- Player animation becomes unpredictable

**Fix:** Add a guard in `AttackComboComponent.tryStartPunch()`:
```typescript
// Check if rock throw is active
const petManager = PetManager.getInstance();
const pet = petManager.getActivePetEntity();
const rockThrow = pet?.get(RockThrowAbility);
if (rockThrow?.isActive()) return;
```

Or simpler: `PetAbilityComponent.tryAbility()` already checks `isPunching()`. Add the reverse check in `tryStartPunch()`.

---

## Lifecycle Ownership Table

| Resource | Created By | Destroyed By | Lifetime | Used By |
|----------|-----------|--------------|----------|---------|
| Arrow Graphics | RockThrowAbility (aim state entry) | RockThrowAbility (aim state exit / cancel / onDestroy) | Aim state only | Renderer |
| Charge Tween | RockThrowAbility.activate() | RockThrowAbility (on charge complete / early release / cancel / onDestroy) | Charging state | Phaser TweenManager |
| Return Tween | RockThrowAbility (throwing→returning) | RockThrowAbility (on return complete / onDestroy) | Returning state | Phaser TweenManager |
| RockProjectileEntity | RockThrowAbility (throwing state entry) | ProjectileComponent (wall/max distance) or CollisionComponent (enemy hit) or RockThrowAbility.onDestroy() | Throwing state | EntityManager, CollisionSystem |
| Projectile SpriteComponent | RockProjectileEntity factory | Entity.destroy() → SpriteComponent.onDestroy() | Projectile lifetime | Renderer |
| Projectile ShadowComponent | RockProjectileEntity factory | Entity.destroy() → ShadowComponent.onDestroy() | Projectile lifetime | Renderer |
| Player animation control | RockThrowAbility.activate() | RockThrowAbility (idle state entry / onDestroy) | Active ability duration | AnimationComponent |
| Player movement lock | RockThrowAbility.activate() | RockThrowAbility (idle state entry / onDestroy) | Charging + Aiming states | WalkComponent |
| PetFollowComponent pause | RockThrowAbility.activate() (setBarking(true)) | RockThrowAbility (idle state entry) (setBarking(false)) | Active ability duration | PetFollowComponent |

### Ownership Violations

1. **Arrow Graphics:** Must be destroyed in ALL exit paths from aiming state (throw, cancel, pet despawn). Design mentions "Destroyed on state exit" but doesn't specify onDestroy cleanup. **Risk: leaked Graphics object.**

2. **Tweens:** Phaser tweens are managed by the scene's TweenManager. If the tween target (sprite) is destroyed, the tween may throw. Must store tween references and call `.stop()` in onDestroy. **Risk: tween on destroyed sprite.**

3. **Player movement lock:** If RockThrowAbility is destroyed without cleanup, player movement stays locked forever. **Risk: soft-lock.**

---

## Temporal Coupling Risks

### Risk 1: Charge Tween Completion vs Button State Check

```
Frame N:   Charge tween completes → sets internal flag
Frame N:   RockThrowAbility.update() checks button held
           ↓ [assumes tween completion flag is set in same frame]
```

**Assessment:** Low risk. Both happen in the same update loop. Phaser tweens update before scene update by default. The tween's `onComplete` callback fires during tween update, which sets the flag before `RockThrowAbility.update()` runs. ✅ Safe if using `onComplete` callback.

**However:** If checking tween progress via `tween.progress >= 1` instead of `onComplete`, there's a frame where progress is exactly 1.0 but the check hasn't run yet. Use `onComplete` callback, not progress polling.

### Risk 2: Projectile Destruction vs Return Tween Start

```
ProjectileComponent.update():
  distanceTraveled >= maxDistance
  → calls onMaxDistance callback
  → entity.destroy()
  
onMaxDistance callback:
  → RockThrowAbility notified
  → starts return tween from projectile's last position
  ⚠️ But projectile entity is already destroyed
  → TransformComponent no longer accessible
```

**Assessment:** Medium risk. The callback fires BEFORE `entity.destroy()` in `ProjectileComponent.update()` (line: `this.onMaxDistance?.(transform.x, transform.y)` then `this.entity.destroy()`). The callback receives `(x, y)` coordinates directly. ✅ Safe if RockThrowAbility captures the x,y from the callback parameters rather than reading from the projectile's TransformComponent.

**But:** For `CollisionComponent.onHit()`, the collision is detected by `CollisionSystem` externally. Need to verify the callback receives position data. Looking at `CollisionComponent.onHit(other: Entity)` — it only receives the other entity, not position. RockThrowAbility would need to read the projectile's position before destroying it.

**Fix:** In the `onHit` callback, capture `transform.x, transform.y` before calling `entity.destroy()`.

### Risk 3: Return Tween Target is Moving Player

```
Return tween created:
  target = { x: playerTransform.x, y: playerTransform.y }
  ⚠️ Player moves during 400ms return
  → Rock returns to stale position
```

**Assessment:** Low-medium risk. This is a visual issue, not a crash. The rock will tween to where the player WAS, not where they ARE.

**Fix options:**
1. Update tween target each frame (complex, Phaser tweens don't natively support moving targets)
2. Use manual interpolation in `update()` instead of a Phaser tween — lerp toward `playerTransform` each frame
3. Accept the visual imperfection (rock arrives at old position, then snaps to player)

**Recommendation:** Option 2 (manual lerp). Matches the pattern used in `PetFollowComponent.moveToward()`. More robust than a tween for a moving target.

---

## Async Boundary Analysis

### Boundary 1: Charge Tween (300ms)

**Type:** Phaser Tween (async, scene-managed)

**State assumptions after boundary:**
- Button may have been released → must check each frame
- Player may have taken damage → must poll health
- Pet may have been despawned → tween target destroyed

**Guard:** Store tween reference. In `onDestroy()`, call `tween.stop()`. In `onComplete`, verify `this.entity.isDestroyed === false` before transitioning state.

### Boundary 2: Return Tween (400ms)

**Type:** Phaser Tween (async, scene-managed)

**State assumptions after boundary:**
- Pet may have been despawned during return
- Player may have died during return

**Guard:** Same as Boundary 1. Additionally, verify player entity is still alive before unlocking movement.

### Boundary 3: Projectile Flight (variable duration, ~500ms at 500px/s for 250px)

**Type:** Entity update loop (synchronous per-frame, but variable duration)

**State assumptions after boundary:**
- RockThrowAbility may have been destroyed (pet despawn)
- Scene may have transitioned

**Guard:** Projectile callbacks must check `entity.isDestroyed` on the pet entity before accessing RockThrowAbility. Or use a simple flag/reference that gets nulled on destroy.

### Boundary 4: PetActionButtonComponent.isPressed (continuous)

**Type:** Pointer state (async input)

**Problem:** The design needs to detect button hold state. `PetActionButtonComponent` tracks `isPressed` via pointer events. But `RockThrowAbility` lives on the pet entity and needs to read this state from the HUD scene's button component.

**Current state:** `InputComponent.isPetActionPressed()` only checks keyboard H key: `return this.slideKey?.isDown ?? false`. It does NOT check `PetActionButtonComponent.isPressed`.

### ❌ VIOLATION 4: Touch Button Hold State Not Accessible

**Type:** Missing Integration Point

**Location:** design.md — "Button Hold Detection" section

**Problem:** The design says `RockThrowAbility` checks if ability button is held each frame. For keyboard, `InputComponent.isPetActionPressed()` works (checks H key). For touch, `PetActionButtonComponent.isPressed` is on a HUD entity in a different scene. There's no path from `RockThrowAbility` (pet entity, game scene) to `PetActionButtonComponent` (HUD entity, HUD scene).

**Why it fails:** Touch players cannot aim — the hold state is never detected, so the ability immediately transitions from charging to throwing on the next frame after the tween completes (button appears "not held").

**Fix:** Either:
1. Add `isPetActionHeld()` to `InputComponent` that checks both keyboard AND touch button state (requires passing `PetActionButtonComponent` reference to `InputComponent`)
2. Have `PetActionButtonComponent` set a flag on `PetAbilityComponent` (player entity) that `RockThrowAbility` can read
3. Use a simple global/singleton for button state

**Recommendation:** Option 2. `PetActionButtonComponent` already accesses the player entity to call `tryAbility()`. Add `setAbilityHeld(boolean)` to `PetAbilityComponent`.

---

## Race Condition Analysis

### Race 1: Pet Swap During Active Ability

```
Thread 1: RockThrowAbility.update() running
Thread 2: PetManager.selectNext() → despawnPet() → entity.destroy()
```

**Assessment:** Not a real race — JavaScript is single-threaded. `selectNext()` is called from UI input, which fires between frames. The destroy happens atomically before the next update loop. ✅ Safe from threading perspective.

**However:** The destroy sets `entity.isDestroyed = true` and clears components. If `RockThrowAbility.update()` is mid-execution when another component on the same entity triggers destroy... No — `Entity.update()` checks `isDestroyed` between each component update. ✅ Safe.

### Race 2: Projectile Hit + Max Distance in Same Frame

```
Frame N:
  CollisionSystem detects hit → calls onHit → entity.destroy()
  ProjectileComponent.update() → distanceTraveled >= maxDistance → entity.destroy()
```

**Assessment:** `Entity.destroy()` sets `isDestroyed = true`. Second call to destroy is a no-op (components already cleared). But the `onHit` callback and `onMaxDistance` callback could both fire, causing RockThrowAbility to receive two notifications.

**Fix:** RockThrowAbility should guard against double notification:
```typescript
if (this.state !== 'throwing') return; // Already transitioned
```

### Race 3: Damage Cancel + Button Release in Same Frame

```
Frame N:
  Player takes damage → RockThrowAbility cancels → state: returning
  Button released → RockThrowAbility checks button → already returning
```

**Assessment:** ✅ Safe. State machine prevents double transition. If state is already `returning`, button release check is irrelevant.

---

## Summary

| Criterion | Status | Notes |
|-----------|--------|-------|
| No resource destroyed while referenced | ⚠️ RISK | Orphaned projectile on pet despawn (Violation 2) |
| No async race conditions | ✅ PASS | Single-threaded, state machine guards |
| Lifecycle ownership clearly defined | ⚠️ RISK | Arrow Graphics, tweens need explicit cleanup in onDestroy |
| All execution flows trace correctly | ❌ FAIL | Missing damage notification (V1), missing touch hold (V4) |
| No temporal coupling violations | ⚠️ RISK | Return tween targets stale position (Risk 3) |

### Overall: ❌ FAIL — Design revisions required

### Required Design Revisions

1. **Violation 1 (Critical):** Define damage detection mechanism. Recommend health polling pattern.

2. **Violation 2 (Critical):** Add `onDestroy()` to RockThrowAbility that:
   - Destroys active projectile entity
   - Destroys arrow Graphics
   - Kills active tweens (charge, return)
   - Unlocks player movement
   - Resumes PetFollowComponent

3. **Violation 3 (Medium):** Add mutual exclusion between punch and throw. Either:
   - `AttackComboComponent.tryStartPunch()` checks `RockThrowAbility.isActive()`
   - Or `RockThrowAbility.activate()` checks `AttackComboComponent.isPunching()` (already done in `PetAbilityComponent.tryAbility()`, but punch can START after throw activates)

4. **Violation 4 (Critical for touch):** Define how touch button hold state reaches `RockThrowAbility`. Recommend `PetAbilityComponent.setAbilityHeld()` flag set by `PetActionButtonComponent`.

5. **Risk 3 (Medium):** Use manual lerp for return instead of Phaser tween, to track moving player position.

6. **Cleanup guards:** All tween `onComplete` callbacks and projectile callbacks must check `entity.isDestroyed` before accessing state.
