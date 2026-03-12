# Pathfinding System

The pathfinding system provides A* pathfinding for entities to navigate around walls and between layers using transition cells.

## Overview

**Location:** `src/utils/Pathfinder.ts`

The `Pathfinder` class uses the A* algorithm to find the shortest path between two grid positions, respecting:
- Layer-based collision (entities can only move on same layer)
- Transition cells (staircases that connect layers)
- Wall obstacles (higher layer cells are impassable)
- Movement directions (4-direction or 8-direction)

## Using Pathfinding in States

### Patrol State Pattern

Patrol states should use pathfinding to navigate to waypoints, not direct movement.

**Why use pathfinding in patrol?**
- Handles obstacles and walls automatically
- Works with multi-level terrain and stairs
- Prevents getting stuck on level geometry
- More robust than direct movement

**When to recalculate:**
- Every 1000ms (1 second) for patrol states
- Every 500ms for chase states (more responsive)
- When reaching a waypoint (clear path, force recalc)

### Key Concepts

**Movement Directions:**
- **4-direction:** Cardinal directions only (up, down, left, right) - used by bugs
- **8-direction:** Cardinal + diagonal directions - used by robots and throwers
- Controlled by `allowDiagonals` parameter in `findPath()`
- **Diagonal restrictions:**
  - Blocked when crossing layer boundaries
  - Blocked if either adjacent cell is a different layer
  - Blocked when on a transition cell (only vertical movement allowed on transitions)

**Transition Cell Movement Rules:**
- **On a transition cell:** Only vertical movement (up/down) allowed
- **No horizontal movement** from transitions to prevent getting stuck in walls
- **No diagonal movement** from transitions
- This forces entities to move vertically to change layers, then move horizontally once off the transition

**Walls:**
- Layer 1 cells with `'wall'` property block movement
- Robots (`allowLayerChanges=false`) cannot path through walls
- Bugs (`allowLayerChanges=true`) can path through walls horizontally/upward, but not downward
- Walls render with brick/stone patterns to distinguish them from platforms

**Platforms:**
- Layer 1 cells with `'platform'` property are elevated walkable surfaces
- No special movement restrictions beyond layer rules
- Render as elevated with no visual pattern

**Critical: Collision Box Size**
- The pathfinder finds valid paths, but `GridCollisionComponent` validates actual movement
- If an entity's collision box is too large, it may overlap cells adjacent to the path
- This causes GridCollisionComponent to block movement even though the path is valid
- **Solution:** Keep collision boxes small enough that they don't overlap adjacent cells
- **Rule of thumb:** Grid collision box height should be ≤ 50% of cell size to avoid overlapping cells above/below
- **Example:** For 64px cells, use height ≤ 32px and position it in the middle/top of the sprite
- **Thrower example:** `offsetY: 16` (not 32) to reduce overlap with cells below

**Stuck Detection:**
- Entities should track if they stay in the same grid cell for too long (e.g., 1 second)
- If stuck, invalidate the path to force recalculation
- This allows automatic recovery when paths are blocked by collision issues

## Usage

### Basic Setup

Import Pathfinder and create instance with grid reference.

### Finding a Path

`findPath(startCol, startRow, goalCol, goalRow, currentLayer)` returns array of `{col, row}` nodes or null if no path exists.

### Following a Path

Skip first node (current position), move toward each subsequent node. When close enough (<10px), advance to next node.

## How It Works

### Layer-Based Movement

**Normal cells:**
- Can only move to cells on the same layer
- No layer changes except through transitions

**Transition cells:**
- Can only be entered/exited vertically (up/down)
- Connect adjacent layers bidirectionally
- Example: Layer 0 transition connects layer -1 ↔ layer 0 ↔ layer 1

### Movement Rules

**From normal cell to transition:**
- Moving down: Can enter from same layer or above
- Moving up: Can enter from below or same layer

**From transition to normal cell:**
- Moving up: Can reach same layer or layer+1
- Moving down: Can reach layer-1 or same layer

**From normal cell to normal cell:**
- Must be on same layer (no direct layer changes)

### Path Recalculation

**Recommended interval:** 500ms (every half second)

**Why recalculate?**
- Player moves to different location
- Walls/obstacles change (dynamic environments)
- Entity reaches dead end

**Performance:**
- A* is efficient for grid-based pathfinding
- 500ms interval prevents excessive computation
- Falls back to direct movement if no path found

## Null Path Handling

When `findPath()` returns `null` (no path exists), fall back to direct movement toward target. Will get stuck on walls but keeps trying. Entity will resume pathfinding when path becomes available.

## Best Practices

### 1. Recalculate Periodically

Use timer to recalculate every 500-1000ms or when path becomes null.

### 2. Skip Current Position

Path includes starting position at index 0. Start following from index 1.

### 3. Check Distance to Waypoint

Use threshold (typically 10px) to determine when waypoint is reached.

### 4. Provide Fallback Behavior

If no path found, move directly toward target as fallback.

### 5. Use Current Layer from GridPositionComponent

Always use entity's actual layer from `GridPositionComponent.currentLayer`.

## Performance Considerations

**Grid Size:**
- Works efficiently on grids up to ~100x100
- Larger grids may need optimization (jump point search, hierarchical pathfinding)

**Recalculation Frequency:**
- 500ms is good balance between responsiveness and performance
- Increase for slower-moving targets
- Decrease for fast-moving targets

**Multiple Entities:**
- Each entity can have its own pathfinder instance
- Pathfinding is stateless (no shared state between calls)
- Consider object pooling for many entities

## Common Issues

### Robot Gets Stuck Near Wall Edges

**Symptom:** Pathfinder finds valid path, but robot can't follow it. Robot appears stuck trying to move through valid cells.

**Cause:** Robot's collision box is too large and overlaps wall edge cells below the intended path. When the robot moves from cell A to cell B, its collision box spans both B and the cell below B. If the cell below B is a wall edge (layer 1 with layer 0 below), GridCollisionComponent blocks the movement.

**Solution:** Reduce the collision box's offsetY or height so it doesn't overlap cells below.

**Rule of thumb:** For 64px cells, keep collision box height ≤ 32px and position it in the middle or top half of the sprite.

### Entity Gets Stuck on Layer Corners

**Symptom:** Entity with diagonal pathfinding gets stuck trying to move into layer 1 cells from layer 0.

**Cause:** Collision box overlaps adjacent cells when moving diagonally near layer boundaries.

**Solution:**
1. Move collision box up: reduce `offsetY` (e.g., 32 → 16)
2. Add stuck detection to force path recalculation

### Entity Tries to Move Horizontally from Transition

**Symptom:** Entity on transition cell tries to move sideways into higher layer and gets stuck.

**Cause:** Pathfinder allowing horizontal movement from transitions.

**Solution:** Pathfinder now blocks all horizontal movement from transition cells - only vertical movement allowed.

### Path Doesn't Include Transitions

**Symptom:** No path found between layers, even though transitions exist.

**Cause:** 
- No transition cells connecting the layers
- Transition cells not properly marked in level data

**Solution:** 
- Add transition cells in level editor
- Verify transition cells have `isTransition: true` in level JSON

### Path Goes Through Walls

**Symptom:** Path includes cells that should be blocked.

**Cause:** Cells not properly marked as layer 1 in level data.

**Solution:** Check level JSON and ensure walls are layer 1.
