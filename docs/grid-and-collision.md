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

*Note: `npm run dev` is optional if you already have the dev server running in another terminal.*

---

## Grid System

### Overview

The game uses a fixed-size grid for collision detection and entity placement:
- **Cell size**: 64x64 pixels (configurable)
- **Grid dimensions**: 40x30 cells (configurable)
- **Purpose**: Simplifies collision detection and spatial queries
- **Scrolling**: Grid can be larger than visible screen; camera follows player
- **Layer system**: Supports multi-level environments with transitions between layers

### Cell Properties

Each grid cell tracks:
```typescript
interface CellData {
### Cell Properties

Each grid cell tracks:
```typescript
interface CellData {
  layer: number;                  // Vertical layer (-1 = pit, 0 = ground, 1 = platform/wall)
  properties: Set<CellProperty>;  // 'platform', 'wall', or 'stairs'
  occupants: Set<Entity>;         // Which entities are in this cell
}

type CellProperty = 'platform' | 'wall' | 'stairs';
```

**Property Meanings:**
- **'platform'**: Elevated surface (layer 1) - walkable, no visual pattern
- **'wall'**: Solid barrier (layer 1) - blocks movement, renders with brick/stone pattern
- **'stairs'**: Transition between layers - allows vertical movement only

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
  - From above: Can enter when moving down
  - From below: Can enter when moving up
- **Exit**: Only up or down (no left/right movement)
  - Up: Moves to layer+1
  - Down: Moves to same layer or layer-1
- **Restriction**: Cannot move left/right while in transition cell

**Projectile Layer Rules:**
1. Bullets start at player's current layer
2. If player is on stairs AND bullet spawn position is in a higher layer cell → bullet upgrades immediately
3. If player is NOT on stairs → bullet uses player's layer (blocked by higher platforms)
4. Bullets pass through platforms at same layer or lower
5. Bullets blocked by walls at strictly higher layer
6. When bullet passes through stairs, it upgrades to stairs layer + 1
7. After upgrading through stairs:
   - Walls blocked at upgraded layer or higher (`>=`)
   - Platforms blocked only at strictly higher layer (`>`)
8. Without upgrading through stairs:
   - Both walls and platforms blocked at strictly higher layer (`>`)

**Examples:**
- Standing on layer 0, shoot at layer 1 wall → blocked
- Standing on layer 0, shoot at layer 1 platform → blocked
- Standing on layer 0 near layer 1 platform, gun tip in layer 1 → blocked (player not on stairs)
- Standing on layer 0 stairs, gun tip in layer 1 cell → bullet starts at layer 1
- Standing on layer 0 stairs, shoot through stairs → bullet upgrades to layer 1
- After upgrading to layer 1, shoot at layer 1 wall → blocked
- After upgrading to layer 1, shoot at layer 1 platform → passes through
- After upgrading to layer 1, shoot at layer 2 wall → blocked

**Debug Visualization:**
- **Darker shading**: Higher layers (layer 1+)
- **Lighter shading**: Lower layers (layer -1)
- **Blue overlay**: Transition cells
- **Green overlay**: Occupied cells
- **Brick/stone pattern**: Walls (layer 1 with 'wall' property)

### Grid API

```typescript
class Grid {
  cells: CellData[][];
  
  // Cell manipulation
  setCell(col: number, row: number, data: Partial<CellData>): void;
  getCell(col: number, row: number): CellData | null;
  
  // Coordinate conversion
  worldToCell(x: number, y: number): { col: number; row: number };
  cellToWorld(col: number, row: number): { x: number; y: number };
  
  // Occupancy tracking
  addOccupant(col: number, row: number, entity: Entity): void;
  removeOccupant(col: number, row: number, entity: Entity): void;
  
  // Debug rendering
  render(): void;
  renderCollisionBox(x: number, y: number, width: number, height: number): void;
  renderEmitterBox(x: number, y: number, size: number): void;
}
```

### Setting Up Layers

```typescript
// Layer -1 (pit area)
for (let col = 5; col <= 8; col++) {
  for (let row = 5; row <= 7; row++) {
    this.grid.setCell(col, row, { layer: -1 });
  }
}

