# Game Architecture - Grid and Collision Systems

**Quick Links:**
- [ECS Architecture](./ecs-architecture.md) - Entity-Component system
- [Input Systems](./input-systems.md) - Joystick and keyboard controls
- [Coding Standards](./coding-standards.md) - TypeScript and design principles
- [Quick Reference](./quick-reference.md) - Common tasks

This document focuses on the grid system, collision detection, and scene setup.

---

## ⚠️ MANDATORY: Build and Lint After Every Change ⚠️

```bash
npm run build                # MUST pass with zero errors
npx eslint src --ext .ts     # MUST pass with zero errors
```

---

## Grid System

### Overview

- **Cell size**: 64x64 pixels (configurable)
- **Grid dimensions**: 40x30 cells (configurable)
- **Purpose**: Simplifies collision detection and spatial queries
- **Scrolling**: Grid can be larger than visible screen; camera follows player
- **Layer system**: Supports multi-level environments with transitions between layers

### Cell Properties

Each grid cell tracks layer, properties (platform/wall/stairs/path/water/blocked/bridge), and occupants.

**Property Meanings:**
- **'platform'**: Elevated surface (layer 1) - walkable, no visual pattern
- **'wall'**: Solid barrier (layer 1) - blocks movement, renders with brick/stone pattern
- **'stairs'**: Transition between layers - allows vertical movement only
- **'path'**: Stone path (grass theme only) - walkable, renders as connected grey stones
- **'water'**: Water cells - player swims at reduced speed (70%), triggers water effects
  - Uses `PLAYER_SWIMMING_GRID_COLLISION_BOX` (64×64) for collision detection
  - Background textures on water cells render at depth -8 (below swimming player at -7)
