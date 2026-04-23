# Failure Analysis: Laser Enemy

## Attack Scenarios Tested

1. Player stands in beam → continuous damage + knockback loop
2. Multiple lasers crossing same point
3. Laser aimed at grid boundary
4. Pushable moved into/out of beam path mid-frame
5. World state flag toggled rapidly
6. Laser entity with invalid angle (NaN, negative, >360)
7. Beam endpoint exactly on cell boundary
8. Player knocked back into another laser
9. All enemies in beam path killed simultaneously
10. Laser in editor mode (no damage)

---

## Scenario 1: Player Stands in Beam — Continuous Damage + Knockback Loop

### Attack

Player walks into the beam and stays there. The design specifies 50 HP damage per frame with 20px knockback. At 60fps, that's 3000 HP/sec. Player has 150 HP max → dead in 3 frames (50ms).

However, `KnockbackComponent.applyKnockback()` has a guard: `if (this.isActive) return;`. Once knockback is applied on frame 1, subsequent `applyKnockback()` calls are no-ops until the knockback completes (duration-based). This means:

- Frame 1: 50 damage + knockback starts → player pushed away
- Frame 2: 50 damage + knockback call ignored (isActive=true) → player still moving away
- Frame 3: Player likely outside beam → no more damage

The knockback guard prevents an infinite knockback loop. But damage still applies every frame with no cooldown. If the knockback direction doesn't move the player out of the beam (e.g., knockback parallel to beam), the player takes 50 damage per frame until dead.

### Risk Level

**HIGH** — The knockback-as-mitigation strategy has a failure mode: if the player is stationary and the "random direction away from beam" happens to be nearly parallel to the beam, the player stays in the beam for multiple frames. With 50 damage/frame, 3 frames = death.

Additionally, `KnockbackComponent` checks if the target cell is a wall or water. If the knockback direction leads into a wall, the knockback is replaced with a tiny nudge (`0.2` factor) that won't move the player out of the beam. The player is trapped: taking 50 damage/frame with no escape.

### Mitigation

Add a damage cooldown to `LaserBeamComponent`:

```typescript
private lastDamageTimeMs = 0;
private readonly DAMAGE_COOLDOWN_MS = 200; // 5 ticks/sec max

// In checkPlayerCollision:
if (this.pulseTimeMs - this.lastDamageTimeMs < this.DAMAGE_COOLDOWN_MS) return;
this.lastDamageTimeMs = this.pulseTimeMs;
health.takeDamage(PLAYER_DAMAGE_PER_FRAME);
```

This caps damage at 250 HP/sec instead of 3000 HP/sec, giving the player time to escape. Alternatively, ensure knockback direction is always perpendicular to the beam (never parallel).

---

## Scenario 2: Multiple Lasers Crossing Same Point

### Attack

Two or more lasers fire beams that cross at the same cell. Player stands at the intersection.

Each `LaserBeamComponent` runs independently in its own entity's update. Both will detect the player and apply damage + knockback in the same frame.

- Laser A: 50 damage + knockback in direction DA
- Laser B: 50 damage + knockback in direction DB

But `KnockbackComponent.applyKnockback()` has `if (this.isActive) return;`. So only the first laser's knockback applies. The second laser's knockback is silently dropped.

Damage stacks: 100 HP/frame from two lasers. Player dies in ~2 frames.

### Risk Level

**MEDIUM** — This is by design ("player can take damage from multiple beams simultaneously" per requirements). The stacking damage is intentional. However, the knockback-only-first behavior means the player may be knocked into the second beam rather than away from both. This is a gameplay concern, not a crash risk.

### Mitigation

No code change needed — this is accepted behavior per requirements. Level designers should be aware that beam intersections are lethal zones. If the damage cooldown from Scenario 1 is implemented, this becomes survivable.

---

## Scenario 3: Laser Aimed at Grid Boundary

### Attack

Laser at the edge of the grid fires outward (e.g., laser at col=0, angle=180 → beam goes left, immediately off-grid).

The raycast loop starts at `i=1` (first step is 4px from emitter center). For a laser at the grid edge, the first step may already be outside the grid:

```typescript
const col = Math.floor(x / this.grid.cellSize);
// col could be -1 on the first step
if (col < 0 || col >= this.grid.width || ...) {
  return { x, y }; // Returns position 4px outside grid
}
```