// Layer 1 platform (elevated, walkable)
for (let col = 15; col <= 20; col++) {
  for (let row = 8; row <= 12; row++) {
    this.grid.setCell(col, row, { layer: 1, properties: new Set(['platform']) });
  }
}

// Layer 1 wall (blocks movement, renders with pattern)
for (let col = 25; col <= 30; col++) {
  this.grid.setCell(col, 10, { layer: 1, properties: new Set(['wall']) });
}

// Transition cell (staircase) to access layer 1 platform
this.grid.setCell(17, 13, { layer: 0, isTransition: true });
```

**Key Points:**
- Default cells are layer 0
- Transition cells connect adjacent layers (e.g., layer 0 transition connects to layer 1)
- Place transition cells adjacent to the platform they connect to
- Entities must use transition cells to change layers

### Debug Visualization

Press **G** key to toggle debug rendering:
- **White grid lines**: Cell boundaries
- **Layer shading**: Darker for higher layers, lighter for lower layers
- **Blue overlay**: Transition cells (staircases)
- **Green overlay**: Occupied by entities
- **Blue boxes**: Entity collision boxes
- **Red boxes**: Projectile emitter positions

---

## Collision System

### Collision Box

Each entity with collision has a box defined relative to its position:

```typescript
interface CollisionBox {
  offsetX: number;  // Horizontal offset from entity center
  offsetY: number;  // Vertical offset from entity center
  width: number;    // Box width in pixels
  height: number;   // Box height in pixels
}
```

### Multi-Cell Occupancy

Entities can occupy multiple grid cells if their collision box spans them:

```
┌─────┬─────┬─────┐
│     │     │     │
├─────┼─────┼─────┤
│     │ ┌─┐ │     │  Entity collision box
│     │ │E│ │     │  spans 4 cells
├─────┼─┴─┴─┼─────┤
│     │     │     │
└─────┴─────┴─────┘
```

### Sliding Collision

When blocked diagonally, entities slide along the unblocked axis:

```
Player moving diagonally up-right:
- Blocked horizontally (wall to right)
- Not blocked vertically
→ Player slides upward only
```

### GridCollisionComponent

Handles all collision logic including layer-based movement:

```typescript
class GridCollisionComponent {
  update(delta: number): void {
    // 1. Get current and target positions
    // 2. Calculate which cells the collision box overlaps
    // 3. Check layer-based movement rules for each cell
    // 4. Apply sliding collision if partially blocked
    // 5. Update grid occupancy and current layer
  }
}
```

**Features:**
- Validates movement against layer rules
- Enforces transition cell restrictions (vertical only)
- Implements sliding collision
- Updates grid occupancy automatically
- Tracks entity's current layer
- Handles multi-cell entities
- Box-in-box collision detection (checks all overlapping cells)
```

**Features:**
- Validates movement against layer rules
- Enforces transition cell restrictions (vertical only)
- Implements sliding collision
- Updates grid occupancy automatically
- Tracks entity's current layer
- Handles multi-cell entities
- Box-in-box collision detection (checks all overlapping cells)

### Collision Box Sizing Guidelines

**Small box (32x16)** - Fast entities, tight spaces:
```typescript
{ offsetX: 0, offsetY: 16, width: 32, height: 16 }
```

**Medium box (48x32)** - Standard characters:
```typescript
{ offsetX: 0, offsetY: 16, width: 48, height: 32 }
```

**Large box (64x64)** - Big enemies, bosses:
```typescript
{ offsetX: 0, offsetY: 0, width: 64, height: 64 }
```

**Offset tips:**
- `offsetY > 0`: Collision at feet (common for top-down view)
- `offsetY = 0`: Full body collision
- `offsetX = 0`: Centered horizontally (most common)

---

## Projectile Collision

Projectiles use a different collision system than entities:

### ProjectileComponent

```typescript
class ProjectileComponent {
  constructor(props: {
    dirX: number;           // Direction X (-1 to 1)
    dirY: number;           // Direction Y (-1 to 1)
    speed: number;          // Pixels per second
    maxDistance: number;    // Max travel distance
    grid: Grid;             // Grid reference
    blockedByWalls: boolean;// Whether walls/platforms stop this projectile
    startLayer: number;     // Player's current layer
    fromTransition: boolean;// Fired from transition cell or gun in higher layer
  }) {}
}
```

