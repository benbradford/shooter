# Blocked Areas System — Design

## Architecture Overview

```
GameScene.initializeScene()
  ↓
BlockedAreaManager(levelData.blockedAreas, grid)
  ├── validates convexity (PolygonUtils)
  ├── pre-computes edge normals
  ├── pre-computes blockedCells Set<string>
  ↓
Passed to:
  ├── BlockedAreaCollisionComponent (player entity)
  │     runs AFTER GridCollisionComponent in update order
  │     uses SATCollision for AABB-vs-polygon MTV
  ├── ProjectileComponent.update()
  │     uses PolygonUtils.isPointInPolygon() per frame
  ├── Pathfinder.getValidNeighbor()
  │     checks blockedAreaCells set
  └── Grid.render() debug overlay
        draws polygons when G-key debug active

Editor (separate app):
  ├── CanvasInteraction — drawing tool state machine
  ├── EditorBridge — mutation methods + serialization
  └── ContextPanel — property editing after placement
```

## Data Flow

### Level Load

```
1. LevelLoader.load() returns LevelData with blockedAreas?: BlockedAreaDef[]
2. GameScene.initializeScene() after grid init:
   const blockedAreaManager = new BlockedAreaManager(
     levelData.blockedAreas ?? [], this.grid
   );
3. BlockedAreaManager constructor:
   3.1. For each def: validate convexity → skip invalid with console.error
   3.2. Pre-compute outward edge normals for SAT
   3.3. Pre-compute blockedCells set (cell overlaps any polygon)
4. Pass blockedAreaManager to:
   - createPlayerEntity() props → BlockedAreaCollisionComponent
   - Store on GameScene for ProjectileComponent and Pathfinder access
   - Pass to Grid for debug rendering
```

### Per-Frame Player Collision

```
1. WalkComponent updates transform (velocity)
2. GridCollisionComponent resolves wall/cell collision (slides)
3. BlockedAreaCollisionComponent.update():
   3.1. Read player AABB from transform + GridPositionComponent.collisionBox
   3.2. Get player layer from GridPositionComponent.currentLayer
   3.3. For each polygon on matching layer:
        SATCollision.testAABBvsPolygon(aabb, polygon) → MTV or null
   3.4. If MTV: transform.x += mtv.x; transform.y += mtv.y
   3.5. Repeat for all overlapping polygons (independent resolution)
4. StateMachineComponent, AnimationComponent etc. run after
```

---

## 1. SAT Algorithm — AABB vs Convex Polygon with MTV

### File: `src/math/SATCollision.ts`

SAT works by projecting both shapes onto every candidate separating axis. If any axis has no overlap, the shapes don't collide. If all axes overlap, the axis with the smallest overlap gives the MTV (minimum translation vector) to push them apart.

**Candidate axes for AABB vs convex polygon:**
- 2 axes from the AABB (x-axis `{1,0}` and y-axis `{0,1}`)
- N axes from the polygon's edge normals (pre-computed in BlockedArea)

**Total axes:** `2 + N` where N = vertex count (typically 3–8).

### Core Types

```typescript
type Vec2 = { readonly x: number; readonly y: number };

type AABB = {
  readonly x: number;      // left edge (world)
  readonly y: number;      // top edge (world)
  readonly width: number;
  readonly height: number;
};

type ConvexPolygon = {
  readonly vertices: ReadonlyArray<Vec2>;
  readonly normals: ReadonlyArray<Vec2>;  // pre-computed outward edge normals
};
```

### Algorithm