The beam endpoint is 4px outside the grid. The Graphics object draws a 4px line from emitter center to this point. The particle emitter is positioned 4px outside the grid. This is visually fine — the beam appears to hit the wall at the grid edge.

### Risk Level

**LOW** — The boundary check works correctly. The beam terminates at the first out-of-bounds step. The only minor issue is the beam extends 4px past the grid edge (one step), but this is visually negligible.

### Mitigation

None required. The 4px overshoot is acceptable. If pixel-perfect boundary termination is desired, clamp the endpoint to the grid boundary:

```typescript
if (col < 0 || col >= this.grid.width || row < 0 || row >= this.grid.height) {
  // Clamp to grid boundary
  const clampedX = Math.max(0, Math.min(x, this.grid.width * this.grid.cellSize));
  const clampedY = Math.max(0, Math.min(y, this.grid.height * this.grid.cellSize));
  return { x: clampedX, y: clampedY };
}
```

---

## Scenario 4: Pushable Moved Into/Out of Beam Path Mid-Frame

### Attack

A pushable entity is pushed into the beam path during the same frame that the laser's `LaserBeamComponent.update()` runs. Depending on entity update order, the beam may or may not detect the pushable.

**Case A: Pushable moves BEFORE laser updates.**
The pushable's `GridCollisionComponent` registers it in the new cell. When the laser raycasts, it finds the pushable and terminates. Correct behavior.

**Case B: Pushable moves AFTER laser updates.**
The laser raycasts with the pushable in its old position. The beam passes through the cell the pushable is moving into. Next frame, the laser detects the pushable. One frame of incorrect beam length.

**Case C: Pushable moves OUT of beam path.**
Same one-frame delay in the opposite direction — beam stays short for one frame after the pushable leaves.

### Risk Level

**LOW** — One-frame delay is imperceptible at 60fps. The beam recalculates every frame, so it self-corrects immediately. No crash risk. No persistent incorrect state.

### Mitigation

