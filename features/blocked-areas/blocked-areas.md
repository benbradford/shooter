# Blocked Areas

## Overview

Sub-cell precision blocked areas defined as polygons. Entities cannot enter the polygon interior. Players can enter cells that contain blocked areas but are pushed out of the polygon itself, allowing tight movement around irregular shapes (rocks, furniture edges, tree trunks, etc.).

## Motivation

Currently, blocking is cell-granular (64×64). This makes it impossible to create natural-looking obstacles — a small rock blocks an entire cell, leaving visible gaps between the sprite and where the player stops. Blocked areas allow drawing precise collision boundaries around visual elements.

## Core Behavior

### Player Movement
- Player CAN enter a cell that contains a blocked area
- Player CANNOT overlap the polygon interior
- When the player's collision box overlaps a polygon, push the player out along the nearest edge normal (slide along the perimeter)
- This allows tight, smooth movement around irregular shapes

### Enemy/NPC Pathfinding
- Any cell that overlaps a blocked area polygon is marked as blocked for pathfinding purposes
- A* works as-is — enemies route around blocked cells
- This is intentionally conservative: enemies won't try to squeeze through partial cells
- Only the player (and potentially pets) get sub-cell polygon collision

### Projectiles
- Projectiles should be blocked by polygon edges (not just cells)
- Check projectile position against polygon interior each frame

## Level JSON Format

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
      ]
    }
  ]
}
```

- Coordinates are in world pixels (not cell coordinates) for sub-cell precision
- Vertices define a closed polygon (last vertex connects back to first)
- Winding order: clockwise (for consistent normal calculation)
- Polygons must be convex OR decomposed into convex sub-polygons at load time

## Editor Tool

### Drawing Mode
1. Select "Blocked Area" tool from toolbar
2. Click on canvas to place vertices (shown as dots connected by lines)
3. Each click adds a vertex; a preview line follows the cursor
4. When clicking near the first vertex (within snap distance), the polygon closes
5. Interior fills with semi-transparent red to show the blocked region
6. All cells overlapping the polygon get a visual indicator

### Selection/Editing
- Click inside an existing blocked area to select it
- Selected area shows vertices as draggable handles
- Delete key removes the selected area
- Vertices can be dragged to reshape

### Snapping (optional, nice-to-have)
- Hold Shift to snap vertices to cell corners/edges
- Helps create clean boundaries aligned to cell grid when desired

## Technical Considerations

### Convex vs Concave Polygons
- Collision resolution (push-out) is much simpler with convex polygons
- Option 1: Require convex polygons only (user draws multiple for complex shapes)
- Option 2: Auto-decompose concave polygons into convex parts at load time
- Recommend Option 1 for simplicity — complex shapes use multiple blocked areas

### Collision Algorithm
- SAT (Separating Axis Theorem) for AABB-vs-convex-polygon overlap detection
- Push-out vector: minimum translation vector (MTV) from SAT
- Applied after grid collision, before final position commit

### Performance
- Only check polygons in nearby cells (spatial index via cell overlap map)
- At level load: build a map of cell → [polygon indices] for O(1) lookup
- Per frame: only check polygons in cells the entity currently overlaps

### Edge Cases
- Entity spawns inside polygon → push out on first frame
- Very thin polygons → minimum width enforcement or skip
- Polygon fully inside one cell → cell still walkable for player, polygon blocks interior
- Multiple overlapping polygons → resolve each independently

## Open Questions — RESOLVED

1. **Convex only** — User draws multiple convex polygons for complex shapes. No concave decomposition.
2. **Enemies use cell avoidance only** — Only the player gets sub-cell polygon collision. Enemies pathfind around blocked cells.
3. **Delete-and-redraw** — No vertex editing after placement. Select and delete, then redraw.
4. **Layer-aware** — Each blocked area has a `layer` property. Only affects entities on that layer.
5. **Projectile blocking is configurable** — `blocksProjectiles` property per blocked area, defaults to `true`.

## Updated JSON Format

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