```typescript
function testAABBvsPolygon(aabb: AABB, polygon: ConvexPolygon): Vec2 | null {
  let minOverlap = Infinity;
  let mtvAxis: Vec2 = { x: 0, y: 0 };

  // --- AABB axes (x and y) ---
  // Project AABB: trivial (min/max on each axis)
  // Project polygon: dot each vertex onto axis, take min/max

  // X-axis {1, 0}
  const aabbMinX = aabb.x;
  const aabbMaxX = aabb.x + aabb.width;
  let polyMinX = Infinity;
  let polyMaxX = -Infinity;
  for (const v of polygon.vertices) {
    if (v.x < polyMinX) polyMinX = v.x;
    if (v.x > polyMaxX) polyMaxX = v.x;
  }
  const overlapX = Math.min(aabbMaxX, polyMaxX) - Math.max(aabbMinX, polyMinX);
  if (overlapX <= 0) return null; // separating axis found
  if (overlapX < minOverlap) {
    minOverlap = overlapX;
    // Push direction: AABB center relative to polygon center
    const aabbCenterX = aabb.x + aabb.width / 2;
    const polyCenterX = (polyMinX + polyMaxX) / 2;
    mtvAxis = { x: aabbCenterX < polyCenterX ? -1 : 1, y: 0 };
  }

  // Y-axis {0, 1}
  const aabbMinY = aabb.y;
  const aabbMaxY = aabb.y + aabb.height;
  let polyMinY = Infinity;
  let polyMaxY = -Infinity;
  for (const v of polygon.vertices) {
    if (v.y < polyMinY) polyMinY = v.y;
    if (v.y > polyMaxY) polyMaxY = v.y;
  }
  const overlapY = Math.min(aabbMaxY, polyMaxY) - Math.max(aabbMinY, polyMinY);
  if (overlapY <= 0) return null;
  if (overlapY < minOverlap) {
    minOverlap = overlapY;
    const aabbCenterY = aabb.y + aabb.height / 2;
    const polyCenterY = (polyMinY + polyMaxY) / 2;
    mtvAxis = { x: 0, y: aabbCenterY < polyCenterY ? -1 : 1 };
  }

  // --- Polygon edge normals ---
  for (const normal of polygon.normals) {
    // Project AABB onto this axis
    // AABB corners: 4 points, dot with normal, take min/max
    const d0 = aabb.x * normal.x + aabb.y * normal.y;
    const d1 = (aabb.x + aabb.width) * normal.x + aabb.y * normal.y;
    const d2 = aabb.x * normal.x + (aabb.y + aabb.height) * normal.y;
    const d3 = (aabb.x + aabb.width) * normal.x + (aabb.y + aabb.height) * normal.y;
    const aabbMin = Math.min(d0, d1, d2, d3);
    const aabbMax = Math.max(d0, d1, d2, d3);

    // Project polygon onto this axis
    let pMin = Infinity;
    let pMax = -Infinity;
    for (const v of polygon.vertices) {
      const d = v.x * normal.x + v.y * normal.y;
      if (d < pMin) pMin = d;
      if (d > pMax) pMax = d;
    }

    const overlap = Math.min(aabbMax, pMax) - Math.max(aabbMin, pMin);
    if (overlap <= 0) return null;
    if (overlap < minOverlap) {
      minOverlap = overlap;
      // Ensure MTV pushes AABB out of polygon
      const aabbCenter = (aabbMin + aabbMax) / 2;
      const polyCenter = (pMin + pMax) / 2;
      const sign = aabbCenter < polyCenter ? -1 : 1;
      mtvAxis = { x: normal.x * sign, y: normal.y * sign };
    }
  }

  // MTV = axis direction * overlap magnitude
  return { x: mtvAxis.x * minOverlap, y: mtvAxis.y * minOverlap };
}
```

**Key properties:**
- Returns `null` if no collision (early-out on first separating axis)
- Returns MTV vector that pushes the AABB out of the polygon
- MTV direction always points from polygon toward AABB center
- No allocations in hot path (reuses primitives)
- With <10 polygons × ~6 vertices each, this is ~80 axis tests per frame — negligible

---

## 2. PolygonUtils

### File: `src/math/PolygonUtils.ts`

Stateless utility functions for polygon math.

### Convexity Validation

