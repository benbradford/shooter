# Blocked Areas System — Requirements

## Overview

Sub-cell precision blocked areas defined as convex polygons in world-pixel coordinates. The player's grid collision box is pushed out of polygon interiors using SAT/MTV, enabling tight movement around irregular shapes (rocks, furniture, tree trunks). Enemies use conservative cell-level avoidance only.

## Decisions Summary

| Decision | Answer |
|----------|--------|
| Collision box | Grid collision box (feet area, `{ offsetX: 0, offsetY: 24, width: 34, height: 16 }`) |
| Component placement | Separate `BlockedAreaCollisionComponent` after `GridCollisionComponent` in update order |
| Knockback | Respects polygon collision |
| Collision resolution order | Grid slides first, then polygon MTV applied on result |
| Polygon geometry | Convex only, minimum 3 vertices, no max vertex count, no size constraints |
| Convexity validation | Both editor and load time |
| Layer matching | Exact match only — block if player's current layer equals polygon's layer |
| Multi-layer polygons | One layer per polygon; draw multiple for multi-layer |
| Projectile collision | Point-in-polygon per frame; reuse existing `onWallHit` callback |
| Projectile layers | Same layer rules as projectile-vs-cell collision |
| Pathfinding | Separate `blockedAreaCells` set; any polygon overlap blocks the cell |
| Pet collision | No polygon collision in v1 |
| Performance | Fewer than 10 polygons per level; brute-force all polygons, no spatial index |
| Spatial index rebuild | At level load and on editor changes |
| Debug visualization | Shown when grid debug (G) enabled; polygon outlines + filled interior |
| Entity spawn inside polygon | Push out on first frame + log warning |
| Enemy spawn inside polygon | Enemies don't collide with polygons, irrelevant |
| Dynamic polygons | Always static; defined in level JSON, never change at runtime |

---

## R1: Level JSON Format

**Purpose**: Store blocked area definitions in level data.

**Format**:
```json
{
  "blockedAreas": [
    {
      "id": "ba0",
      "vertices": [
        { "x": 640, "y": 320 },
        { "x": 768, "y": 256 },
        { "x": 832, "y": 384 },
        { "x": 704, "y": 448 }
      ],
      "layer": 0,
      "blocksProjectiles": true
    }
  ]
}
```

**Properties**:
- `id`: String — unique identifier (e.g., `"ba0"`, `"ba1"`)
- `vertices`: Array of `{ x: number, y: number }` — world-pixel coordinates, clockwise winding
- `layer`: Number — grid layer this polygon affects (exact match)
- `blocksProjectiles`: Boolean — whether projectiles are stopped by this polygon (default `true`)

**Constraints**:
- Minimum 3 vertices
- Must be convex (validated at load time; reject with error if not)
- Clockwise winding order
- Coordinates in world pixels (not cell coordinates)
- Last vertex connects back to first (closed polygon)

**LevelData type change**:
```typescript
type LevelData = {
  // ... existing fields ...
  blockedAreas?: BlockedAreaDef[];
}

type BlockedAreaDef = {
  id: string;
  vertices: Array<{ x: number; y: number }>;
  layer: number;
  blocksProjectiles: boolean;
}
```

**Acceptance Criteria**:
- `blockedAreas` field added to `LevelData` type (optional, defaults to empty array)
- `BlockedAreaDef` type exported from `LevelLoader.ts`
- Existing levels without `blockedAreas` load without errors

---

## R2: BlockedAreaManager

**Purpose**: Load, validate, and provide access to blocked area polygons at runtime.

**API**:
```typescript
class BlockedAreaManager {
  constructor(blockedAreas: BlockedAreaDef[], grid: Grid)

  getAll(): readonly BlockedArea[]
  getForLayer(layer: number): readonly BlockedArea[]
  isPointInside(x: number, y: number, layer: number): boolean
  getBlockedCells(): ReadonlySet<string>
}
```

**Behavior**:
- Created once at level load from `LevelData.blockedAreas`
- Validates convexity of each polygon; logs error and skips invalid polygons
- Pre-computes `blockedCells` set: for each polygon, marks every grid cell whose area overlaps the polygon (any overlap = blocked)
- `blockedCells` stored as `Set<string>` with `"col,row"` keys
- `getForLayer(layer)` returns only polygons matching the given layer
- `isPointInside(x, y, layer)` checks if a point is inside any polygon on that layer

**BlockedArea runtime type**:
```typescript
type BlockedArea = {
  readonly id: string;
  readonly vertices: ReadonlyArray<{ x: number; y: number }>;
  readonly layer: number;
  readonly blocksProjectiles: boolean;
  readonly edges: ReadonlyArray<{ nx: number; ny: number }>; // pre-computed outward normals
}
```

**Acceptance Criteria**:
- Invalid (non-convex) polygons logged as errors and skipped
- `getBlockedCells()` returns all cells overlapping any polygon
- Pre-computed edge normals available for SAT
- Empty `blockedAreas` array produces empty manager (no errors)

---

