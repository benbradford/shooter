# Failure Analysis: Android Collision Systems

## Attack Scenarios Tested

1. Touch joystick with slight diagonal when trying to push (dx=0.05, dy=0.95)
2. Touch joystick with slight diagonal when punching down at breakable
3. Rock thrown at platform cell (layer 1 with 'platform' property)
4. Low frame rate (30fps, 15fps) effect on punch hitbox lifetime
5. Large delta time (66ms, 100ms) effect on player position snap-back
6. Player at edge of cell punching toward breakable
7. Multiple breakables adjacent — does punch hit the right one?
8. Push engagement when player approaches at slight angle
9. Rock thrown from layer 0 toward layer 1 platform

---

## Scenario 1: Touch Joystick Slight Diagonal When Pushing

### Attack

Touch joystick input: `dx=0.05, dy=0.95` — player intends to push down.

**Code path in `PlayerWalkState`** (line 76):
```typescript
const { dx, dy } = input.getInputDelta();
```
Then (line 91):
```typescript
const pushDir = getCardinalPushDirection(dx, dy);
```
Where:
```typescript
function getCardinalPushDirection(dx: number, dy: number): Direction | null {
  if (dx !== 0 && dy !== 0) return null;  // ← STRICT EQUALITY CHECK
  ...
}
```

**`getInputDelta()` returns joystick values normalized to `[-1, 1]` via `dx / maxRadius`.**

With touch input `dx=0.05, dy=0.95`: both are non-zero → `getCardinalPushDirection` returns `null`.

### Expected Behavior

Player should engage push when input is "mostly cardinal" (e.g., 95% down, 5% right).

### Actual Behavior

**Push NEVER engages on touch joystick** unless the player achieves mathematically perfect cardinal input (`dx === 0.0000...`). This is virtually impossible with analog touch input. Floating-point values from `TouchJoystickComponent.getInputDelta()` will almost always have both axes non-zero.

**Desktop keyboard works** because `getInputDelta()` returns exactly `{dx: 0, dy: -1}` or `{dx: 0, dy: 1}` — integer values from key states.

### Risk Level

**CRITICAL** — Push mechanic is completely broken on Android touch. Easy to trigger (100% of touch inputs). No workaround for the player.

### Mitigation

Add a dead-zone threshold to `getCardinalPushDirection`:
```typescript
const CARDINAL_THRESHOLD = 0.15;

function getCardinalPushDirection(dx: number, dy: number): Direction | null {
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);
  // Treat near-zero axis as zero
  const effectiveDx = absDx < CARDINAL_THRESHOLD ? 0 : dx;
  const effectiveDy = absDy < CARDINAL_THRESHOLD ? 0 : dy;
  if (effectiveDx !== 0 && effectiveDy !== 0) return null;
  if (effectiveDx > 0) return Direction.Right;
  if (effectiveDx < 0) return Direction.Left;
  if (effectiveDy > 0) return Direction.Down;
  if (effectiveDy < 0) return Direction.Up;
  return null;
}
```

**Note:** The same bug exists in `PlayerIdleState` with `getCardinalPushDirectionIdle` — identical strict equality check, but uses `getRawInputDelta()` which is even more likely to have non-zero minor axis values (no deadzone filtering).

---

## Scenario 2: Touch Joystick Slight Diagonal When Punching Down at Breakable

### Attack

Player faces down toward a breakable, touch joystick at `dx=0.08, dy=0.92`. Player punches.

**Code path in `AttackComboComponent.createPunchHitbox()`:**

1. `updatePunchDirection()` reads `getRawInputDelta()` → `{dx: 0.08, dy: 0.92}`
2. `punchDirX = 0.08`, `punchDirY = 0.92`
3. Auto-aim loop iterates `getEnemies()` — **breakables are NOT enemies**
4. No enemy found → `dirX = 0.08, dirY = 0.92` (raw joystick values, NOT normalized to unit length)
5. Hitbox spawns at: `playerTransform + dir * 30` → offset is `(0.08*30, 0.92*30)` = `(2.4, 27.6)`
6. Hitbox follows at: `playerTransform + dir * 20` → offset is `(0.08*20, 0.92*20)` = `(1.6, 18.4)`