None required. The per-frame recalculation handles this naturally. The entity update order (`LaserBeamComponent` is last in its entity's update order) doesn't guarantee ordering relative to OTHER entities' updates, but the one-frame lag is acceptable.

---

## Scenario 5: World State Flag Toggled Rapidly

### Attack

A Lua script or lever rapidly toggles the laser flag: `true → false → true → false` every frame or every few frames.

The laser polls the flag every frame:
```typescript
const flagValue = WorldStateManager.getInstance().getState().flags[this.flagName];
this.isOn = flagValue !== 'false';
```

Rapid toggling causes:
- Frame N: isOn=true → raycast + render + collision
- Frame N+1: isOn=false → hide graphics, stop emitter
- Frame N+2: isOn=true → show graphics, start emitter
- ...

Each toggle calls `graphics.setVisible()`, `emitter.stop()`/`emitter.start()`. These are lightweight Phaser operations. No resource leak — the Graphics and emitter are reused, not recreated.

**Particle emitter concern:** `emitter.stop()` stops emitting new particles but existing particles continue their lifespan (100–300ms). `emitter.start()` resumes emission. Rapid stop/start may cause a brief visual flicker but no leak — particles have finite lifespans.

### Risk Level

**LOW** — No crash, no leak, no incorrect state. The laser correctly reflects the flag state each frame. Rapid toggling produces a flickering visual, which is the expected behavior.

### Mitigation

None required. If flicker is undesirable from a gameplay perspective, a minimum-on-duration could be added, but that's a design choice, not a failure.

---

## Scenario 6: Laser Entity with Invalid Angle (NaN, Negative, >360)

### Attack

Level JSON contains `"angle": NaN`, `"angle": -45`, `"angle": 720`, or `"angle": undefined`.

The angle is consumed in the constructor:
```typescript
const rad = props.angle * Math.PI / 180;
this.dirX = Math.cos(rad);
this.dirY = Math.sin(rad);
```

**NaN angle:** `NaN * Math.PI / 180 = NaN`. `Math.cos(NaN) = NaN`, `Math.sin(NaN) = NaN`. The direction vector is `(NaN, NaN)`. Every raycast step produces `NaN` coordinates. `Math.floor(NaN) = NaN`. The grid boundary check `col < 0` with NaN returns false (NaN comparisons are always false). The loop runs to `steps` iterations, producing a beam endpoint of `(NaN, NaN)`. `graphics.lineBetween(startX, startY, NaN, NaN)` — Phaser's Graphics silently draws nothing (Canvas2D ignores NaN coordinates). The particle emitter is positioned at `(NaN, NaN)` — particles won't render. **No crash, but the beam is invisible and non-functional.**

**Negative angle (-45):** `Math.cos(-45° in rad) = Math.cos(-0.785)` — valid. Produces a valid direction vector pointing up-right. The beam works correctly. Negative angles are mathematically valid.

**Angle > 360 (720):** `Math.cos(720° in rad)` — valid. `cos(4π) = 1`, `sin(4π) = 0`. Equivalent to angle=0. Works correctly.

**Undefined angle:** `undefined * Math.PI / 180 = NaN`. Same as NaN case above.

### Risk Level

**MEDIUM** — NaN/undefined angles produce a silent failure: the laser exists but does nothing. No crash, but the level designer gets no feedback that the angle is invalid. The EntityLoader defaults `angle` to `0` via `laserData.angle ?? 0`, which handles `undefined` but NOT `NaN` (since `NaN ?? 0 === NaN`).

### Mitigation

Validate angle in the factory or EntityLoader:

```typescript
const rawAngle = laserData.angle ?? 0;
const angle = Number.isFinite(rawAngle) ? rawAngle % 360 : 0;
```

This normalizes all invalid angles to 0 (beam points right). Negative angles are already valid mathematically, but normalizing to 0–359 range is cleaner.

---

## Scenario 7: Beam Endpoint Exactly on Cell Boundary

### Attack

The beam direction and emitter position cause a raycast step to land exactly on a cell boundary (e.g., `x = col * cellSize` exactly). `Math.floor(x / cellSize)` could round to either the left or right cell depending on floating-point precision.

Example: cellSize=64, beam at x=128.0 exactly. `Math.floor(128.0 / 64) = 2`. But if floating-point gives `127.99999999`, `Math.floor(127.99999999 / 64) = 1`. The beam checks cell 1 instead of cell 2.

This matters when one cell is a wall and the adjacent cell is empty. The beam could terminate one cell early or one cell late.

### Risk Level

**LOW** — The 4px step size means the beam checks many points per cell. Even if one point rounds to the wrong cell, the next step (4px later) will be firmly inside the correct cell. The visual difference is at most 4px — imperceptible. No crash risk.

### Mitigation

None required. The step-based approach is inherently robust to boundary precision issues because it samples multiple points per cell. If pixel-perfect accuracy were needed, an epsilon offset could be added, but it's unnecessary here.

---

## Scenario 8: Player Knocked Back Into Another Laser

### Attack

Player is hit by Laser A. Knockback pushes them into Laser B's beam.

Frame sequence:
1. Laser A hits player → 50 damage + knockback starts (direction away from A)
2. Knockback moves player into Laser B's beam
3. Laser B hits player → 50 damage + knockback call (but `isActive=true` from A's knockback → ignored)
4. Player continues moving in A's knockback direction (possibly deeper into B's beam)
5. A's knockback ends → player is now stationary inside B's beam
6. B hits player → 50 damage + new knockback (now isActive=false, so it applies)

The player takes damage from B every frame while A's knockback is active (knockback doesn't grant invincibility). With 50 damage/frame, the player could take 150+ damage before B's knockback kicks in.

### Risk Level

**HIGH** — This is a "pinball" scenario where the player bounces between lasers, taking massive damage with no escape. Combined with the wall-knockback issue from Scenario 1 (knockback into wall = no movement), the player can be trapped between a laser and a wall.

### Mitigation

The damage cooldown from Scenario 1's mitigation also addresses this. With a 200ms cooldown per laser, the player takes at most 250 HP/sec per laser instead of 3000 HP/sec. This gives the player time to escape after knockback ends.

Additionally, consider a brief global invincibility window after taking laser damage (similar to how many games handle hazard damage):

```typescript
// On HealthComponent or a new InvincibilityComponent
private invincibleUntilMs = 0;
// After taking laser damage:
this.invincibleUntilMs = this.pulseTimeMs + 300; // 300ms i-frames
```

---

## Scenario 9: All Enemies in Beam Path Killed Simultaneously

### Attack