Uses cross-product of consecutive edges. For clockwise winding, all cross products must be ≤ 0. Additionally rejects degenerate polygons (all-collinear vertices) by requiring at least one non-zero cross product.

```typescript
function isConvex(vertices: ReadonlyArray<Vec2>): boolean {
  const n = vertices.length;
  if (n < 3) return false;
  let hasNonZeroCross = false;
  for (let i = 0; i < n; i++) {
    const a = vertices[i];
    const b = vertices[(i + 1) % n];
    const c = vertices[(i + 2) % n];
    const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
    if (cross > 0) return false; // not clockwise-convex
    if (cross !== 0) hasNonZeroCross = true;
  }
  return hasNonZeroCross; // reject all-collinear (degenerate) polygons
}
```

### Outward Edge Normals (Pre-computed)

For each edge `(v[i] → v[i+1])`, the outward normal (clockwise winding) is `(dy, -dx)` normalized. Returns `null` if any edge has zero length (degenerate polygon).

```typescript
function computeNormals(vertices: ReadonlyArray<Vec2>): Vec2[] | null {
  const normals: Vec2[] = [];
  const n = vertices.length;
  for (let i = 0; i < n; i++) {
    const a = vertices[i];
    const b = vertices[(i + 1) % n];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    if (len === 0) return null; // zero-length edge → degenerate polygon
    normals.push({ x: dy / len, y: -dx / len });
  }
  return normals;
}
```

### Point-in-Polygon (for projectiles)

Uses cross-product winding test. For a convex clockwise polygon, a point is inside if it's on the right side of every edge.

```typescript
function isPointInPolygon(px: number, py: number, vertices: ReadonlyArray<Vec2>): boolean {
  const n = vertices.length;
  for (let i = 0; i < n; i++) {
    const a = vertices[i];
    const b = vertices[(i + 1) % n];
    const cross = (b.x - a.x) * (py - a.y) - (b.y - a.y) * (px - a.x);
    if (cross > 0) return false; // point is on left side (outside for CW)
  }
  return true;
}
```

### Cell Overlap Calculation (for pathfinding)

Determines which grid cells overlap a polygon. A cell overlaps if any polygon vertex is inside the cell, any cell corner is inside the polygon, or any polygon edge intersects any cell edge.

Simplified conservative approach: compute the polygon's axis-aligned bounding box, iterate all cells in that AABB, and for each cell test if the cell rectangle overlaps the polygon using SAT (AABB-vs-polygon). If `testAABBvsPolygon` returns non-null, the cell overlaps.

```typescript
function getOverlappingCells(
  vertices: ReadonlyArray<Vec2>,
  normals: ReadonlyArray<Vec2>,
  cellSizePx: number
): Array<{ col: number; row: number }> {
  // 1. Compute polygon AABB
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const v of vertices) {
    if (v.x < minX) minX = v.x;
    if (v.y < minY) minY = v.y;
    if (v.x > maxX) maxX = v.x;
    if (v.y > maxY) maxY = v.y;
  }

  // 2. Convert to cell range
  const startCol = Math.floor(minX / cellSizePx);
  const endCol = Math.floor(maxX / cellSizePx);
  const startRow = Math.floor(minY / cellSizePx);
  const endRow = Math.floor(maxY / cellSizePx);

  // 3. Test each cell
  const result: Array<{ col: number; row: number }> = [];
  const polygon = { vertices, normals };
  for (let row = startRow; row <= endRow; row++) {
    for (let col = startCol; col <= endCol; col++) {
      const cellAABB = {
        x: col * cellSizePx,
        y: row * cellSizePx,
        width: cellSizePx,
        height: cellSizePx
      };
      if (testAABBvsPolygon(cellAABB, polygon) !== null) {
        result.push({ col, row });
      }
    }
  }
  return result;
}
```

---

## 3. BlockedAreaManager

### File: `src/systems/BlockedAreaManager.ts`

