# Failure Analysis: Blocked Areas (Revision 2)

> Re-analysis after design revision addressing 4 previously identified issues.
> Previous analysis: 2026-04-08T08:10
> This revision: 2026-04-08T09:15

## Design Fixes Under Review

| # | Previous Issue | Previous Risk | Fix Applied |
|---|---------------|---------------|-------------|
| 1 | AABB construction mismatch | CRITICAL | Centered convention: `x + offsetX - width/2` |
| 2 | CCW winding passes silently | HIGH | `ensureClockwise()` auto-correction before validation |
| 3 | Degenerate polygons accepted | HIGH | `hasNonZeroCross` + `computeNormals()` null on zero-length edge |
| 4 | Polygon-wall squeeze | HIGH | 40px wall-gap editor warning + documented constraint |

---

## Fix 1 Verification: AABB Centered Convention ✅ ADEQUATE

With `collisionBox = { offsetX: 0, offsetY: 24, width: 34, height: 16 }`, player at `(100, 200)`:

**GridCollisionComponent:** `boxLeft = 100 + 0 - 17 = 83, boxTop = 200 + 24 - 8 = 216`
**BlockedAreaCollisionComponent (revised):** `aabb.x = 100 + 0 - 17 = 83, aabb.y = 200 + 24 - 8 = 216`

Both produce `[83, 216] → [117, 232]`. Identical bounds. Fix is correct.

---

## ❌ Fix 2 Verification: ensureClockwise() — NEW CRITICAL BUG INTRODUCED

### The Problem

`ensureClockwise()` and `isConvex()` use **opposite winding conventions**. The auto-correction reverses valid polygons into invalid ones, causing ALL polygons to be rejected.

### Proof by Trace

**Test polygon: square `[{0,0}, {0,48}, {48,48}, {48,0}]`** (visually CCW in screen space)

**Step 1 — `isConvex` alone (without ensureClockwise):**
```
i=0: a=(0,0), b=(0,48), c=(48,48)
  cross = (0-0)*(48-48) - (48-0)*(48-0) = 0 - 2304 = -2304 ≤ 0 ✓
i=1: a=(0,48), b=(48,48), c=(48,0)
  cross = (48-0)*(0-48) - (0-48)*(48-48) = -2304 - 0 = -2304 ≤ 0 ✓
i=2: a=(48,48), b=(48,0), c=(0,0)
  cross = (0-48)*(0-0) - (-48-0)*(-48-48) = 0 - (-48)(-48)... 
  = (0)(0) - (-48)(-48) = -2304 ≤ 0 ✓
i=3: cross = -2304 ≤ 0 ✓
hasNonZeroCross = true → returns TRUE ✅
```

This polygon passes `isConvex`. It's the winding `isConvex` expects (all cross products ≤ 0).

**Step 2 — `ensureClockwise` on the same polygon:**
```
i=0: a=(0,0), b=(0,48): (0-0)*(48+0) = 0
i=1: a=(0,48), b=(48,48): (48-0)*(48+48) = 4608
i=2: a=(48,48), b=(48,0): (48-48)*(0+48) = 0
i=3: a=(48,0), b=(0,0): (0-48)*(0+0) = 0
area = 4608 > 0 → REVERSES to [{48,0}, {48,48}, {0,48}, {0,0}]
```

**Step 3 — `isConvex` on the reversed polygon `[{48,0}, {48,48}, {0,48}, {0,0}]`:**
```
i=0: a=(48,0), b=(48,48), c=(0,48)
  cross = (48-48)*(48-48) - (48-0)*(0-48) = 0 - (48)(-48) = 2304 > 0 → returns FALSE ❌
```

**Result:** `ensureClockwise` takes a polygon that `isConvex` accepts, reverses it, and `isConvex` then rejects it. Every valid polygon is destroyed by the auto-correction.

### Root Cause

In screen coordinates (Y-down), the cross-product sign convention is flipped from math convention:
- `isConvex` requires all cross products ≤ 0 → this accepts what is **visually CCW** in screen space
- `ensureClockwise` treats positive shoelace area as "needs reversal" → but positive area corresponds to the **same winding** that `isConvex` accepts

The two functions disagree on which sign means "clockwise."

### Risk Level

**CRITICAL** — Every polygon is rejected at load time. The blocked areas system is completely non-functional. No polygons survive the constructor pipeline.

### Mitigation

Flip the condition in `ensureClockwise`:

```typescript
function ensureClockwise(vertices: ReadonlyArray<Vec2>): Vec2[] {
  let area = 0;
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i];
    const b = vertices[(i + 1) % vertices.length];
    area += (b.x - a.x) * (b.y + a.y);
  }
  if (area < 0) {                          // ← was: area > 0
    return [...vertices].reverse();
  }
  return [...vertices];
}
```

With this fix, `area < 0` (the winding `isConvex` rejects) gets reversed, and `area > 0` (the winding `isConvex` accepts) is kept. Both functions then agree.

**Alternative:** Rename to `ensureIsConvexWinding` to avoid confusion about what "clockwise" means in screen space, and add a comment explaining the convention.

---

## Fix 3 Verification: Degenerate Polygon Rejection ✅ ADEQUATE

### Attack A — Collinear vertices `[{0,0}, {5,0}, {10,0}]`:
```
All cross products = 0 → hasNonZeroCross stays false → isConvex returns false ✅
```
Rejected. Previously passed.

### Attack B — Duplicate vertices `[{0,0}, {0,0}, {10,10}]`:
```
computeNormals(): edge (0,0)→(0,0): len=0 → returns null ✅
```
Rejected. Previously caused NaN normals.