**Problem 1: Direction not normalized.** `Math.hypot(0.08, 0.92) = 0.923`, so the offset is only 92.3% of intended distance. The hitbox spawns at 27.6px below instead of 30px.

**Problem 2: Slight lateral drift.** The hitbox is 2.4px to the right of center. With a 44x44 hitbox and 64x64 breakable, this is within overlap range for centered targets, but...

**Problem 3: Edge case — breakable at cell boundary.** If player is slightly off-center from the breakable's column, the 2.4px lateral offset can push the 44px hitbox outside the 64px breakable box.

Concrete geometry:
- Breakable collision box: centered at cell center, 64x64 → spans ±32px from center
- Punch hitbox: 44x44 centered at spawn point → spans ±22px from spawn
- If player is 12px right of breakable center: hitbox right edge = 12 + 2.4 + 22 = 36.4px > 32px → **partial miss on right side**
- If player is 12px left: hitbox left edge = -12 + 2.4 - 22 = -31.6px, still within -32px → barely hits

On desktop with keyboard: `dirX=0, dirY=1` → hitbox perfectly centered below player. No lateral drift.

### Expected Behavior

Punching "mostly down" should reliably hit a breakable directly below the player.

### Actual Behavior

Slight diagonal input causes lateral hitbox drift. Combined with player positional offset, can cause misses that wouldn't happen on keyboard. The effect is small (2-3px) but compounds with player position offset.

### Risk Level

**MEDIUM** — The 44x44 hitbox vs 64x64 breakable gives 10px of margin per side, so most hits still land. Fails only when player is already near the edge of alignment. But on touch, players are ALWAYS slightly off-axis, making this a consistent frustration.

### Mitigation

Normalize the punch direction vector when no auto-aim target is found:
```typescript
// In createPunchHitbox(), after auto-aim loop:
if (!nearestEnemy) {
  const len = Math.hypot(dirX, dirY);
  if (len > 0) {
    dirX /= len;
    dirY /= len;
  }
}
```

Or snap to cardinal/8-way direction when input is "mostly cardinal":
```typescript
const SNAP_THRESHOLD = 0.3;
if (Math.abs(dirX) < SNAP_THRESHOLD) dirX = 0;
if (Math.abs(dirY) < SNAP_THRESHOLD) dirY = 0;
const len = Math.hypot(dirX, dirY);
if (len > 0) { dirX /= len; dirY /= len; }
```

---

## Scenario 3: Rock Thrown at Platform Cell

### Attack

Rock thrown toward a cell with `'platform'` property at layer 1.

**Code path in `RockArcComponent.update()`:**
```typescript
const cellData = this.grid.getCell(cell.col, cell.row);
const isBlocked = cellData && (
  cellData.properties.has('blocked') ||
  cellData.properties.has('wall')
);
```

Platform cells have the `'platform'` property — NOT `'blocked'` or `'wall'`.

**`Grid.isWall()` also only checks `'wall'` and `'blocked'`:**
```typescript
isWall(cell: CellData): boolean {
  return cell.properties.has('wall') || cell.properties.has('blocked');
}
```

**`BlockedAreaManager.isPointInside()`** checks polygon areas with a layer parameter. It passes `0` as the layer in `RockArcComponent` (hardcoded in the call). Platform cells are layer 1.

### Expected Behavior

Rock should stop when hitting a platform (elevated terrain that blocks movement).

### Actual Behavior

**Rock flies straight through platforms.** The rock's wall check doesn't include `'platform'` property. The `BlockedAreaManager` check uses layer 0, so layer-1 blocked areas are also skipped.

This is a **design-level bug**, not Android-specific. However, it's more noticeable on Android because:
- Touch aiming is less precise → rocks more likely to hit unintended targets
- Players may aim at enemies on platforms expecting the rock to stop at the platform edge

### Risk Level

**HIGH** — Rock passes through solid-looking terrain. Visually confusing. Affects gameplay on all platforms but more impactful on Android due to imprecise aiming.

### Mitigation