Created once per level load. Owns validated polygon data and the pre-computed blocked-cells set.

```typescript
import type { Grid } from './grid/Grid';
import { isConvex, computeNormals, getOverlappingCells } from '../math/PolygonUtils';
import type { BlockedAreaDef } from './level/LevelLoader';

type Vec2 = { readonly x: number; readonly y: number };

type BlockedArea = {
  readonly id: string;
  readonly vertices: ReadonlyArray<Vec2>;
  readonly normals: ReadonlyArray<Vec2>;
  readonly layer: number;
  readonly blocksProjectiles: boolean;
};

function ensureClockwise(vertices: ReadonlyArray<Vec2>): Vec2[] {
  // Signed area via shoelace: positive = CCW, negative = CW
  let area = 0;
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i];
    const b = vertices[(i + 1) % vertices.length];
    area += (b.x - a.x) * (b.y + a.y);
  }
  if (area < 0) {
    return [...vertices].reverse(); // CCW → CW
  }
  return [...vertices];
}

class BlockedAreaManager {
  private readonly areas: BlockedArea[] = [];
  private readonly blockedCells: Set<string> = new Set();

  constructor(defs: BlockedAreaDef[], grid: Grid) {
    for (const def of defs) {
      const cwVertices = ensureClockwise(def.vertices);
      if (!isConvex(cwVertices)) {
        console.error(`[BlockedAreaManager] Polygon ${def.id} is not convex, skipping`);
        continue;
      }
      const normals = computeNormals(cwVertices);
      if (!normals) {
        console.error(`[BlockedAreaManager] Polygon ${def.id} has zero-length edge, skipping`);
        continue;
      }
      this.areas.push({
        id: def.id,
        vertices: cwVertices,
        normals,
        layer: def.layer,
        blocksProjectiles: def.blocksProjectiles,
      });
      for (const cell of getOverlappingCells(cwVertices, normals, grid.cellSize)) {
        this.blockedCells.add(`${cell.col},${cell.row}`);
      }
    }
  }

  getAll(): readonly BlockedArea[] { return this.areas; }

  getForLayer(layer: number): readonly BlockedArea[] {
    return this.areas.filter(a => a.layer === layer);
  }

  isPointInside(x: number, y: number, layer: number): boolean {
    for (const area of this.areas) {
      if (area.layer !== layer) continue;
      if (!area.blocksProjectiles) continue;
      if (isPointInPolygon(x, y, area.vertices)) return true;
    }
    return false;
  }

  getBlockedCells(): ReadonlySet<string> { return this.blockedCells; }
}
```

**Key points:**
- Constructor auto-corrects CCW winding to CW via `ensureClockwise()` before validation
- Constructor validates and filters — invalid/degenerate polygons never enter the runtime list
- `computeNormals()` returns `null` for zero-length edges; such polygons are skipped
- `blockedCells` is a flat `Set<string>` with `"col,row"` keys for O(1) lookup by Pathfinder
- `isPointInside` only checks polygons with `blocksProjectiles: true` (used by projectiles)
- `getForLayer` returns a filtered view (used by BlockedAreaCollisionComponent)
- No spatial index needed — brute-force over <10 polygons is negligible

---

## 4. BlockedAreaCollisionComponent

### File: `src/ecs/components/movement/BlockedAreaCollisionComponent.ts`

Runs AFTER `GridCollisionComponent` in the player's update order. Grid collision slides the player first; this component applies polygon MTV on the result.

### Player Update Order (modified)

```typescript
entity.setUpdateOrder([
  TransformComponent,
  SpriteComponent,
  ShadowComponent,
  ControlModeComponent,
  InputComponent,
  InteractionComponent,
  WalkComponent,
  GridCollisionComponent,
  BlockedAreaCollisionComponent,  // ← NEW: after grid collision
  PetAbilityComponent,
  CollisionComponent,
  HealthComponent,
  // ... rest unchanged
]);
```

### Implementation