5 enemies stand in the beam path. The laser's `checkEnemyCollision` iterates all entities and calls `entity.destroy()` on each one in the same frame.

```typescript
for (const entity of this.entityManager.getAll()) {
  if (entity.isDestroyed) continue; // Guard
  if (!entity.tags.has('enemy')) continue;
  // ...
  entity.destroy();
}
```

`entityManager.getAll()` returns `[...this.entities]` — a shallow copy. So the iteration is safe even if `destroy()` modifies the internal array. The `entity.isDestroyed` check guards against double-processing.

`entity.destroy()` sets `isDestroyed = true`, calls `onDestroy()` on all components, and clears the component map. The entity is removed from `EntityManager.entities` during the next `EntityManager.update()` call (the filter at the end of update).

**Concern:** When an enemy is destroyed, its `GridCollisionComponent.onDestroy()` removes it from the cell's occupant set. If the enemy was a `GridCellBlocker`, the beam should now pass through that cell. But the raycast already ran this frame — the beam endpoint was calculated before the enemies were destroyed. The beam won't extend through the now-empty cells until next frame.

This is the same one-frame delay as Scenario 4. Acceptable.

**Concern:** `entity.destroy()` calls `WorldStateManager.addDestroyedEntity()` for each enemy. With 5 enemies, that's 5 array operations on `destroyedEntities`. Negligible performance impact.

### Risk Level

**LOW** — The shallow copy from `getAll()` prevents concurrent modification issues. The `isDestroyed` guard prevents double-destroy. The one-frame beam extension delay is imperceptible. No crash, no leak.

### Mitigation

None required. The existing patterns handle this correctly.

---

## Scenario 10: Laser in Editor Mode (No Damage)

### Attack

The laser entity is created in the editor. The editor uses the same `GameScene` but entities are paused (not updated). However, the design shows a separate editor preview system (`renderLaserPreview`) that only draws a dashed line — it doesn't create a `LaserBeamComponent`.

**Concern 1:** If the editor accidentally creates a full laser entity (with `LaserBeamComponent`) and updates it, the beam would deal damage to the player entity in the editor. But the editor doesn't have a player entity, so `entityManager.getFirst('player')` returns `undefined`, and the damage check early-returns. Safe.

**Concern 2:** The editor preview raycast is simplified — it checks grid terrain only, not entity occupants. This means the preview line may show a longer beam than the actual gameplay beam (which stops at pushables, breakables, etc.). This is documented in the design as intentional.

**Concern 3:** The editor creates `Graphics` objects for the preview. If the laser entity is deleted and re-created repeatedly, the preview graphics must be cleaned up. The design uses the editor's overlay rendering system, which is cleared and redrawn each frame — no leak.

### Risk Level

**LOW** — The editor preview is a separate, simplified system that doesn't instantiate `LaserBeamComponent`. No damage, no collision, no resource leak.

### Mitigation

None required. The design correctly separates editor preview from gameplay logic.

---

## Additional Attack: Double Destroy on Laser Entity

### Attack

The laser entity is destroyed (e.g., via `suppressOnAnyFlag` or level transition) while the beam is active. `LaserBeamComponent.onDestroy()` calls `this.graphics.destroy()` and `this.emitter.destroy()`. If the entity is destroyed twice (e.g., `EntityManager.remove()` calls `destroy()`, then the cleanup filter also processes it), the Phaser objects could be destroyed twice.

### Analysis

`Entity.destroy()` sets `isDestroyed = true` on first call. The `EntityManager.update()` filters out destroyed entities and raises events. `EntityManager.remove()` calls `entity.destroy()` then splices the array. If `remove()` is called, the entity is already gone from the array before `update()` runs — no double processing.

Phaser's `Graphics.destroy()` and `ParticleEmitter.destroy()` are safe to call on already-destroyed objects (they check internal state). No crash.

### Risk Level

**LOW** — Phaser handles double-destroy gracefully. The entity system prevents double-processing.

### Mitigation

None required.

---

## Additional Attack: Raycast Performance with Diagonal Beams

### Attack

A laser at angle=45° fires diagonally across the entire grid. The raycast steps in 4px increments. For a 40×30 grid with 64px cells, the diagonal is `sqrt((40*64)² + (30*64)²) = sqrt(2560² + 1920²) ≈ 3200px`. At 4px steps, that's 800 iterations per frame per laser.