Add `'platform'` to the wall check in `RockArcComponent`:
```typescript
const isBlocked = cellData && (
  cellData.properties.has('blocked') ||
  cellData.properties.has('wall') ||
  cellData.properties.has('platform')
);
```

---

## Scenario 4: Low Frame Rate Effect on Punch Hitbox Lifetime

### Attack

At 30fps: `delta ≈ 33ms`. At 15fps: `delta ≈ 66ms`.

**`PunchHitboxComponent` lifetime logic:**
```typescript
update(delta: number): void {
  this.lifetime += delta;
  if (this.lifetime >= HITBOX_LIFETIME_MS) {  // 250ms
    this.entity.destroy();
    return;
  }
  // ... follow player
}
```

**`AttackComboComponent` hitbox creation delay:**
```typescript
if (!this.isHoldingAttack && !this.hitboxCreated && this.phaseTimer >= PUNCH_HITBOX_DELAY_MS) {  // 170ms
  this.hitboxCreated = true;
  this.createPunchHitbox();
}
```

**At 60fps (desktop):**
- Frame 0-170ms: wind-up animation
- Frame 170ms: hitbox created
- Frame 170-420ms: hitbox active (250ms lifetime)
- Total active window: 250ms across ~15 frames

**At 30fps (Android):**
- Frame 0ms, 33ms, 66ms, 99ms, 132ms, 165ms → hitbox NOT created yet (165 < 170)
- Frame 198ms: hitbox created (first frame past 170ms threshold)
- Frame 198ms, 231ms, 264ms, 297ms, 330ms, 363ms, 396ms, 429ms → at 429ms, lifetime = 231ms < 250ms
- Frame 462ms: lifetime = 264ms ≥ 250ms → destroyed
- Total active window: 264ms across ~8 frames

**At 15fps (extreme Android):**
- Frame 0ms, 66ms, 132ms → hitbox NOT created (132 < 170)
- Frame 198ms: hitbox created
- Frame 198ms, 264ms → lifetime = 66ms
- Frame 330ms → lifetime = 132ms
- Frame 396ms → lifetime = 198ms
- Frame 462ms → lifetime = 264ms ≥ 250ms → destroyed
- Total active window: 264ms across ~4 frames

**Collision check frequency:**
- At 60fps: hitbox checked ~15 times during its lifetime
- At 30fps: hitbox checked ~8 times
- At 15fps: hitbox checked ~4 times

### Expected Behavior

Punch should reliably hit targets regardless of frame rate.

### Actual Behavior

At low frame rates, the hitbox has fewer collision check opportunities. Since the hitbox follows the player at `dir * 20px` offset, and the player may be moving, the hitbox "teleports" between positions each frame. At 15fps with player moving at ~200px/s, the hitbox jumps ~13px per frame. A 44px hitbox could skip over a narrow gap between checks.

However, the breakable is 64px wide and the hitbox is 44px wide, so complete misses due to frame skipping are unlikely for stationary targets. The real risk is with moving enemies.

### Risk Level

**LOW** — For breakables (stationary, 64px), the hitbox is large enough to catch them even at low frame rates. For enemies (potentially moving), this could cause misses at very low frame rates, but that's a general low-FPS issue.

### Mitigation

No immediate fix needed for breakables. For general robustness, consider:
- Swept collision (raycast between previous and current hitbox positions)
- Or minimum frame count before hitbox expires (e.g., at least 4 collision checks)

---

## Scenario 5: Large Delta Time Effect on Player Position Snap-Back

### Attack

At 66ms delta (15fps) or 100ms delta (10fps), player moves then gets snapped back by `GridCollisionComponent`.

**`GridCollisionComponent.update()` snap-back logic:**
```typescript
if (this.checkCollision(newX, newY, gridPos)) {
  const xOnlyBlocked = this.checkCollision(newX, this.previousY, gridPos);
  const yOnlyBlocked = this.checkCollision(this.previousX, newY, gridPos);
  // ... snap back to previousX/previousY
}
```

**At 100ms delta with player speed ~200px/s:**
- Player moves 20px in one frame
- If blocked, snaps back 20px to `previousX/previousY`
- Visual: player "rubber-bands" 20px per frame