```typescript
type BlockedAreaCollisionProps = {
  blockedAreaManager: BlockedAreaManager;
};

class BlockedAreaCollisionComponent implements Component {
  entity!: Entity;
  private readonly blockedAreaManager: BlockedAreaManager;
  private hasWarned = false;

  constructor(props: BlockedAreaCollisionProps) {
    this.blockedAreaManager = props.blockedAreaManager;
  }

  update(_delta: number): void {
    const transform = this.entity.require(TransformComponent);
    const gridPos = this.entity.require(GridPositionComponent);
    const box = gridPos.collisionBox;

    // Build AABB in world space from transform + collision box offset
    // Uses centered convention matching GridCollisionComponent:
    //   left = x + offsetX - width/2, top = y + offsetY - height/2
    const aabb = {
      x: transform.x + box.offsetX - box.width / 2,
      y: transform.y + box.offsetY - box.height / 2,
      width: box.width,
      height: box.height,
    };

    const polygons = this.blockedAreaManager.getForLayer(gridPos.currentLayer);

    for (const polygon of polygons) {
      const mtv = testAABBvsPolygon(aabb, polygon);
      if (mtv) {
        transform.x += mtv.x;
        transform.y += mtv.y;
        // Update AABB for next polygon test
        aabb.x += mtv.x;
        aabb.y += mtv.y;

        if (!this.hasWarned) {
          this.hasWarned = true;
          // Only warn on first frame (spawn inside polygon)
          console.warn(`[BlockedArea] Entity pushed out of polygon ${polygon.id}`);
        }
      }
    }
  }
}
```

**Key design decisions:**
- AABB is rebuilt from `transform + collisionBox` each frame — always uses the grid collision box `{ offsetX: 0, offsetY: 24, width: 34, height: 16 }`
- AABB uses centered convention matching GridCollisionComponent: `left = x + offsetX - width/2, top = y + offsetY - height/2`
- After each MTV push, the AABB is updated in-place so subsequent polygon tests use the corrected position
- Spawn-inside warning only fires once per entity lifetime via `hasWarned` flag
- Knockback is handled automatically: `KnockbackComponent` modifies transform before this runs, so the MTV push-out applies to the knockback result
- No special knockback code needed — component ordering handles it

---

## 5. Projectile Polygon Collision

### File: `src/ecs/components/combat/ProjectileComponent.ts` (modify)

Point-in-polygon check added inside `update()`, after position update and before existing wall/layer collision checks.

### Integration Point

```typescript
// ProjectileComponent.update() — existing code shown for context
update(delta: number): void {
  const transform = this.entity.require(TransformComponent);

  const movePx = this.speed * (delta / 1000);
  transform.x += this.dirX * movePx;
  transform.y += this.dirY * movePx;
  this.distanceTraveled += movePx;

  if (this.distanceTraveled >= this.maxDistance) {
    this.onMaxDistance?.(transform.x, transform.y);
    this.entity.destroy();
    return;
  }

  // ── NEW: Blocked area check ──
  if (this.blockedAreaManager) {
    if (this.blockedAreaManager.isPointInside(
      transform.x, transform.y, this.currentLayer
    )) {
      this.onWallHit?.(transform.x, transform.y);
      this.entity.destroy();
      return;
    }
  }
  // ── END NEW ──

  // ... existing cell/layer collision continues below ...
}
```

**How `blockedAreaManager` reaches ProjectileComponent:**

`ProjectileProps` gains an optional field:

```typescript
type ProjectileProps = {
  // ... existing fields ...
  blockedAreaManager?: BlockedAreaManager;
};
```

The manager is passed from `GameScene` through entity factories that create projectiles (BulletEntity, FireballEntity, BoneProjectileEntity, BulletDudeBulletEntity, GrenadeEntity). Each factory already receives `scene` — they read `scene.blockedAreaManager`.