### Layer-Based Projectile Collision

**Initialization:**
1. Bullet starts at player's `currentLayer`
2. If bullet spawn position (gun tip) is in a higher layer cell → auto-upgrade
3. If `fromTransition: true` → bullet starts at `startLayer + 1`

**Collision Rules:**

**Without upgrading through stairs:**
- Walls blocked at strictly higher layer (`layer > currentLayer`)
- Platforms blocked at strictly higher layer (`layer > currentLayer`)

**After upgrading through stairs:**
- Walls blocked at upgraded layer or higher (`layer >= currentLayer`)
- Platforms blocked only at strictly higher layer (`layer > currentLayer`)

**Transition cells:**
- Never block projectiles
- Upgrade bullet's `currentLayer` to `transitionLayer + 1`
- Set `hasUpgradedThroughStairs = true`

**Examples:**

```typescript
// Standing on layer 0, shoot at layer 1 wall → blocked
// Standing on layer 0, shoot at layer 1 platform → blocked

// Standing on layer 0 stairs, gun tip in layer 1 cell
// → bullet auto-upgrades to layer 1
// → layer 1 walls blocked, layer 1 platforms pass through

// Standing on layer 0, shoot through stairs
// → bullet upgrades to layer 1 when passing through stairs
// → layer 1 walls blocked, layer 1 platforms pass through

// Standing on layer 1, shoot at layer 1 wall → passes through
// Standing on layer 1, shoot at layer 2 wall → blocked
```

**Implementation:**
```typescript
// In BulletEntity.ts
const startCell = grid.worldToCell(x, y);
const startCellData = grid.getCell(startCell.col, startCell.row);
const startCellLayer = startCellData ? grid.getLayer(startCellData) : layer;
const actualFromTransition = fromTransition || startCellLayer > layer;

// In ProjectileComponent.ts
constructor(props: ProjectileProps) {
  this.currentLayer = props.fromTransition ? props.startLayer + 1 : props.startLayer;
  this.hasUpgradedThroughStairs = props.fromTransition;
}

update(delta: number): void {
  // Upgrade when passing through stairs
  if (this.grid.isTransition(cellData)) {
    this.currentLayer = Math.max(this.currentLayer, this.grid.getLayer(cellData) + 1);
    this.hasUpgradedThroughStairs = true;
  }
  
  // Check collision
  if (this.shouldCheckWallCollision(cellData)) {
    this.entity.destroy();
  }
}

private shouldCheckWallCollision(cellData: CellData): boolean {
  if (!this.blockedByWalls || this.grid.isTransition(cellData)) return false;
  
  const cellLayer = this.grid.getLayer(cellData);
  if (cellLayer === 0) return false;
  
  const isWall = this.grid.isWall(cellData);
  
  if (this.hasUpgradedThroughStairs) {
    // Walls blocked at upgraded layer or higher
    if (isWall) return cellLayer >= this.currentLayer;
    // Platforms blocked only at strictly higher layer
    return cellLayer > this.currentLayer;
  }
  
  // Without upgrading: both blocked at strictly higher layer
  return cellLayer > this.currentLayer;
}
```

---

## Scene Setup

### GameScene Structure