**At 16ms delta (60fps):**
- Player moves 3.2px per frame
- Snap-back is only 3.2px — imperceptible

### Expected Behavior

Collision response should feel smooth regardless of frame rate.

### Actual Behavior

At low frame rates, the snap-back distance is proportionally larger, causing visible "jittering" when walking against walls or pushables. On Android (commonly 30-45fps), this manifests as a noticeable stutter when approaching pushable objects.

**Compounding with push engagement:** The player must be blocked by `GridCellBlocker` AND have cardinal input AND be aligned. If the snap-back is large, the player's position oscillates more, making the alignment check (`offset > halfCell` where `halfCell = 64/2.5 = 25.6px`) harder to satisfy consistently.

### Risk Level

**MEDIUM** — Doesn't cause crashes but degrades UX on low-FPS Android devices. The jitter makes push engagement feel unreliable.

### Mitigation

Clamp movement per frame to prevent large snap-backs:
```typescript
const maxMovePx = this.grid.cellSize * 0.5; // 32px max per frame
const clampedX = Math.max(this.previousX - maxMovePx, Math.min(this.previousX + maxMovePx, newX));
const clampedY = Math.max(this.previousY - maxMovePx, Math.min(this.previousY + maxMovePx, newY));
```

Or use sub-stepping for large deltas.

---

## Scenario 6: Player at Edge of Cell Punching Toward Breakable

### Attack

Player stands at the bottom edge of the cell above a breakable. Player punches down.

**Geometry:**
- Cell size: 64px
- Player at cell (5, 4), position near bottom edge: `y = 4*64 + 60 = 316`
- Breakable at cell (5, 5), center: `x = 5*64 + 32 = 352, y = 5*64 + 32 = 384`
- Punch hitbox spawns at: `player.y + dirY*30 = 316 + 30 = 346`
- Punch hitbox follows at: `player.y + dirY*20 = 316 + 20 = 336`
- Hitbox box: 44x44, offset `{-22, -22}` → top edge at `336 - 22 = 314`, bottom edge at `336 + 22 = 358`
- Breakable box: 64x64, offset `{-32, -32}` → top edge at `384 - 32 = 352`, bottom edge at `384 + 32 = 416`

**Overlap check:** hitbox bottom (358) > breakable top (352) → **YES, overlaps by 6px.**

But if player is further from the edge (e.g., `y = 300`):
- Hitbox follows at `300 + 20 = 320`, bottom edge = `320 + 22 = 342`
- Breakable top = 352
- **342 < 352 → NO overlap. Miss.**

The follow offset of 20px (not 30px) is the limiting factor. The hitbox spawns at 30px but immediately snaps to 20px on the next frame.

### Expected Behavior

Player should be able to punch a breakable in the adjacent cell.

### Actual Behavior

The punch hitbox only reaches 42px from the player center (20px offset + 22px half-width). The breakable's nearest edge is 32px from its center. If the player is more than 42 + 32 = 74px from the breakable center... wait, let me recalculate.

Actually: hitbox bottom = `playerY + 20 + 22 = playerY + 42`. Breakable top = `breakableY - 32`. Overlap requires `playerY + 42 > breakableY - 32`, i.e., `breakableY - playerY < 74px`.

Cell centers are 64px apart, so `breakableY - playerY = 64px` when player is at cell center above. `64 < 74` → **hits from cell center.**

If player is at the TOP of their cell: `breakableY - playerY = 64 + 32 = 96px`. `96 > 74` → **miss.**

So the punch can only reach the breakable when the player is in the bottom ~42px of their cell (within 74px of breakable center). This is actually fine for normal gameplay — the player naturally walks toward the breakable.

On Android, the issue is that the player may be snapped back by `GridCollisionComponent` to a position further from the breakable, reducing the effective range.

### Risk Level

**LOW** — Normal gameplay positions the player close enough. The 20px follow offset is the real range limiter, but it's sufficient for adjacent cells.

### Mitigation

None needed for normal cases. If range feels short on Android, consider increasing `OFFSET_DISTANCE_PX` from 20 to 24-26px.

