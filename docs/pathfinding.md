# Pathfinding System

The pathfinding system provides A* pathfinding for entities to navigate around walls and between layers using transition cells.

## Overview

**Location:** `src/utils/Pathfinder.ts`

The `Pathfinder` class uses the A* algorithm to find the shortest path between two grid positions, respecting:
- Layer-based collision (entities can only move on same layer)
- Transition cells (staircases that connect layers)
- Wall obstacles (higher layer cells are impassable)

## Usage

### Basic Setup

```typescript
import { Pathfinder } from '../utils/Pathfinder';
import type { Grid } from '../utils/Grid';

// In your state/component constructor
constructor(entity: Entity, grid: Grid) {
  this.pathfinder = new Pathfinder(grid);
}
```

### Finding a Path

```typescript
const path = this.pathfinder.findPath(
  startCol,      // Starting column
  startRow,      // Starting row
  goalCol,       // Goal column
  goalRow,       // Goal row
  currentLayer   // Entity's current layer
);

// Returns: Array<{ col: number; row: number }> | null
// null if no path exists
```

### Following a Path

```typescript
if (path && path.length > 1) {
  // Skip first node (current position)
  const targetNode = path[1];
  const targetWorld = grid.cellToWorld(targetNode.col, targetNode.row);
  const targetX = targetWorld.x + grid.cellSize / 2;
  const targetY = targetWorld.y + grid.cellSize / 2;
  
  // Move toward target
  const dirX = targetX - transform.x;
  const dirY = targetY - transform.y;
  const distance = Math.hypot(dirX, dirY);
  
  if (distance < 10) {
    // Reached waypoint, move to next
    pathIndex++;
  } else {
    // Move toward waypoint
    transform.x += (dirX / distance) * speed * (delta / 1000);
    transform.y += (dirY / distance) * speed * (delta / 1000);
  }
}
```

## Complete Example: Robot Stalking State

```typescript
export class RobotStalkingState implements IState {
  private readonly pathfinder: Pathfinder;
  private path: Array<{ col: number; row: number }> | null = null;
  private pathRecalcTimer: number = 0;
  private currentPathIndex: number = 0;

  constructor(entity: Entity, playerEntity: Entity, grid: Grid) {
    this.entity = entity;
    this.playerEntity = playerEntity;
    this.pathfinder = new Pathfinder(grid);
  }

  onUpdate(delta: number): void {
    this.pathRecalcTimer += delta;
    
    const transform = this.entity.get(TransformComponent)!;
    const playerTransform = this.playerEntity.get(TransformComponent)!;
    const gridPos = this.entity.get(GridPositionComponent)!;

    // Recalculate path every 500ms
    if (this.pathRecalcTimer >= 500 || this.path === null) {
      this.pathRecalcTimer = 0;
      
      const robotCell = this.grid.worldToCell(transform.x, transform.y);
      const playerCell = this.grid.worldToCell(playerTransform.x, playerTransform.y);
      
      this.path = this.pathfinder.findPath(
        robotCell.col,
        robotCell.row,
        playerCell.col,
        playerCell.row,
        gridPos.currentLayer
      );
      this.currentPathIndex = 0;
    }

    // Follow path or move directly
    if (this.path && this.path.length > 1) {
      this.followPath(transform, delta);
    } else {
      this.moveDirectly(transform, playerTransform, delta);
    }
  }
}
```

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

When `findPath()` returns `null` (no path exists):

```typescript
if (this.path && this.path.length > 1) {
  this.followPath(transform, delta);
} else {
  // Fallback: Move directly toward target
  // Will get stuck on walls but keeps trying
  this.moveDirectly(transform, target, delta);
}
```

**Why this works:**
- Player might be temporarily unreachable (behind walls)
- Direct movement provides sensible fallback behavior
- Entity will resume pathfinding when path becomes available

## Best Practices

### 1. Recalculate Periodically

```typescript
const PATH_RECALC_INTERVAL = 500; // milliseconds

if (this.pathRecalcTimer >= PATH_RECALC_INTERVAL || this.path === null) {
  this.pathRecalcTimer = 0;
  this.path = this.pathfinder.findPath(...);
}
```

### 2. Skip Current Position

```typescript
// Path includes starting position at index 0
// Start following from index 1
if (this.currentPathIndex === 0) {
  this.currentPathIndex = 1;
}
```

### 3. Check Distance to Waypoint

```typescript
const WAYPOINT_THRESHOLD = 10; // pixels

if (distToWaypoint < WAYPOINT_THRESHOLD) {
  this.currentPathIndex++;
  if (this.currentPathIndex >= this.path.length) {
    this.path = null; // Reached end, recalculate
  }
}
```

### 4. Provide Fallback Behavior

```typescript
if (this.path && this.path.length > 1) {
  this.followPath(transform, delta);
} else {
  this.moveDirectly(transform, target, delta);
}
```

### 5. Use Current Layer from GridPositionComponent

```typescript
const gridPos = this.entity.get(GridPositionComponent)!;

this.path = this.pathfinder.findPath(
  startCol,
  startRow,
  goalCol,
  goalRow,
  gridPos.currentLayer  // Always use entity's actual layer
);
```

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

## Debugging

**Visualize Path:**
```typescript
if (this.path) {
  for (const node of this.path) {
    const world = this.grid.cellToWorld(node.col, node.row);
    // Draw debug circle at world.x, world.y
  }
}
```

**Log Path Length:**
```typescript
if (this.path) {
  console.log(`Path found: ${this.path.length} nodes`);
} else {
  console.log('No path found');
}
```

## Future Enhancements

Potential improvements to the pathfinding system:

- **Diagonal movement** - Support 8-direction movement
- **Dynamic costs** - Different terrain types (mud, water, etc.)
- **Avoidance** - Avoid other entities in path
- **Path smoothing** - Reduce zigzag patterns
- **Jump point search** - Faster pathfinding for large grids
- **Hierarchical pathfinding** - Multi-level pathfinding for huge maps