### Attack C — Near-zero area `[{0,0}, {100,0}, {100,0.001}]`:
```
cross products are non-zero (tiny but non-zero) → isConvex returns true
computeNormals(): all edges have len > 0 → returns normals
```
Passes validation. SAT overlap on thin axis is sub-pixel — effectively invisible to player collision but blocks pathfinding cells along the line. This is acceptable; the polygon is technically valid geometry.

Fix is adequate for attacks A and B. Attack C is a non-issue (valid geometry, just very thin).

---

## Fix 4 Verification: 40px Wall-Gap Warning ✅ ADEQUATE (advisory)

The design adds `warnIfNearWalls()` that checks a 3×3 cell neighborhood around each vertex. This is advisory only — it does not prevent placement.

**Trace:** Vertex at (100, 100), cellSize=48. Cell = (2,2). Checks cells (1,1) through (3,3). For each wall cell, computes distance from vertex to wall center. If < 40 + 24 = 64px, warns.

This is sufficient for Phase 1. The squeeze scenario (Scenario 6) remains a level design constraint, not a runtime fix. The warning helps designers avoid it.

---

## Re-Run: All 10 Attack Scenarios

## Scenario 1: Knockback Into Polygon — ❌ MEDIUM (unchanged)

Same as previous analysis. Knockback pushes player in, MTV pushes out, repeats for ~300ms causing jitter. Not affected by any of the 4 fixes.

**Status:** Accepted for Phase 1 per previous decision.

---

## Scenario 2: Spawn Inside Polygon — ✅ PASS (unchanged)

MTV push-out on first frame + `hasWarned` console message. Works correctly.

---

## Scenario 3: Degenerate Polygon — ✅ PASS (fixed)

Previously HIGH. Now collinear vertices rejected by `hasNonZeroCross`, zero-length edges rejected by `computeNormals() → null`. See Fix 3 verification above.

---

## Scenario 4: Polygon on Cell Boundary — ✅ PASS (unchanged)

SAT handles boundary-aligned vertices correctly. `overlap <= 0` means touching-not-overlapping = no collision.

---

## Scenario 5: Shared-Edge Ping-Pong — ❌ MEDIUM (unchanged)

Sequential resolution with AABB update handles axis-aligned shared edges. Diagonal shared edges could cause single-frame position error. Not affected by any of the 4 fixes.

**Status:** Accepted for Phase 1 per previous decision.

---

## Scenario 6: Polygon-Wall Squeeze — ✅ PASS (mitigated)

Previously HIGH. Now mitigated by 40px wall-gap editor warning + documented level design constraint. Runtime behavior unchanged, but the failure mode is prevented by design guidance.

---

## Scenario 7: Projectile From Inside Polygon — ✅ PASS (unchanged)

Level design concern, not a system bug. Enemies shouldn't be placed inside polygons.

---

## Scenario 8: Zero Blocked Areas — ✅ PASS (unchanged)

`?? []` handles null/undefined. Empty iteration = zero overhead.

---

## Scenario 9: CCW Winding Order — ❌ CRITICAL (fix is broken — see Fix 2 verification)

Previously HIGH (CCW passed silently with inverted point-in-polygon). The `ensureClockwise()` fix was intended to auto-correct CCW→CW, but the sign convention is inverted relative to `isConvex()`. Result: ALL polygons (both CW and CCW input) are rejected.

See detailed trace in Fix 2 verification above.

---

## Scenario 10: Level-Spanning Polygon — ✅ PASS (unchanged)

SAT finds minimum translation, pushes player to nearest edge. Pathfinder marks all cells blocked. Correct behavior for a nonsensical level design.

---

## Summary

| # | Scenario | Result | Risk | Change |
|---|----------|--------|------|--------|
| 1 | Knockback into polygon | ❌ FAIL | MEDIUM | Unchanged, accepted |
| 2 | Spawn inside polygon | ✅ PASS | LOW | Unchanged |
| 3 | Degenerate polygon | ✅ PASS | — | **Fixed** ✅ |
| 4 | Polygon on cell boundary | ✅ PASS | LOW | Unchanged |
| 5 | Shared-edge ping-pong | ❌ FAIL | MEDIUM | Unchanged, accepted |
| 6 | Polygon-wall squeeze | ✅ PASS | — | **Mitigated** ✅ |
| 7 | Projectile from inside | ✅ PASS | LOW | Unchanged |
| 8 | Zero blocked areas | ✅ PASS | NONE | Unchanged |
| 9 | CCW winding order | ❌ FAIL | **CRITICAL** | **Fix broken — new bug** |
| 10 | Level-spanning polygon | ✅ PASS | LOW | Unchanged |
| B | AABB mismatch | ✅ PASS | — | **Fixed** ✅ |

### Overall: ❌ FAIL

- **1 CRITICAL** risk: `ensureClockwise()` sign convention inverted — all polygons rejected
- **2 MEDIUM** risks: knockback jitter, shared-edge ping-pong (both accepted for Phase 1)

### Required Design Revision

**CRITICAL — Fix `ensureClockwise()` sign convention:**

Change `if (area > 0)` to `if (area < 0)` so that the winding auto-correction agrees with `isConvex()`:

```typescript
function ensureClockwise(vertices: ReadonlyArray<Vec2>): Vec2[] {
  let area = 0;
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i];
    const b = vertices[(i + 1) % vertices.length];
    area += (b.x - a.x) * (b.y + a.y);
  }
  if (area < 0) {
    return [...vertices].reverse();
  }
  return [...vertices];
}
```

### Confidence Level (after this fix is applied)

- **Design correctness:** 92%
- **Implementation risk:** LOW
- **Remaining concerns:** Knockback jitter (cosmetic), shared-edge edge cases (unlikely with <10 polygons)