## R3: Player Polygon Collision (BlockedAreaCollisionComponent)

**Purpose**: Push the player's grid collision box out of blocked area polygons each frame.

**Update Order**: Runs AFTER `GridCollisionComponent` in the player's update order. Grid collision slides the player first; this component applies polygon MTV on the result.

**Collision Box**: Uses the player's grid collision box (`{ offsetX: 0, offsetY: 24, width: 34, height: 16 }`), consistent with wall collision.

**Algorithm**: SAT (Separating Axis Theorem) for AABB-vs-convex-polygon overlap detection. If overlapping, compute the minimum translation vector (MTV) and push the player out.

**API**:
```typescript
type BlockedAreaCollisionProps = {
  blockedAreaManager: BlockedAreaManager;
  grid: Grid;
}

class BlockedAreaCollisionComponent implements Component {
  constructor(props: BlockedAreaCollisionProps)
  update(delta: number): void
}
```

**Behavior**:
- Each frame: get player's current AABB from `TransformComponent` + `GridPositionComponent` collision box
- Get player's current layer from `GridPositionComponent.currentLayer`
- Test AABB against all polygons on that layer (brute-force; <10 polygons)
- If overlap detected: compute MTV, apply to `TransformComponent` position
- If multiple polygons overlap: resolve each independently (apply MTV for each)
- On first frame if player spawns inside polygon: push out + `console.warn`

**Layer Matching**: Only test polygons where `polygon.layer === player.currentLayer`.

**Acceptance Criteria**:
- Player slides smoothly along polygon edges (no jitter, no teleporting)
- Player cannot enter polygon interior
- Works correctly with grid collision sliding (grid resolves first, then polygon)
- Multiple overlapping polygons resolved independently
- Spawn-inside-polygon handled with push-out + warning
- No collision when player is on a different layer than the polygon

---

## R4: Knockback Respects Polygon Collision

**Purpose**: When the player is knocked back, polygon collision still applies.

**Behavior**:
- `KnockbackComponent` modifies `TransformComponent` position
- `BlockedAreaCollisionComponent` runs after knockback in the update order
- MTV push-out applies to the knockback result, same as normal movement
- No special knockback handling needed — component ordering handles it

**Acceptance Criteria**:
- Player knocked toward a polygon is pushed out along the polygon edge
- Knockback does not push player through polygons

---

## R5: Projectile Polygon Collision

**Purpose**: Projectiles are blocked by polygon edges.

**Algorithm**: Point-in-polygon test each frame using the projectile's current position.

**Layer Rules**: Same as projectile-vs-cell collision — projectile's `currentLayer` must match `polygon.layer`.

**Callback**: Reuse existing `onWallHit` callback. When a projectile's position is inside a blocked area polygon (on matching layer, with `blocksProjectiles: true`), call `onWallHit(x, y)` and destroy the projectile — identical to hitting a wall cell.

**Integration Point**: Inside `ProjectileComponent.update()`, after position update and before existing wall collision checks.

**Acceptance Criteria**:
- Projectiles stop when entering a blocked area polygon
- `onWallHit` callback fires (same visual effects as wall hit)
- Only checks polygons with `blocksProjectiles: true`
- Layer matching follows existing projectile layer rules
- Projectiles pass through polygons on different layers
- Projectiles pass through polygons with `blocksProjectiles: false`

---

## R6: Pathfinding Integration

**Purpose**: Enemies route around cells that overlap blocked area polygons.

**Approach**: Separate `blockedAreaCells: Set<string>` (keyed as `"col,row"`) maintained by `BlockedAreaManager`. The `Pathfinder` checks this set in addition to existing cell-level blocking.

**Cell Marking**: Any grid cell whose area overlaps any blocked area polygon is marked as blocked for pathfinding. This is conservative — enemies won't try to squeeze through partial cells.

**Integration Point**: `Pathfinder.getValidNeighbor()` checks `blockedAreaManager.getBlockedCells().has("col,row")` and returns `null` if blocked.

**Acceptance Criteria**:
- Enemies pathfind around cells overlapping blocked areas
- Any overlap (even 1px) blocks the cell for pathfinding
- Existing pathfinding behavior unchanged for cells without blocked areas
- `blockedAreaCells` set rebuilt at level load

---

## R7: Debug Visualization

**Purpose**: Show blocked area polygons when grid debug mode (G key) is enabled.

**Behavior**:
- When grid debug is toggled on, render all blocked area polygons
- Polygon outlines drawn as lines
- Polygon interiors filled with semi-transparent color
- Color-coded by layer (same scheme as grid debug layer colors)
- Cleared and redrawn each frame when debug is active

**Acceptance Criteria**:
- Polygons visible when G key debug is active
- Polygons hidden when debug is off
- Layer coloring distinguishes polygons on different layers
- Does not affect gameplay performance when debug is off

---

## R8: Editor — Blocked Area Drawing Tool

**Purpose**: Place blocked area polygons on the canvas in the level editor.

