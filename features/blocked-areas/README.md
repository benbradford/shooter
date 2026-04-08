# Blocked Areas System — Implementation Guide

## For New Kiro Sessions

### Quick Start

Say: "Implement the blocked areas system from features/blocked-areas/"

### What's Already Done

- [x] Feature request documented
- [x] Clarifying questions answered (10 categories, 30+ questions)
- [x] Requirements documented (11 requirements)
- [x] Design documented (architecture, SAT algorithm, all components)
- [x] Runtime analysis passed (1 minor editor-only violation — ID generation fixed in design)
- [x] Failure analysis passed (2 passes — ensureClockwise sign fix, degenerate rejection, wall-gap warning)
- [x] Tasks broken down (2 phases, 15 hours estimated)
- [ ] Implementation

### Key Documents (Read in Order)

1. **README.md** (this file) — Start here
2. **requirements.md** — WHAT the system does (11 requirements with acceptance criteria)
3. **design.md** ⭐ — HOW it works (SAT algorithm, PolygonUtils, BlockedAreaManager, all component designs, editor state machine)
4. **runtime-analysis.md** — Execution flow verification (1 minor violation fixed)
5. **failure-analysis.md** — Stress test results (ensureClockwise critical fix, degenerate polygon rejection)
6. **tasks.md** — Implementation breakdown (2 phases)
7. **clarifying-questions.md** + **answers.md** — All design decisions with rationale

### Critical Design Decisions

1. **Convex polygons only** — no concave decomposition; user draws multiple convex polygons for complex shapes
2. **SAT with MTV** — AABB-vs-convex-polygon using Separating Axis Theorem; minimum translation vector pushes player out
3. **AABB centered convention** — `x + offsetX - width/2` matches GridCollisionComponent exactly
4. **ensureClockwise uses `if (area < 0)`** — CRITICAL: screen-space Y-down flips shoelace sign convention. `area > 0` is the winding `isConvex` accepts. Reversing on `area > 0` would reject ALL polygons.
5. **Grid collision first, then polygon** — BlockedAreaCollisionComponent runs AFTER GridCollisionComponent in update order
6. **Knockback handled by ordering** — no special code; KnockbackComponent modifies transform before BlockedAreaCollisionComponent runs
7. **Brute-force <10 polygons** — no spatial index needed; ~80 axis tests per frame is negligible
8. **Pathfinder uses cell-level blocking** — conservative; any cell overlapping a polygon is blocked for enemies
9. **Projectiles use point-in-polygon** — simple cross-product winding test per frame
10. **Editor monotonic IDs** — `max(existing IDs) + 1` prevents duplicate IDs after deletions
11. **40px wall-gap warning** — advisory editor warning when polygon vertices are near wall cells (prevents player oscillation between two collision systems)
12. **Layer exact match** — polygon only affects entities on the same layer
13. **No pet collision in v1** — deferred to separate feature
14. **Static only** — polygons defined in level JSON, never change at runtime

### Architecture Overview

```
GameScene.initializeScene()
  ↓
BlockedAreaManager(levelData.blockedAreas, grid)
  ├── validates convexity (PolygonUtils)
  ├── pre-computes edge normals
  ├── pre-computes blockedCells Set<string>
  ↓
Passed to:
  ├── BlockedAreaCollisionComponent (player entity, after GridCollisionComponent)
  ├── ProjectileComponent.update() (point-in-polygon check)
  ├── Pathfinder.getValidNeighbor() (cell-level blocking)
  └── Grid.render() (debug overlay when G key active)
```

### Implementation Order

| Phase | What | Time |
|-------|------|------|
| 1 | Core Runtime (types, PolygonUtils, SAT, manager, component, projectile, pathfinder, debug) | 8.5h |
| 2 | Editor (drawing tool, selection, context panel, serialization) | 6.5h |
| **Total** | | **15h** |

### Files to Create

- `src/math/PolygonUtils.ts` — isConvex, computeNormals, isPointInPolygon, ensureClockwise
- `src/math/SATCollision.ts` — testAABBvsPolygon, getOverlappingCells
- `src/systems/BlockedAreaManager.ts` — validate, store, query blocked areas
- `src/ecs/components/movement/BlockedAreaCollisionComponent.ts` — player polygon push-out

### Files to Modify

- `src/systems/level/LevelLoader.ts` — BlockedAreaDef type, blockedAreas on LevelData
- `src/ecs/components/combat/ProjectileComponent.ts` — point-in-polygon check
- `src/systems/Pathfinder.ts` — blockedAreaCells parameter
- `src/ecs/entities/player/PlayerEntity.ts` — add BlockedAreaCollisionComponent, update order
- `src/scenes/GameScene.ts` — create BlockedAreaManager, store as public field
- `src/systems/grid/Grid.ts` — debug rendering
- `editor/EditorBridge.ts` — mutation methods, serialization
- `editor/CanvasInteraction.ts` — drawing tool state machine
- `editor/panels/Toolbar.ts` — tool button
- `editor/panels/ContextPanel.ts` — property panel

### Risk Areas

1. **ensureClockwise sign** — Must use `if (area < 0)`. Wrong sign = system completely broken.
2. **AABB convention** — Must match GridCollisionComponent centered convention exactly.
3. **Pathfinder call sites** — Every `new Pathfinder(grid)` must pass blockedAreaCells. Missing one = enemies ignore blocked areas in that state.
4. **Editor PolygonUtils import** — Editor imports from `src/math/`. Verify Vite resolves correctly.
5. **Polygon-wall squeeze** — Keep polygons ≥40px from walls. Advisory warning only.

### Success Criteria

- [ ] Player slides smoothly along polygon edges with no jitter
- [ ] Player cannot enter polygon interiors
- [ ] Grid collision resolves first, then polygon push-out applies
- [ ] Knockback respects polygon boundaries
- [ ] Projectiles stop at polygon edges (with onWallHit effects)
- [ ] Enemies pathfind around cells overlapping polygons
- [ ] Debug visualization shows polygons when G key active
- [ ] Editor supports drawing, selecting, deleting blocked areas
- [ ] Convexity validated in editor and at load time
- [ ] Layer matching works correctly (exact match)
- [ ] Levels without blocked areas unaffected
- [ ] Build and lint pass with zero errors

### Verified Safe (Runtime + Failure Analysis)

All these issues were identified and fixed in the design:
- AABB construction mismatch → fixed: centered convention `x + offsetX - width/2`
- CCW winding passes silently → fixed: `ensureClockwise()` auto-correction (with correct sign)
- Degenerate polygons accepted → fixed: `hasNonZeroCross` + `computeNormals()` null check
- Polygon-wall squeeze → fixed: 40px wall-gap editor warning
- Editor ID collision → fixed: monotonic counter `max(existing IDs) + 1`
