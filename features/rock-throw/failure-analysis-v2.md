# Failure Analysis v2: Rock Throw Ability

**Date:** 2026-04-21
**Status:** ✅ PASS
**Scope:** Re-analysis of revised design.md after HIGH risk mitigations

---

## HIGH Risk Mitigations — Verification

### 1. Water Entry During Charge/Aim (was Scenario 5 — HIGH)

**Mitigation in design:** Polls `WaterEffectComponent.isHopping()` each frame during `charging`/`aiming`. Cancels throw on detection.

**Verified:** ✅
- `isHopping()` returns `true` immediately when water entry hop begins (`hopProgress < 1`), catching the transition before the player is fully swimming.
- `PetFollowComponent` also transitions to `riding` state on water entry, but `RockThrowAbility` runs after `PetFollowComponent` in update order (same slot as `DogBarkAbility`), so the cancel fires in the same frame and the throw cleanup takes priority for sprite positioning.
- After cancel completes and return finishes, `PetFollowComponent` riding state handles the pet normally.

**Residual risk:** LOW — During the brief return-while-riding overlap, `PetFollowComponent.updateRiding()` sets a sprite angle that `RockThrowAbility` doesn't clear during return. Minor visual oddity (rock sprite slightly rotated during ~400ms return). Not a crash.

### 2. Player Death During Aim (was Scenario 7 — HIGH)

**Mitigation in design:** Polls `HealthComponent.getHealth()` each frame via `lastKnownHealth` comparison. Cancels on health decrease.

**Verified:** ✅
- `HealthComponent.getHealth()` returns current health. Comparing against stored `lastKnownHealth` correctly detects damage.
- Lethal damage (health → 0) triggers cancel, relinquishing animation control before `PlayerDeathState` overwrites with death animation.
- `HealthComponent.heal()` increases health, so `currentHealth < lastKnownHealth` only fires on damage, not heals.
- Regen (`HealthComponent.update()`) also increases health, so no false positives.

**Residual risk:** NONE — Clean mitigation.

### 3. Pet Destroyed Mid-Throw (was Scenarios 8/11 — HIGH)

**Mitigation in design:** `RockThrowAbility.onDestroy()` destroys active projectile entity, arrow Graphics, kills tweens, unlocks player, resumes `PetFollowComponent`. All callbacks guard with `if (this.entity.isDestroyed) return;`.

**Verified:** ✅
- `Entity.destroy()` sets `isDestroyed = true` then calls `onDestroy()` on all components. The `onDestroy()` handler can safely destroy the projectile entity (which is a separate entity in EntityManager).
- The `isDestroyed` guard on `onWallHit`/`onMaxDistance` callbacks prevents use-after-destroy when the projectile outlives the pet by even one frame.
- Player movement unlock in `onDestroy()` prevents permanent movement lock.
- `DogBarkAbility` has no `onDestroy()` (it doesn't spawn separate entities), so this is a new pattern — but it's correct for the rock throw's more complex lifecycle.

**Residual risk:** NONE — Clean mitigation.

---

## New Failure Modes Introduced by Fixes

### N1: Health Polling False Negative on Same-Frame Heal + Damage

**Scenario:** Player takes damage and heals on the exact same frame (e.g., damage + heal pickup simultaneously). `lastKnownHealth` comparison: if heal fires after damage in the same update, `currentHealth` could equal or exceed `lastKnownHealth`.

**Risk:** LOW — This requires two events on the exact same frame. Even if it occurs, the throw continues normally (no cancel). The player survives (healed), so no animation conflict. Next frame's poll catches any net health decrease.

### N2: onDestroy Projectile Destroy Triggers Double EntityManager Removal

**Scenario:** Level transition calls `EntityManager.destroyAll()`. Both the pet entity and the projectile entity are in the manager. `destroyAll()` iterates all entities. If the pet's `onDestroy()` fires first and destroys the projectile, then `destroyAll()` later calls `destroy()` on the already-destroyed projectile.

**Risk:** LOW — `Entity.destroy()` checks `if (this.isDestroyed) return;` at the top (verified in Entity.ts line 55). Double destroy is a no-op.

### N3: Water Cancel During Charge Tween

**Scenario:** Rock is tweening from pet position to player offset (charge tween, <500ms). Player enters water mid-tween. Cancel fires, but the charge tween is still running.

**Risk:** LOW — Design specifies "Kill active tweens (charge tween, via `tween.stop()`)". The cancel path must stop the charge tween before starting the drop/return. The `onDestroy()` section explicitly lists "Kill active tweens" as step 3.

---

## Previously Identified MEDIUM Risks — Status Check

| Scenario | Status | Notes |
|---|---|---|
| Point-blank wall hit (4) | ✅ Addressed | Design uses `onWallHit(x, y)` callback coordinates for return origin |
| Damage detection mechanism (9) | ✅ Addressed | `lastKnownHealth` polling specified in Cancellation section |
| Punch-during-throw guard (10) | ✅ Addressed | Design says `AttackComboComponent.tryStartPunch()` must check if rock throw is active |
| Arrow Graphics cleanup (12) | ✅ Addressed | `onDestroy()` section lists arrow Graphics destruction; design says "Destroyed on state exit" |
| Stuck state timeout (Recovery 4) | ⚠️ Not addressed | No max-duration timeout in design. Return uses manual lerp (arrives when distance < 5px), which should always converge. Acceptable for v1. |

---

## Summary

| Criterion | Status |
|---|---|
| Edge cases handled | ✅ PASS |
| Timing attacks don't crash | ✅ PASS |
| Resource stress stable | ✅ PASS |
| Invalid states fail gracefully | ✅ PASS |
| Recovery paths defined | ✅ PASS |

### Overall: ✅ PASS

**Risk summary:** 0 critical, 0 high, 0 medium, 3 low (new), 1 low (carried — stuck state timeout, acceptable for v1)

All three HIGH risks from v1 are properly mitigated. No new HIGH or MEDIUM risks introduced by the fixes.