---

## Scenario 7: Multiple Breakables Adjacent — Does Punch Hit the Right One?

### Attack

Three breakables in a row: cells (4,5), (5,5), (6,5). Player at (5,4) punches down.

**Punch hitbox:** 44x44 at `(player.x + dirX*20, player.y + dirY*20)`.
With `dirX=0, dirY=1` (keyboard): hitbox centered at `(352, 288+20)` = `(352, 308)`.
Hitbox spans: x=[330, 374], y=[286, 330].

**Breakable collision boxes (64x64 each):**
- (4,5): x=[256, 320], y=[320, 384]
- (5,5): x=[320, 384], y=[320, 384]
- (6,5): x=[384, 448], y=[320, 384]

Hitbox y-range [286, 330] vs breakable y-range [320, 384]: overlap at y=[320, 330] = 10px overlap.
Hitbox x-range [330, 374]:
- (4,5) x=[256, 320]: 330 > 320 → **no overlap**
- (5,5) x=[320, 384]: 330 < 384 AND 374 > 320 → **overlaps**
- (6,5) x=[384, 448]: 374 < 384 → **no overlap**

**Result: Only the center breakable is hit.** ✅

**With touch diagonal (dx=0.08, dy=0.92):**
Hitbox at `(352 + 0.08*20, 288 + 0.92*20)` = `(353.6, 306.4)`.
Hitbox spans: x=[331.6, 375.6], y=[284.4, 328.4].
- (5,5) x=[320, 384]: 331.6 < 384 AND 375.6 > 320 → **overlaps**
- (6,5) x=[384, 448]: 375.6 < 384 → **no overlap** (barely)

Still only hits center. The 1.6px lateral shift isn't enough to change which breakable is hit.

### Risk Level

**LOW** — The collision geometry is forgiving enough that slight diagonal input doesn't cause wrong-target hits.

### Mitigation

None needed.

---

## Scenario 8: Push Engagement When Player Approaches at Slight Angle

### Attack

Player walks toward a pushable block from a slight angle. Touch joystick: `dx=0.12, dy=0.88`.

**Code path in `PlayerWalkState`:**

1. `getInputDelta()` returns `{dx: 0.12, dy: 0.88}` (after deadzone, still non-zero on both axes)
2. Player walks diagonally toward pushable
3. `GridCollisionComponent` detects collision with `GridCellBlocker` → sets `blockedByPushable`
4. `getCardinalPushDirection(0.12, 0.88)` → `dx !== 0 && dy !== 0` → returns `null`
5. **Push does NOT engage**

Player is visually "pushing against" the block but the push state never activates.

**Alignment check (never reached):**
```typescript
const halfCell = gridCollision.getGrid().cellSize / PUSH_ALIGNMENT_DIVISOR; // 64/2.5 = 25.6px
const offset = isHorizontalPush
  ? Math.abs(transform.y - pushableTransform.y)
  : Math.abs(transform.x - pushableTransform.x);
if (offset > halfCell) { /* not aligned */ }
```

Even if the cardinal check passed, the alignment tolerance of 25.6px is generous (40% of cell width). But we never get there because the cardinal check fails first.

### Expected Behavior

Player approaching a pushable at a slight angle should snap to cardinal push when "close enough" to cardinal.

### Actual Behavior

**Identical to Scenario 1.** Push is completely broken on touch input. The strict `dx !== 0 && dy !== 0` check prevents any push engagement with analog input.

**Additional compounding factor:** `PlayerIdleState` uses `getRawInputDelta()` for its push check, which has NO deadzone. So even if the player stops moving (enters idle state) while holding the joystick "mostly down," the raw input still has both axes non-zero → push still fails.

### Risk Level

**CRITICAL** — Same root cause as Scenario 1. Push is fundamentally broken on touch.

### Mitigation

Same fix as Scenario 1. Apply to BOTH `getCardinalPushDirection` (in PlayerWalkState) AND `getCardinalPushDirectionIdle` (in PlayerIdleState).

---

## Scenario 9: Rock Thrown from Layer 0 Toward Layer 1 Platform