**Drawing Mode**:
1. Select "Blocked Area" tool from toolbar
2. Click on canvas to place vertices (shown as dots connected by lines)
3. Preview line follows cursor from last vertex
4. Right-click removes last placed vertex (undo during drawing)
5. Click within 16px (world-space) of first vertex to close the polygon
6. On close: validate convexity; if invalid, show error toast and discard
7. Interior fills with semi-transparent color (color-coded by layer)
8. Layer auto-detected from first vertex's cell

**Properties** (editable in context panel after placement):
- `blocksProjectiles`: Boolean, default `true`
- `layer`: Number, auto-detected but editable

**Acceptance Criteria**:
- Vertices placed with click, connected by lines
- Preview line from last vertex to cursor
- Right-click removes last vertex during drawing
- Polygon closes when clicking near first vertex (16px snap)
- Non-convex polygons rejected with error message
- Layer auto-detected from first vertex's cell
- `blocksProjectiles` editable in context panel after placement

---

## R9: Editor — Blocked Area Selection

**Purpose**: Select and delete existing blocked areas.

**Behavior**:
- Click inside a blocked area to select it
- If multiple blocked areas overlap at click point, cycle through them on repeated clicks
- Selected area highlighted (distinct outline or color)
- Delete key removes selected area
- No vertex editing after placement — delete and redraw

**Acceptance Criteria**:
- Click selects blocked area
- Repeated clicks cycle through overlapping areas
- Delete key removes selected area
- Selected area visually distinct

---

## R10: Editor — Blocked Area Visualization

**Purpose**: Show blocked areas in the editor at all times.

**Behavior**:
- All blocked areas rendered with polygon outlines + filled interior
- Color-coded by layer (e.g., layer 0 = red, layer 1 = blue)
- Semi-transparent fill so underlying grid/textures visible
- Cells overlapping blocked areas get a subtle visual indicator

**Acceptance Criteria**:
- Blocked areas always visible in editor
- Layer colors distinguish different layers
- Fill is semi-transparent
- Overlapping cells indicated

---

## R11: Editor — Serialization

**Purpose**: Save and load blocked areas in level JSON.

**Behavior**:
- `extractGridCells()` / `getCurrentLevelData()` includes `blockedAreas` array
- Blocked areas serialized with id, vertices, layer, blocksProjectiles
- Loading a level with `blockedAreas` populates the editor state
- Loading a level without `blockedAreas` works (empty array)

**Acceptance Criteria**:
- Blocked areas round-trip through save/load without data loss
- Vertex coordinates preserved exactly
- Properties (layer, blocksProjectiles) preserved
- Backward compatible with levels that have no `blockedAreas`

---

## Non-Requirements (Deferred)

- Concave polygon decomposition (convex only in v1)
- Pet polygon collision (separate feature later)
- Dynamic/moving blocked areas (always static)
- Vertex editing after placement (delete and redraw)
- Spatial index optimization (brute-force is fine for <10 polygons)
- Projectile ray-segment intersection (point-in-polygon for now; optimize if tunneling is an issue)

---

## Files to Create

- `src/systems/BlockedAreaManager.ts` — Load, validate, query blocked areas
- `src/ecs/components/movement/BlockedAreaCollisionComponent.ts` — Player polygon push-out
- `src/math/SATCollision.ts` — SAT overlap detection + MTV calculation for AABB-vs-convex-polygon
- `src/math/PolygonUtils.ts` — Convexity validation, point-in-polygon, cell overlap calculation

## Files to Modify

- `src/systems/level/LevelLoader.ts` — Add `BlockedAreaDef` type, add `blockedAreas` to `LevelData`
- `src/ecs/components/combat/ProjectileComponent.ts` — Add blocked area point-in-polygon check
- `src/systems/Pathfinder.ts` — Check `blockedAreaCells` in `getValidNeighbor()`
- `src/ecs/entities/player/PlayerEntity.ts` — Add `BlockedAreaCollisionComponent` to player, update order
- `src/scenes/GameScene.ts` — Create `BlockedAreaManager` at level load, pass to components
- `src/systems/grid/Grid.ts` — Add debug rendering for blocked areas (when G key active)
- `editor/EditorBridge.ts` — Add blocked area mutation methods, serialization
- `editor/CanvasInteraction.ts` — Add blocked area drawing tool interaction
- `editor/panels/Toolbar.ts` — Add "Blocked Area" tool button
- `editor/panels/ContextPanel.ts` — Show blocked area properties when selected

---

## Success Criteria

- Player slides smoothly along polygon edges with no jitter
- Player cannot enter polygon interiors
- Grid collision resolves first, then polygon push-out applies
- Knockback respects polygon boundaries
- Projectiles stop at polygon edges (with `onWallHit` effects)
- Enemies pathfind around cells overlapping polygons
- Debug visualization shows polygons when G key active
- Editor supports drawing, selecting, deleting blocked areas
- Convexity validated in editor and at load time
- Layer matching works correctly (exact match)
- Levels without blocked areas unaffected
- Build and lint pass with zero errors