```typescript
class GameScene extends Phaser.Scene {
  private grid!: Grid;
  private player!: Entity;
  private joystick!: Entity;
  private bullets: Entity[] = [];
  private shells: Entity[] = [];
  
  preload(): void {
    preloadAssets(this);
  }
  
  create(): void {
    // 1. Create grid
    this.grid = new Grid(this, 40, 30, 64);
    
    // 2. Set up layers and transitions
    this.setupLayers();
    
    // 3. Create joystick
    this.joystick = createJoystickEntity(this);
    
    // 4. Create player
    this.player = createPlayerEntity(
      this,
      startX,
      startY,
      this.grid,
      this.onFire.bind(this),
      this.onShellEject.bind(this),
      this.joystick
    );
    
    // 5. Setup camera
    this.cameras.main.setBounds(0, 0, gridWidth, gridHeight);
    this.cameras.main.startFollow(this.player.get(TransformComponent)!.sprite, true, 0.1, 0.1);
    
    // 6. Debug controls
    this.input.keyboard?.addKey('G').on('down', () => {
      this.grid.toggleDebug();
    });
  }
  
  update(_time: number, delta: number): void {
    // Update all entities
    this.joystick.update(delta);
    this.player.update(delta);
    
    // Update and filter bullets
    this.bullets = this.bullets.filter(bullet => {
      if (bullet.isDestroyed) return false;
      bullet.update(delta);
      return true;
    });
    
    // Update and filter shells
    this.shells = this.shells.filter(shell => {
      if (shell.isDestroyed) return false;
      shell.update(delta);
      return true;
    });
    
    // Render debug
    this.grid.render();
  }
  
  private onFire(x: number, y: number, dirX: number, dirY: number): void {
    const bullet = createBulletEntity(this, x, y, dirX, dirY, this.grid);
    this.bullets.push(bullet);
  }
  
  private onShellEject(x: number, y: number, direction: 'left' | 'right', playerDirection: Direction): void {
    const shell = createShellCasingEntity(this, x, y, direction, playerDirection);
    this.shells.push(shell);
  }
}
```

### Camera Setup

```typescript
// Set camera bounds to grid size
const gridWidth = this.grid.cols * this.grid.cellSize;
const gridHeight = this.grid.rows * this.grid.cellSize;
this.cameras.main.setBounds(0, 0, gridWidth, gridHeight);

// Follow player with smooth lerp
const playerTransform = this.player.get(TransformComponent)!;
this.cameras.main.startFollow(playerTransform.sprite, true, 0.1, 0.1);
```

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

**Why this works:**
- Destroyed entities are automatically removed from array
- No manual tracking of indices needed
- Clean and functional approach

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

## Common Patterns

### Setting Up Multi-Layer Environments

```typescript
private setupLayers(): void {
  // Layer -1 (pit area)
  for (let col = 5; col <= 8; col++) {
    for (let row = 5; row <= 7; row++) {
      this.grid.setCell(col, row, { layer: -1 });
    }
  }
  
  // Layer 1 (elevated platform)
  for (let col = 15; col <= 20; col++) {
    for (let row = 8; row <= 12; row++) {
      this.grid.setCell(col, row, { layer: 1 });
    }
  }
  
  // Transition cell (staircase) - place adjacent to platform
  this.grid.setCell(17, 13, { layer: 0, isTransition: true });
  
  // Another platform with its own transition
  for (let col = 25; col <= 28; col++) {
    for (let row = 15; row <= 18; row++) {
      this.grid.setCell(col, row, { layer: 1 });
    }
  }
  this.grid.setCell(26, 19, { layer: 0, isTransition: true });
}
  
  // Interior walls
  for (let col = 10; col <= 15; col++) {
    this.grid.setCell(col, 10, { walkable: false, blocksProjectiles: true });
  }
}
```

### Spawning Entities at Specific Layers

```typescript
spawnEnemy(col: number, row: number, layer: number): void {
  const { x, y } = this.grid.cellToWorld(col, row);
  const enemy = createEnemyEntity(this, x, y, this.grid);
  
  // Set initial layer
  const gridPos = enemy.get(GridPositionComponent)!;
  gridPos.currentLayer = layer;
  
  this.enemies.push(enemy);
}
```

### Firing Projectiles with Layer Awareness

```typescript
private onFire(x: number, y: number, dirX: number, dirY: number): void {
  const gridPos = this.player.get(GridPositionComponent)!;
  const playerCell = this.grid.getCell(gridPos.currentCell.col, gridPos.currentCell.row);
  const fromTransition = playerCell?.isTransition ?? false;
  
  const bullet = createBulletEntity(
    this, x, y, dirX, dirY, 
    this.grid, 
    gridPos.currentLayer,  // Current layer
    fromTransition         // Can hit layer+1 if from transition
  );
  this.bullets.push(bullet);
}
```

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