### Attack

Player on layer 0 throws rock toward a platform cell on layer 1.

**Code path in `RockArcComponent.update()`:**

1. `blockedAreaManager?.isPointInside(nextX, nextY, 0)` — checks layer 0 blocked areas only
2. Platform is on layer 1 → **not checked by BlockedAreaManager**
3. Grid cell check:
```typescript
const isBlocked = cellData && (
  cellData.properties.has('blocked') ||
  cellData.properties.has('wall')
);
```
4. Platform has `'platform'` property → **not blocked**
5. Rock flies through the platform

**Additionally:** The `startLayer` parameter passed to `createRockProjectileEntity` is captured but **never used** by `RockArcComponent`. The component receives `grid` and `blockedAreaManager` but doesn't use the player's layer for any collision logic. The `isPointInside` call hardcodes layer `0`.

### Expected Behavior

Rock should stop at the platform edge (platforms are elevated terrain that should block projectiles).

### Actual Behavior

Rock passes through platforms regardless of layer. Two bugs compound:
1. `'platform'` not in the wall check
2. `BlockedAreaManager.isPointInside` called with hardcoded layer 0, missing layer-1 blocked areas

### Risk Level

**HIGH** — Same root cause as Scenario 3, but the layer mismatch adds a second failure path. Even if `'platform'` were added to the wall check, the `BlockedAreaManager` would still miss layer-1 blocked areas.

### Mitigation

1. Add `'platform'` to wall check (same as Scenario 3)
2. Pass `startLayer` through to `RockArcComponent` and use it:
```typescript
// In RockArcComponent constructor, accept startLayer
// In update():
if (this.blockedAreaManager?.isPointInside(nextX, nextY, this.startLayer)) {
  this.isStopped = true;
}
// Also check layer+1 for platforms above:
if (this.blockedAreaManager?.isPointInside(nextX, nextY, this.startLayer + 1)) {
  this.isStopped = true;
}
```

---

## Summary

| # | Scenario | Risk | Status |
|---|----------|------|--------|
| 1 | Touch joystick diagonal → push fails | **CRITICAL** | ❌ FAIL |
| 2 | Touch diagonal → punch drift at breakable | MEDIUM | ⚠️ WARN |
| 3 | Rock vs platform cell | **HIGH** | ❌ FAIL |
| 4 | Low FPS → punch hitbox lifetime | LOW | ✅ PASS |
| 5 | Large delta → snap-back jitter | MEDIUM | ⚠️ WARN |
| 6 | Edge-of-cell punch range | LOW | ✅ PASS |
| 7 | Multiple adjacent breakables | LOW | ✅ PASS |
| 8 | Slight angle push approach | **CRITICAL** | ❌ FAIL |
| 9 | Rock from layer 0 → layer 1 platform | **HIGH** | ❌ FAIL |

### Success Criteria

- ❌ Edge cases handled — Push fails on ALL touch input (Scenarios 1, 8)
- ❌ Timing attacks don't crash — No crashes, but low-FPS jitter degrades UX (Scenario 5)
- ✅ Resource stress stable — No resource leaks detected
- ❌ Invalid states fail gracefully — Rock passes through platforms silently (Scenarios 3, 9)
- ❌ Recovery paths defined — No fallback when push fails on touch

### Overall: ❌ FAIL

**2 CRITICAL risks, 2 HIGH risks, 2 MEDIUM risks**

### Required Design Revisions

1. **[CRITICAL] Fix `getCardinalPushDirection` in BOTH PlayerWalkState and PlayerIdleState** — Add threshold-based cardinal snapping for analog input. This is the #1 Android blocker.

2. **[HIGH] Add `'platform'` to RockArcComponent wall check** — One-line fix.

3. **[HIGH] Pass and use `startLayer` in RockArcComponent** — Fix the hardcoded layer-0 BlockedAreaManager check.

4. **[MEDIUM] Normalize punch direction when no auto-aim target** — Prevents lateral drift on touch input.

5. **[MEDIUM] Consider movement clamping for large deltas** — Reduces snap-back jitter on low-FPS devices.