**Layer matching:** `isPointInside(x, y, layer)` already filters by `area.layer === layer` and `area.blocksProjectiles === true`, matching the same layer rules as projectile-vs-cell collision.

---

## 6. Pathfinder Integration

### File: `src/systems/Pathfinder.ts` (modify)

The Pathfinder gains an optional `blockedAreaCells` set. When provided, `getValidNeighbor()` rejects cells in that set.

### Constructor Change

```typescript
class Pathfinder {
  constructor(
    private readonly grid: Grid,
    private readonly blockedAreaCells?: ReadonlySet<string>
  ) {}
}
```

### getValidNeighbor() Change

Add a single check at the top of `getValidNeighbor()`, before any existing logic:

```typescript
private getValidNeighbor(
  currentCell, targetCell, dir, currentLayer, newCol, newRow, allowLayerChanges
): { col: number; row: number; layer: number } | null {
  // ── NEW: Blocked area cell check ──
  if (this.blockedAreaCells?.has(`${newCol},${newRow}`)) {
    return null;
  }
  // ── END NEW ──

  // ... existing GridCellBlocker check, layer logic, wall logic ...
}
```

### How blockedAreaCells reaches Pathfinder

Every call site that creates `new Pathfinder(grid)` passes the set:

```typescript
// In PetFollowComponent, BugChaseState, PumaChasingState, etc:
const pathfinder = new Pathfinder(
  this.grid,
  this.scene.blockedAreaManager?.getBlockedCells()
);
```

`GameScene` exposes `blockedAreaManager` as a public readonly field (set during `initializeScene()`). Call sites that already have a `grid` reference also have access to the scene.

**Backward compatible:** The second constructor parameter is optional. Existing code that passes only `grid` continues to work — no blocked area filtering applied.

---

## 7. Debug Visualization

### File: `src/systems/grid/Grid.ts` (modify `render()`)

When `gridDebugEnabled` is true, draw all blocked area polygons after existing debug rendering.

```typescript
// In Grid.render(), after existing debug rendering:
if (this.isGridDebugEnabled && this.blockedAreaManager) {
  const areas = this.blockedAreaManager.getAll();
  for (const area of areas) {
    const color = area.layer === 0 ? 0xff0000 : area.layer === 1 ? 0x0000ff : 0x00ff00;

    // Filled interior (semi-transparent)
    this.graphics.fillStyle(color, 0.15);
    this.graphics.beginPath();
    this.graphics.moveTo(area.vertices[0].x, area.vertices[0].y);
    for (let i = 1; i < area.vertices.length; i++) {
      this.graphics.lineTo(area.vertices[i].x, area.vertices[i].y);
    }
    this.graphics.closePath();
    this.graphics.fillPath();

    // Outline
    this.graphics.lineStyle(2, color, 0.8);
    this.graphics.beginPath();
    this.graphics.moveTo(area.vertices[0].x, area.vertices[0].y);
    for (let i = 1; i < area.vertices.length; i++) {
      this.graphics.lineTo(area.vertices[i].x, area.vertices[i].y);
    }
    this.graphics.closePath();
    this.graphics.strokePath();
  }
}
```

Grid receives `blockedAreaManager` via a setter called during `initializeScene()`:

```typescript
// Grid
private blockedAreaManager?: BlockedAreaManager;
setBlockedAreaManager(manager: BlockedAreaManager): void {
  this.blockedAreaManager = manager;
}
```

---

## 8. Editor — Drawing Tool State Machine

### Overview

The blocked area tool in the editor has three states: `idle`, `drawing`, and `selected`. The state machine lives inside `CanvasInteraction` and is activated when `bridge.currentTool === 'blockedarea'`.

### State Machine