- **'blocked'**: Blocks all movement - can be combined with 'water' to create obstacles in water
- **'bridge'**: Bridge over water - when combined with 'water' property, allows walking over water at full speed
  - Walking onto bridge+water: Player continues walking (doesn't enter water)
  - Swimming under bridge+water: Player continues swimming at reduced speed
  - Ripples only appear when swimming under bridge, not when walking over
  - Player renders at depth -7 when swimming (below bridge textures at -5, above water at -10)
  - Cannot hop out through bridge cells (blocked in all directions)
  - **Workaround**: Use 'blocked' property on water cells at corners to prevent swimming into land

### Layer System

The grid supports vertical layering for multi-level environments:

**Layer Values:**
- **Layer -1**: Pits, water, lower areas
- **Layer 0**: Default ground level
- **Layer 1**: Platforms and walls (elevated surfaces)
- **Layer 2+**: Higher levels (if needed)

**Movement Rules:**
- Entities can only move to cells on the **same layer**
- Layer changes only allowed through **transition cells** (stairs)
- Diagonal movement between different layers is blocked
- **Walls block all movement** (horizontal and vertical)

**Transition Cells (Staircases):**
- Special cells that connect two adjacent layers
- **Player layer updates immediately** when stepping on stairs
- **Entry**: Only from top or bottom (vertical movement only)
- **Exit**: Only up or down (no left/right movement)
- **Restriction**: Cannot move left/right while in transition cell

**Projectile Layer Rules (DEFINITIVE):**

These are the complete and authoritative rules for bullet collision with layers.

**Core Principles:**
1. **Walls never block bullets** - Cells with 'wall' property do not stop bullets
2. **Stairs upgrade bullet layer** - When bullet enters stairs, it adopts the stairs' layer value
3. **Direction matters** - Going UP through stairs applies restrictions, going DOWN does not

**Before Traversing Any Stairs:**
- Bullets blocked by platforms (layer ≥ 1) that are ABOVE player's starting layer

**When Bullet Enters Stairs:**
- Bullet's `currentLayer` = stairs layer
- Track if going UP: `wentUpThroughStairs = true` if stairs layer > previous layer

**After Traversing Stairs UP (wentUpThroughStairs = true):**
- **Lower layers BLOCKED**: Any cell with layer < currentLayer stops the bullet
- **Same layer PASSES**: All cells at currentLayer pass through
- **Higher layers BLOCKED**: Any cell with layer > currentLayer stops the bullet

**After Traversing Stairs DOWN (wentUpThroughStairs = false):**
- No special restrictions
- Bullet continues with "Before Traversing" rules

**Debug Visualization:**
- **Darker shading**: Higher layers (layer 1+)
- **Lighter shading**: Lower layers (layer -1)
- **Blue overlay**: Transition cells
- **Green overlay**: Occupied cells
- **Brick/stone pattern**: Walls (layer 1 with 'wall' property)

### Grid API

See `src/systems/grid/Grid.ts` for complete API.

### Debug Visualization

Press **G** key to toggle debug rendering.

---

## Collision System

### Collision Box

Each entity with collision has a box defined relative to its position (offsetX, offsetY, width, height).

### Multi-Cell Occupancy

Entities can occupy multiple grid cells if their collision box spans them.

### Sliding Collision

When blocked diagonally, entities slide along the unblocked axis.

### GridCollisionComponent

Handles all collision logic including layer-based movement. Features:
- Validates movement against layer rules
- Enforces transition cell restrictions (vertical only)
- Implements sliding collision
- Updates grid occupancy automatically
- Tracks entity's current layer
- Handles multi-cell entities
- Box-in-box collision detection (checks all overlapping cells)

### Collision Box Sizing Guidelines

**Small box (32x16)** - Fast entities, tight spaces
**Medium box (48x32)** - Standard characters
**Large box (64x64)** - Big enemies, bosses

**Offset tips:**
- `offsetY > 0`: Collision at feet (common for top-down view)
- `offsetY = 0`: Full body collision
- `offsetX = 0`: Centered horizontally (most common)

---

## Projectile Collision

Projectiles use a different collision system than entities. See `ProjectileComponent` for implementation.

---

## Scene Setup

### GameScene Structure

GameScene uses a state machine to manage game states. Currently has one state:
- **InGameState** - Handles entity updates, collision checks, and grid rendering

See `src/scenes/GameScene.ts` for complete implementation.

### Camera Setup

Camera bounds set to grid size, follows player with smooth lerp (0.1, 0.1).

### Entity Lifecycle Management

**Pattern: Filter destroyed entities**
```typescript
update(delta: number): void {
  this.bullets = this.bullets.filter(bullet => {
    if (bullet.isDestroyed) return false;
    bullet.update(delta);
    return true;
  });
}
```

---

## Performance Considerations

### Grid Optimization

- **Cell size**: 64x64 is a good balance between precision and performance
- **Spatial queries**: O(1) lookup for entities in a cell
- **Occupancy tracking**: Only update when entity moves to new cell

### Entity Management

- **Object pooling**: Consider for frequently spawned entities (bullets, particles)
- **Update filtering**: Only update entities that need it
- **Destroy promptly**: Remove entities as soon as they're no longer needed

### Debug Rendering

- **Toggle-able**: Debug rendering can be expensive, make it optional
- **Conditional**: Only render debug info when debug mode is enabled
- **Frame-based**: Clear and redraw debug visuals each frame

---

## Summary

The grid and collision systems provide:
- **Layer-based environments**: Multi-level maps with vertical gameplay
- **Transition cells**: Staircases connecting different layers
- **Simple collision detection**: Cell-based checks are fast and predictable
- **Box-in-box collision**: Accurate collision for all overlapping cells
- **Flexible collision boxes**: Size and offset per entity type
- **Sliding collision**: Natural movement along walls
- **Multi-cell occupancy**: Large entities handled automatically
- **Projectile flexibility**: Different collision rules per projectile type
- **Debug visualization**: Easy to see what's happening

These systems form the foundation for all entity movement and interaction in the game.
