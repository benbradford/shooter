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

### Cell Properties

Each grid cell tracks:
```typescript
interface CellData {
  walkable: boolean;              // Can entities move through this cell?
  occupants: Set<Entity>;         // Which entities are in this cell
  blocksProjectiles: boolean;     // Do projectiles stop here?
}
```

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

### Setting Up Walls

```typescript
// Single wall
this.grid.setCell(5, 5, { walkable: false, blocksProjectiles: true });

// Row of walls
for (let col = 5; col <= 10; col++) {
  this.grid.setCell(col, 5, { walkable: false, blocksProjectiles: true });
}

// Pit/water (blocks movement but not projectiles)
this.grid.setCell(10, 10, { walkable: false, blocksProjectiles: false });
```

### Debug Visualization

Press **G** key to toggle debug rendering:
- **White grid lines**: Cell boundaries
- **Red cells**: Non-walkable (`walkable: false`)
- **Green cells**: Occupied by entities
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

Handles all collision logic:

```typescript
class GridCollisionComponent {
  update(delta: number): void {
    // 1. Get current and target positions
    // 2. Calculate which cells are occupied
    // 3. Check if target cells are walkable
    // 4. Apply sliding collision if partially blocked
    // 5. Update grid occupancy
  }
}
```

**Features:**
- Validates movement against `walkable` cells
- Implements sliding collision
- Updates grid occupancy automatically
- Handles multi-cell entities

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
  constructor(
    dirX: number,           // Direction X (-1 to 1)
    dirY: number,           // Direction Y (-1 to 1)
    speed: number,          // Pixels per second
    maxDistance: number,    // Max travel distance
    grid: Grid,             // Grid reference
    blockedByWalls: boolean // Whether walls stop this projectile
  ) {}
}
```

### Wall Collision Behavior

**Bullets** - Blocked by walls:
```typescript
new ProjectileComponent(dirX, dirY, 800, 700, grid, true);
```

**Grenades** - Fly over walls:
```typescript
new ProjectileComponent(dirX, dirY, 600, 500, grid, false);
```

**Implementation:**
```typescript
update(delta: number): void {
  // Move projectile
  this.transform.x += this.dirX * this.speed * (delta / 1000);
  this.transform.y += this.dirY * this.speed * (delta / 1000);
  
  // Check collision if blockedByWalls is true
  if (this.blockedByWalls) {
    const cell = this.grid.worldToCell(this.transform.x, this.transform.y);
    const cellData = this.grid.getCell(cell.col, cell.row);
    
    if (!cellData || cellData.blocksProjectiles) {
      this.entity.destroy();
    }
  }
  
  // Check max distance
  this.distanceTraveled += this.speed * (delta / 1000);
  if (this.distanceTraveled >= this.maxDistance) {
    this.entity.destroy();
  }
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
    
    // 2. Set up walls
    this.setupWalls();
    
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

### Adding Walls Programmatically

```typescript
private setupWalls(): void {
  // Border walls
  for (let col = 0; col < this.grid.cols; col++) {
    this.grid.setCell(col, 0, { walkable: false, blocksProjectiles: true });
    this.grid.setCell(col, this.grid.rows - 1, { walkable: false, blocksProjectiles: true });
  }
  
  for (let row = 0; row < this.grid.rows; row++) {
    this.grid.setCell(0, row, { walkable: false, blocksProjectiles: true });
    this.grid.setCell(this.grid.cols - 1, row, { walkable: false, blocksProjectiles: true });
  }
  
  // Interior walls
  for (let col = 10; col <= 15; col++) {
    this.grid.setCell(col, 10, { walkable: false, blocksProjectiles: true });
  }
}
```

### Spawning Entities at Runtime

```typescript
spawnEnemy(col: number, row: number): void {
  const { x, y } = this.grid.cellToWorld(col, row);
  const enemy = createEnemyEntity(this, x, y, this.grid);
  this.enemies.push(enemy);
}
```

### Checking Line of Sight

```typescript
hasLineOfSight(fromX: number, fromY: number, toX: number, toY: number): boolean {
  // Bresenham's line algorithm
  // Check each cell along the line
  // Return false if any cell blocks projectiles
  // Return true if clear path
}
```

---

## Summary

The grid and collision systems provide:
- **Simple collision detection**: Cell-based checks are fast and predictable
- **Flexible collision boxes**: Size and offset per entity type
- **Sliding collision**: Natural movement along walls
- **Multi-cell occupancy**: Large entities handled automatically
- **Projectile flexibility**: Different collision rules per projectile type
- **Debug visualization**: Easy to see what's happening

These systems form the foundation for all entity movement and interaction in the game.