With 10 lasers, that's 8000 iterations per frame. Each iteration does: addition, multiplication, `Math.floor`, array access, property checks. This is ~0.1ms total at worst — negligible for a 16ms frame budget.

### Risk Level

**LOW** — Performance is well within budget even at maximum laser count and beam length.

### Mitigation

None required. The design's performance analysis is correct.

---

## Additional Attack: `pulseTimeMs` Overflow

### Attack

`pulseTimeMs` accumulates `delta` every frame indefinitely. After extended play (hours), this value grows large. It's used in `Math.sin(t * Math.PI * 2)` where `t = pulseTimeMs / 500`.

After 24 hours at 60fps: `pulseTimeMs ≈ 86,400,000`. `t ≈ 172,800`. `Math.sin(172800 * 2π)` — JavaScript's `Math.sin` handles large values correctly (IEEE 754 double precision maintains accuracy for values up to ~2^53). No overflow, no precision loss at these magnitudes.

### Risk Level

**LOW** — No practical overflow risk.

### Mitigation

None required. Optionally, wrap with modulo for cleanliness: `this.pulseTimeMs = this.pulseTimeMs % PULSE_PERIOD_MS;`

---

## Summary

| # | Scenario | Risk | Status |
|---|----------|------|--------|
| 1 | Continuous damage + knockback loop | **HIGH** | ❌ NEEDS MITIGATION |
| 2 | Multiple lasers crossing same point | MEDIUM | ⚠️ ACCEPTED (by design) |
| 3 | Laser aimed at grid boundary | LOW | ✅ PASS |
| 4 | Pushable moved mid-frame | LOW | ✅ PASS |
| 5 | World state flag toggled rapidly | LOW | ✅ PASS |
| 6 | Invalid angle (NaN, negative, >360) | MEDIUM | ⚠️ NEEDS VALIDATION |
| 7 | Beam endpoint on cell boundary | LOW | ✅ PASS |
| 8 | Player knocked back into another laser | **HIGH** | ❌ NEEDS MITIGATION |
| 9 | All enemies killed simultaneously | LOW | ✅ PASS |
| 10 | Laser in editor mode | LOW | ✅ PASS |
| — | Double destroy | LOW | ✅ PASS |
| — | Raycast performance | LOW | ✅ PASS |
| — | pulseTimeMs overflow | LOW | ✅ PASS |

### Success Criteria

- ✅ Edge cases handled (scenarios 3, 4, 7, 9, 10)
- ✅ Timing attacks don't crash (scenarios 5, 4)
- ✅ Resource stress stable (scenarios 9, 12)
- ⚠️ Invalid states need validation (scenario 6)
- ❌ Recovery paths incomplete (scenarios 1, 8 — player can be trapped/killed with no escape)

### Overall: CONDITIONAL PASS

**0 critical risks, 2 high risks, 2 medium risks.**

The design passes if the following mitigations are applied:

### Required Design Revisions

1. **Add damage cooldown (Scenarios 1 & 8):** The "knockback is the mitigation" strategy fails when knockback direction is parallel to the beam or knockback target is a wall. Add a per-laser damage cooldown of ~200ms so the player takes at most 250 HP/sec per laser instead of 3000 HP/sec. This is the single most important fix.

2. **Validate angle input (Scenario 6):** Add `Number.isFinite()` check in EntityLoader or factory. Default invalid angles to 0. This prevents silent NaN propagation.

### Recommended (Not Required)

3. **Ensure knockback is always perpendicular to beam (Scenario 1):** When the player is stationary, the design says "random direction away from beam." Change to "always perpendicular to beam, toward the player's side" to guarantee the player is pushed out of the beam. The design's `checkPlayerCollision` already has this logic for the stationary case — verify the "random" requirement in the feature file is updated to match.

4. **Brief invincibility after laser damage (Scenario 8):** A 200–300ms invincibility window after taking laser damage would prevent the pinball effect between multiple lasers. This could be implemented as a `lastLaserDamageTime` on the player rather than per-laser.

### Confidence Level

**HIGH** — The design is fundamentally sound. The raycast, rendering, toggle, and entity lifecycle patterns are well-established in the codebase. The two high-risk scenarios are gameplay balance issues (damage rate too high) rather than architectural flaws, and are straightforward to fix with a damage cooldown.