```
┌───────┐  click canvas   ┌─────────┐  click near first vertex  ┌──────────┐
│ idle  │ ──────────────→  │ drawing │ ────────────────────────→ │ selected │
└───────┘                  └─────────┘                           └──────────┘
    ↑                        │ right-click: undo last vertex        │
    │                        │ escape: cancel drawing                │
    │                        ↓                                      │
    │                      (if 0 vertices → idle)                   │
    │                                                               │
    │  escape / click empty                                         │
    ├───────────────────────────────────────────────────────────────┘
    │  delete key: remove selected area
    └───────────────────────────────────────────────────────────────┘
```

### State: `idle`

No blocked area is being drawn or selected.

**On click:** Start drawing — create first vertex at click position, transition to `drawing`.

### State: `drawing`

Actively placing vertices.

**Tracked state:**
```typescript
type DrawingState = {
  vertices: Array<{ x: number; y: number }>;
  autoLayer: number; // detected from first vertex's cell
};
```

**On click:**
1. Get world position from pointer
2. Check distance to first vertex: if ≤ 16px (world-space) AND vertices.length ≥ 3 → close polygon
3. Otherwise → add vertex to array

**On close polygon:**
1. Validate convexity via `PolygonUtils.isConvex(vertices)`
2. If invalid → show error toast, discard vertices, return to `idle`
3. If valid → call `bridge.addBlockedArea(vertices, autoLayer)` → transition to `selected` with new area

**On right-click:** Remove last vertex. If no vertices remain → return to `idle`.

**On escape:** Discard all vertices → return to `idle`.

**Visual feedback during drawing:**
- Dots at each placed vertex (small circles)
- Lines connecting consecutive vertices
- Preview line from last vertex to current cursor position
- All rendered via Phaser Graphics in `renderOverlays()`

### State: `selected`

A placed blocked area is selected.

**On click inside a blocked area:** Select it. If multiple overlap at click point, cycle through them on repeated clicks (same `lastClickCell` + `clickCycleIndex` pattern used for entity selection).

**On click outside all areas:** Clear selection → `idle`.

**On delete key:** Call `bridge.removeBlockedArea(selectedId)` → `idle`.

**Selection visual:** Brighter outline + thicker stroke on the selected polygon.

### Hit Testing for Selection

```typescript
function isPointInBlockedArea(px: number, py: number, area: BlockedAreaDef): boolean {
  return PolygonUtils.isPointInPolygon(px, py, area.vertices);
}
```

Iterate all blocked areas in level data, collect those containing the click point, cycle through them.

---

## 9. Editor Bridge Mutations

### File: `editor/EditorBridge.ts` (modify)

New mutation methods, all routed through `_applyMutation()`:

```typescript
addBlockedArea(vertices: Array<{ x: number; y: number }>, layer: number): void {
  this._applyMutation('Add blocked area', () => {
    const levelData = this.scene.getLevelData();
    if (!levelData.blockedAreas) levelData.blockedAreas = [];
    const maxId = levelData.blockedAreas.reduce((max, a) => {
      const num = parseInt(a.id.replace('ba', ''), 10);
      return isNaN(num) ? max : Math.max(max, num);
    }, -1);
    const id = `ba${maxId + 1}`;
    levelData.blockedAreas.push({
      id,
      vertices,
      layer,
      blocksProjectiles: true,
    });
  });
}

removeBlockedArea(id: string): void {
  this._applyMutation(`Remove blocked area ${id}`, () => {
    const levelData = this.scene.getLevelData();
    if (!levelData.blockedAreas) return;
    levelData.blockedAreas = levelData.blockedAreas.filter(a => a.id !== id);
  });
}

updateBlockedArea(id: string, data: Partial<BlockedAreaDef>): void {
  this._applyMutation(`Update blocked area ${id}`, () => {
    const levelData = this.scene.getLevelData();
    const area = levelData.blockedAreas?.find(a => a.id === id);
    if (!area) return;
    if (data.layer !== undefined) area.layer = data.layer;
    if (data.blocksProjectiles !== undefined) area.blocksProjectiles = data.blocksProjectiles;
  });
}
```

**Blocked areas live in `levelData.blockedAreas`** — they are NOT entities. The editor mutates the level data directly, same as how `triggerCells` are edited.

### Context Panel Integration

When a blocked area is selected, `ContextPanel` shows:
- ID (read-only)
- Layer (number input → `bridge.updateBlockedArea(id, { layer })`)
- Blocks Projectiles (checkbox → `bridge.updateBlockedArea(id, { blocksProjectiles })`)
- Delete button → `bridge.removeBlockedArea(id)`

### Editor Validation: Polygon-Wall Proximity Warning

**Level design constraint:** Blocked area polygon edges must be at least 40px from any grid wall cell. If a polygon is placed closer than 40px to a wall, the player can get squeezed between the two independent collision systems (GridCollisionComponent and BlockedAreaCollisionComponent), causing oscillation.

**Editor warning on polygon close:**

After `addBlockedArea()` succeeds, check proximity to wall cells:

```typescript
function warnIfNearWalls(vertices: Array<Vec2>, grid: Grid): void {
  const MIN_WALL_GAP_PX = 40;
  for (const v of vertices) {
    const col = Math.floor(v.x / grid.cellSize);
    const row = Math.floor(v.y / grid.cellSize);
    // Check 3×3 neighborhood around each vertex
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const cell = grid.getCell(col + dc, row + dr);
        if (!cell || !cell.properties.has('wall')) continue;
        const wallCenterX = (col + dc) * grid.cellSize + grid.cellSize / 2;
        const wallCenterY = (row + dr) * grid.cellSize + grid.cellSize / 2;
        const dist = Math.hypot(v.x - wallCenterX, v.y - wallCenterY);
        if (dist < MIN_WALL_GAP_PX + grid.cellSize / 2) {
          console.warn(`[Editor] Blocked area vertex at (${v.x},${v.y}) is within 40px of wall at (${col + dc},${row + dr}). Player may get stuck.`);
        }
      }
    }
  }
}
```

This warning is advisory — it does not prevent placement. The constraint is documented in the level design guidelines.

---

## 10. JSON Serialization Round-Trip

### Save Path

`EditorBridge.getCurrentLevelData()` already returns the full `LevelData` object. Since `blockedAreas` lives directly on `levelData`, it is automatically included in the JSON output with no additional extraction code needed.

The only change to `getCurrentLevelData()`:

```typescript
getCurrentLevelData(): LevelData {
  // ... existing grid/entity extraction ...

  return {
    width: grid.width,
    height: grid.height,
    playerStart: { x: playerStart.col, y: playerStart.row },
    cells,
    entities: entities.length > 0 ? entities : [],
    levelTheme: existingLevelData.levelTheme,
    background: existingLevelData.background,
    blockedAreas: existingLevelData.blockedAreas,  // ← NEW: pass through
  };
}
```

### Load Path

`LevelLoader.load()` returns the raw JSON which already includes `blockedAreas` if present. No parsing changes needed — the field is optional and typed.

### LevelData Type Change

```typescript
// In src/systems/level/LevelLoader.ts
export type BlockedAreaDef = {
  id: string;
  vertices: Array<{ x: number; y: number }>;
  layer: number;
  blocksProjectiles: boolean;
};

export type LevelData = {
  // ... existing fields ...
  blockedAreas?: BlockedAreaDef[];
};
```

### Round-Trip Guarantee

1. **Load:** JSON → `LevelData.blockedAreas` → `BlockedAreaManager` (runtime) + `levelData.blockedAreas` (editor reference)
2. **Edit:** `bridge.addBlockedArea()` / `removeBlockedArea()` mutates `levelData.blockedAreas`
3. **Save:** `getCurrentLevelData()` passes `blockedAreas` through → JSON
4. **Reload:** JSON → same `blockedAreas` array → identical runtime state

Vertex coordinates are world-pixel numbers — no transformation needed. `JSON.stringify` / `JSON.parse` preserves them exactly.
