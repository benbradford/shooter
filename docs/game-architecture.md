# Dodging Bullets - Game Architecture Guide

**Quick Links:**
- [Quick Reference Guide](./quick-reference.md) - Common tasks and patterns
- [README](../README.md) - Project overview

This document explains the core architecture, ECS system, and best practices for adding new entities to the game.

## Development Workflow

### CRITICAL: Always Build and Lint After Changes

**Run these commands after making code changes** to catch errors early:

```bash
npm run build  # Compiles TypeScript and builds for production
npx eslint src --ext .ts  # Check code quality and style
npm run dev    # Runs development server with hot reload
```

**Recommended workflow:**
1. Make code changes
2. Run `npm run build` - fix any TypeScript errors
3. Run `npx eslint src --ext .ts` - fix any linting warnings
4. Test in browser with `npm run dev`

### TypeScript Best Practices

#### DO ✅

**Imports:**
- Use relative paths correctly based on file location
- Components in `src/ecs/components/` import from `'../Component'` and `'../Entity'`
- Use `import type` for type-only imports to reduce bundle size
- Use `export type` when re-exporting interfaces

```typescript
// ✅ Correct - type-only import
import type { Component } from '../Component';
import type { Entity } from '../Entity';

// ✅ Correct - value import for classes
import { TransformComponent } from './TransformComponent';

// ✅ Correct - re-exporting types
export type { Component } from './Component';
export { Entity } from './Entity';
```

**Readonly Properties:**
- Mark properties `readonly` if they're never reassigned after construction
- Use constructor parameter properties for readonly dependencies

```typescript
// ✅ Correct - readonly for immutable references
class MyComponent {
  constructor(
    private readonly grid: Grid,
    private readonly transform: TransformComponent
  ) {}
}

// ✅ Correct - mutable state
class MyComponent {
  private currentHealth: number = 100;  // Changes during gameplay
}
```

**Unused Parameters:**
- Prefix unused parameters with `_` to satisfy linter
- ESLint is configured to ignore variables starting with `_`

```typescript
// ✅ Correct
update(_delta: number): void {
  // delta not used
}
```

**Type Safety:**
- Never use `any` - use specific types or `unknown`
- For constructor types, use `never[]` for args: `new (...args: never[]) => T`
- For key-value objects, use `Record<string, Type>`

```typescript
// ✅ Correct - specific type
private readonly keys: Record<string, Phaser.Input.Keyboard.Key>;

// ✅ Correct - constructor type
get<T extends Component>(componentClass: new (...args: never[]) => T): T | undefined

// ❌ Wrong - any type
private keys: any;
```

**Null Safety:**
- Use optional chaining `?.` for potentially null values
- Use non-null assertion `!` only when you're certain value exists

```typescript
// ✅ Correct - optional chaining
scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.G);

// ✅ Correct - non-null assertion when guaranteed
const transform = this.entity.get(TransformComponent)!;
```

#### DON'T ❌

**Imports:**
```typescript
// ❌ Wrong - incorrect relative path
import type { Component } from './Component';  // In components/ folder

// ❌ Wrong - missing 'type' keyword for interfaces
import { Component } from '../Component';

// ❌ Wrong - re-exporting without 'type'
export { Component } from './Component';  // Should be 'export type'
```

**Readonly:**
```typescript
// ❌ Wrong - readonly on reassigned property
class MyComponent {
  private readonly occupiedCells: Set<string> = new Set();
  
  update() {
    this.occupiedCells = new Set();  // ERROR: Can't reassign readonly
  }
}

// ❌ Wrong - not using readonly for immutable references
class MyComponent {
  constructor(private grid: Grid) {}  // Should be readonly
}
```

**Type Safety:**
```typescript
// ❌ Wrong - using any
private keys: any;
get<T>(componentClass: new (...args: any[]) => T): T

// ❌ Wrong - not typing Record
private keys: { [key: string]: any };

// ✅ Correct
private readonly keys: Record<string, Phaser.Input.Keyboard.Key>;
get<T extends Component>(componentClass: new (...args: never[]) => T): T | undefined
```

**Duplicate Declarations:**
```typescript
// ❌ Wrong - declaring property twice
class Grid {
  private scene: Phaser.Scene;
  
  constructor(private scene: Phaser.Scene) {}  // Duplicate!
}

// ✅ Correct - use parameter property OR separate declaration
class Grid {
  constructor(private readonly scene: Phaser.Scene) {}
}
```

**Unused Variables:**
```typescript
// ❌ Wrong - unused variable
const animation = entity.add(new AnimationComponent(...));
// Never used again

// ✅ Correct - don't assign if not used
entity.add(new AnimationComponent(...));
```

### ESLint Configuration

The project uses ESLint with TypeScript support. Key rules:

- **`@typescript-eslint/no-unused-vars`**: Allows `_` prefix for intentionally unused parameters
- **`@typescript-eslint/no-explicit-any`**: Disallows `any` type - use specific types

**To add ESLint to a new project:**
```bash
npm install --save-dev eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
npx eslint --init
```

**Configure in `eslint.config.ts`:**
```typescript
rules: {
  "@typescript-eslint/no-unused-vars": [
    "error",
    {
      "argsIgnorePattern": "^_",
      "varsIgnorePattern": "^_"
    }
  ]
}
```

## Core Concepts

### Entity-Component System (ECS)

The game uses an ECS architecture where:
- **Entity**: A container with an ID that holds components
- **Component**: Reusable logic/data modules that define behavior
- **Update Order**: Components update in a specific order defined per entity

### Grid System

- **Fixed grid**: 64x64 pixel cells (configurable via `cellSize`)
- **Grid dimensions**: 40x30 cells (configurable)
- **Cell properties**:
  - `walkable: boolean` - Can entities move through this cell?
  - `occupants: Set<Entity>` - Which entities are currently in this cell
  - `blocksProjectiles: boolean` - Do projectiles stop here?

### Collision System

- **Collision box**: Each entity has a box (offset, width, height) for collision detection
- **Multi-cell occupancy**: Entities can occupy multiple cells if their collision box spans them
- **Sliding collision**: When blocked diagonally, entities slide along the unblocked axis
- **Grid tracking**: Grid automatically tracks which entities occupy which cells

## Component Library

### Core Components

**TransformComponent** - Position, rotation, scale
```typescript
new TransformComponent(x, y, rotation, scale)
```

**SpriteComponent** - Visual representation (Phaser sprite)
```typescript
new SpriteComponent(scene, texture, transformComponent)
```

**AnimationComponent** - Animation system integration
```typescript
new AnimationComponent(animationSystem, spriteComponent)
```

### Movement Components

**InputComponent** - Keyboard input (player only)
```typescript
new InputComponent(scene)
// Provides: getInputDelta() -> { dx, dy }
```

**WalkComponent** - Movement logic
```typescript
new WalkComponent(transformComponent, inputComponent)
// Properties: speed, lastDir
// Methods: isMoving()
```

### Grid Integration Components

**GridPositionComponent** - Tracks entity's cell position and collision box
```typescript
new GridPositionComponent(col, row, collisionBox)
// collisionBox: { offsetX, offsetY, width, height }
```

**GridCollisionComponent** - Validates movement, updates grid occupancy
```typescript
new GridCollisionComponent(grid)
// Handles: collision detection, sliding, grid tracking
```

### State Management

**StateMachineComponent** - Wraps StateMachine for entity states
```typescript
new StateMachineComponent(stateMachine)
```

## Component Update Order

**Critical**: Components update in the order they're added to the entity. Use `entity.setUpdateOrder()` to control this.

**Standard order for moving entities**:
1. `TransformComponent` - Base position
2. `SpriteComponent` - Sync sprite with transform
3. `InputComponent` - Read input (if applicable)
4. `WalkComponent` - Calculate new position
5. `GridCollisionComponent` - Validate and adjust position
6. `StateMachineComponent` - Update state based on movement
7. `AnimationComponent` - Update animation frames

**Why this order matters**:
- Walk must update before GridCollision (so collision sees new position)
- GridCollision must update before StateMachine (so states see final position)
- StateMachine must update before Animation (so animation changes apply)

## Creating New Entities

### Example: Projectile (Bullet)

**Requirements**:
- Moves in a straight line
- Destroyed on wall collision
- Doesn't occupy grid cells (flies over)
- Checks `blocksProjectiles` instead of `walkable`

**Components needed**:
```typescript
function createBulletEntity(scene, x, y, dirX, dirY, grid) {
  const entity = new Entity('bullet');
  
  // Transform
  const transform = entity.add(new TransformComponent(x, y, 0, 1));
  
  // Sprite
  const sprite = entity.add(new SpriteComponent(scene, 'bullet', transform));
  
  // Projectile movement (custom component)
  const projectile = entity.add(new ProjectileComponent(transform, dirX, dirY, 500));
  
  // Projectile collision (custom component)
  const collision = entity.add(new ProjectileCollisionComponent(grid, entity));
  
  // Update order
  entity.setUpdateOrder([
    TransformComponent,
    ProjectileComponent,
    ProjectileCollisionComponent,
    SpriteComponent,
  ]);
  
  return entity;
}
```

**ProjectileComponent** (new):
```typescript
class ProjectileComponent implements Component {
  entity!: Entity;
  
  constructor(
    private transform: TransformComponent,
    private dirX: number,
    private dirY: number,
    private speed: number
  ) {}
  
  update(delta: number): void {
    this.transform.x += this.dirX * this.speed * (delta / 1000);
    this.transform.y += this.dirY * this.speed * (delta / 1000);
  }
  
  onDestroy(): void {}
}
```

**ProjectileCollisionComponent** (new):
```typescript
class ProjectileCollisionComponent implements Component {
  entity!: Entity;
  
  constructor(private grid: Grid, private bulletEntity: Entity) {}
  
  update(delta: number): void {
    const transform = this.bulletEntity.get(TransformComponent)!;
    const cell = this.grid.worldToCell(transform.x, transform.y);
    const cellData = this.grid.getCell(cell.col, cell.row);
    
    if (!cellData || cellData.blocksProjectiles) {
      // Destroy bullet
      this.bulletEntity.destroy();
      // Remove from scene (handle in GameScene)
    }
  }
  
  onDestroy(): void {}
}
```

### Example: Enemy

**Requirements**:
- Walks around (AI-controlled)
- Collides with walls
- Occupies grid cells
- Has animations
- Can shoot at player

**Components needed**:
```typescript
function createEnemyEntity(scene, x, y, grid) {
  const entity = new Entity('enemy');
  
  // Transform
  const transform = entity.add(new TransformComponent(x, y, 0, 2));
  
  // Sprite
  const sprite = entity.add(new SpriteComponent(scene, 'enemy_idle', transform));
  
  // Animation
  const animSystem = new AnimationSystem(enemyAnimations, 'idle_down');
  const animation = entity.add(new AnimationComponent(animSystem, sprite));
  
  // AI movement (custom component)
  const ai = entity.add(new AIComponent(transform));
  
  // Grid position
  const startCell = grid.worldToCell(x, y);
  const gridPos = entity.add(new GridPositionComponent(
    startCell.col,
    startCell.row,
    { offsetX: 0, offsetY: 16, width: 32, height: 16 }
  ));
  
  // Grid collision
  const collision = entity.add(new GridCollisionComponent(grid));
  
  // State machine
  const stateMachine = new StateMachine({
    idle: new EnemyIdleState(entity),
    patrol: new EnemyPatrolState(entity),
    chase: new EnemyChaseState(entity),
    attack: new EnemyAttackState(entity),
  }, 'idle');
  entity.add(new StateMachineComponent(stateMachine));
  
  // Health (custom component)
  const health = entity.add(new HealthComponent(100));
  
  // Update order
  entity.setUpdateOrder([
    TransformComponent,
    SpriteComponent,
    AIComponent,
    GridCollisionComponent,
    StateMachineComponent,
    AnimationComponent,
  ]);
  
  // Add to grid
  grid.addOccupant(startCell.col, startCell.row, entity);
  
  return entity;
}
```

**AIComponent** (new):
```typescript
class AIComponent implements Component {
  entity!: Entity;
  private targetX: number = 0;
  private targetY: number = 0;
  
  constructor(private transform: TransformComponent) {}
  
  update(delta: number): void {
    // AI logic: pathfinding, target selection, etc.
    // Updates transform.x and transform.y
  }
  
  onDestroy(): void {}
}
```

### Example: Static Decoration

**Requirements**:
- Doesn't move
- Doesn't collide
- Just visual

**Components needed**:
```typescript
function createDecorationEntity(scene, x, y) {
  const entity = new Entity('decoration');
  
  const transform = entity.add(new TransformComponent(x, y, 0, 1));
  const sprite = entity.add(new SpriteComponent(scene, 'tree', transform));
  
  entity.setUpdateOrder([
    TransformComponent,
    SpriteComponent,
  ]);
  
  return entity;
}
```

### Example: Static Turret

**Requirements**:
- Doesn't move
- Occupies grid cell (blocks movement)
- Shoots at player
- Has health

**Components needed**:
```typescript
function createTurretEntity(scene, x, y, grid) {
  const entity = new Entity('turret');
  
  const transform = entity.add(new TransformComponent(x, y, 0, 1));
  const sprite = entity.add(new SpriteComponent(scene, 'turret', transform));
  
  // Mark grid cell as non-walkable
  const cell = grid.worldToCell(x, y);
  grid.setCell(cell.col, cell.row, { walkable: false, blocksProjectiles: true });
  
  // Shooting logic (custom component)
  const shooter = entity.add(new ShooterComponent(transform, scene, grid));
  
  // Health
  const health = entity.add(new HealthComponent(50));
  
  entity.setUpdateOrder([
    TransformComponent,
    ShooterComponent,
    SpriteComponent,
  ]);
  
  return entity;
}
```

## Grid Integration Best Practices

### When to Use GridPositionComponent + GridCollisionComponent

**Use for**:
- Player
- Enemies
- NPCs
- Any entity that walks and collides with walls

**Don't use for**:
- Projectiles (they fly over, use custom collision)
- Decorations (no collision needed)
- Static turrets (don't move, manually set grid cell)

### Collision Box Sizing

**Small box (32x16)**: Fast-moving entities, tight corridors
```typescript
{ offsetX: 0, offsetY: 16, width: 32, height: 16 }
```

**Medium box (48x32)**: Standard characters
```typescript
{ offsetX: 0, offsetY: 16, width: 48, height: 32 }
```

**Large box (64x64)**: Big enemies, bosses
```typescript
{ offsetX: 0, offsetY: 0, width: 64, height: 64 }
```

**Offset guidelines**:
- `offsetY > 0`: Push box down (feet collision)
- `offsetY = 0`: Center box (full body collision)
- `offsetX = 0`: Center horizontally (most common)

### Grid Cell Management

**Walls/obstacles**:
```typescript
grid.setCell(col, row, { walkable: false, blocksProjectiles: true });
```

**Pits/water**:
```typescript
grid.setCell(col, row, { walkable: false, blocksProjectiles: false });
```

**Low walls** (block movement, not projectiles):
```typescript
grid.setCell(col, row, { walkable: false, blocksProjectiles: false });
```

## Debug Visualization

Press **G** to toggle debug mode:
- **White grid lines**: Cell boundaries
- **Red cells**: Non-walkable (`walkable: false`)
- **Green cells**: Occupied by entities
- **Blue boxes**: Entity collision boxes

## Entity Lifecycle

1. **Create**: Call factory function (e.g., `createPlayerEntity()`)
2. **Add to scene**: Entity components handle Phaser sprite creation
3. **Update**: GameScene calls `entity.update(delta)` each frame
4. **Destroy**: Call `entity.destroy()` to clean up
   - Removes sprites
   - Removes from grid occupancy
   - Calls `onDestroy()` on all components

## Common Patterns

### Entity Manager (Recommended)

Instead of tracking entities individually in GameScene, create an EntityManager:

```typescript
class EntityManager {
  private entities: Entity[] = [];
  
  add(entity: Entity): void {
    this.entities.push(entity);
  }
  
  remove(entity: Entity): void {
    const index = this.entities.indexOf(entity);
    if (index > -1) {
      this.entities[index].destroy();
      this.entities.splice(index, 1);
    }
  }
  
  update(delta: number): void {
    this.entities.forEach(entity => entity.update(delta));
  }
  
  getEntitiesByType(type: string): Entity[] {
    return this.entities.filter(e => e.id.startsWith(type));
  }
}
```

### Spawning Entities During Gameplay

```typescript
// In GameScene
spawnEnemy(x: number, y: number): void {
  const enemy = createEnemyEntity(this, x, y, this.grid);
  this.entityManager.add(enemy);
}

// Destroy when health reaches 0
if (health.current <= 0) {
  this.entityManager.remove(entity);
}
```

## File Structure

```
src/
├── ecs/
│   ├── Entity.ts
│   ├── Component.ts
│   ├── components/
│   │   ├── TransformComponent.ts
│   │   ├── SpriteComponent.ts
│   │   ├── AnimationComponent.ts
│   │   ├── InputComponent.ts
│   │   ├── WalkComponent.ts
│   │   ├── GridPositionComponent.ts
│   │   ├── GridCollisionComponent.ts
│   │   └── StateMachineComponent.ts
│   └── index.ts
├── player/
│   ├── PlayerEntity.ts (factory function)
│   ├── PlayerIdleState.ts
│   └── PlayerWalkState.ts
├── animation/
│   ├── Animation.ts
│   ├── AnimationSystem.ts
│   └── Direction.ts
├── utils/
│   ├── Grid.ts
│   └── state/
│       ├── StateMachine.ts
│       └── IState.ts
└── GameScene.ts
```

## Next Steps

When adding new entity types:

1. **Identify requirements**: Movement? Collision? Animation? AI?
2. **Choose components**: Reuse existing or create new custom components
3. **Create factory function**: `createXEntity()` in appropriate folder
4. **Set update order**: Use `entity.setUpdateOrder()` for correct behavior
5. **Test with debug mode**: Press G to visualize collision and occupancy
6. **Integrate with EntityManager**: Add/remove entities dynamically

## Key Takeaways

- **Composition over inheritance**: Build entities from components
- **Update order matters**: Control component execution sequence
- **Grid integration is optional**: Only for entities that need collision
- **Collision boxes are flexible**: Size and offset per entity type
- **Debug mode is your friend**: Always test with G pressed
- **Clean up properly**: Call `entity.destroy()` to remove from grid and scene

## Component Reusability Best Practices

### Decoupling Components from Specific Use Cases

When creating components, design them to be reusable across different entity types. Avoid hardcoding behavior that's specific to one entity.

#### ❌ Bad: Tightly Coupled Component

```typescript
class ProjectileEmitterComponent {
  private fireKey: Phaser.Input.Keyboard.Key;
  
  constructor(scene: Phaser.Scene) {
    // Hardcoded to keyboard input - can't be used by AI enemies
    this.fireKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
  }
  
  update() {
    if (this.fireKey.isDown) {
      this.fire();
    }
  }
}
```

#### ✅ Good: Decoupled Component

```typescript
class ProjectileEmitterComponent {
  constructor(
    private readonly scene: Phaser.Scene,
    private readonly onFire: (x: number, y: number, dirX: number, dirY: number) => void,
    private readonly offsets: Record<Direction, EmitterOffset>,
    private readonly shouldFire: () => boolean,  // Callback decides when to fire
    private readonly cooldown: number = 200      // Configurable per entity
  ) {}
  
  update() {
    if (this.shouldFire() && this.canFire) {
      this.fire();
      // Start cooldown...
    }
  }
}
```

**Why this is better:**
- **Player**: `shouldFire: () => input.isFirePressed()`
- **Enemy**: `shouldFire: () => aiComponent.shouldAttack()`
- **Turret**: `shouldFire: () => playerInRange && hasLineOfSight`

### Parameterizing Component Behavior

Make component behavior configurable through constructor parameters:

```typescript
// Player: Fast firing
new ProjectileEmitterComponent(scene, onFire, offsets, shouldFire, 200)

// Enemy: Slow firing
new ProjectileEmitterComponent(scene, onFire, offsets, shouldFire, 1000)

// Boss: Medium firing with different offsets
new ProjectileEmitterComponent(scene, onFire, bossOffsets, shouldFire, 500)
```

### Separation of Concerns

Keep input handling in `InputComponent`, not in gameplay components:

```typescript
// ✅ InputComponent handles all keyboard input
class InputComponent {
  getInputDelta(): { dx: number; dy: number } { /* ... */ }
  isFirePressed(): boolean { return this.fireKey.isDown; }
}

// ✅ ProjectileEmitterComponent uses callback
new ProjectileEmitterComponent(
  scene,
  onFire,
  offsets,
  () => input.isFirePressed(),  // Input logic stays in InputComponent
  200
)
```

## Projectile System Architecture

### Components

**ProjectileComponent** - Movement, lifetime, and collision
```typescript
new ProjectileComponent(
  dirX,           // Direction X (-1 to 1)
  dirY,           // Direction Y (-1 to 1)
  speed,          // Pixels per second
  maxDistance,    // Max travel distance before auto-destroy
  grid,           // Grid reference for collision detection
  blockedByWalls  // Whether walls stop this projectile (default: true)
)
// Moves in straight line, checks grid collisions, auto-destroys after maxDistance
```

**ProjectileEmitterComponent** - Firing logic
```typescript
new ProjectileEmitterComponent(
  scene,
  onFire,           // Callback when bullet spawns
  offsets,          // Emitter position per direction
  shouldFire,       // Callback to check if should fire
  cooldown          // Ms between shots
)
```

### Projectile Types and Wall Collision

Different projectile types can have different collision behavior:

**Bullets** - Blocked by walls:
```typescript
entity.add(new ProjectileComponent(dirX, dirY, 800, 700, grid, true));
```

**Grenades** - Fly over walls:
```typescript
entity.add(new ProjectileComponent(dirX, dirY, 600, 500, grid, false));
```

**Rockets** - Blocked by walls, slower, longer range:
```typescript
entity.add(new ProjectileComponent(dirX, dirY, 400, 1200, grid, true));
```

The `blockedByWalls` parameter determines whether the projectile checks `grid.blocksProjectiles`:
- `true`: Projectile is destroyed when hitting cells with `blocksProjectiles: true`
- `false`: Projectile ignores walls and flies over them

This allows for tactical gameplay where some weapons can shoot over cover while others cannot.

### Entity Lifecycle Management

Track projectiles in GameScene and clean up destroyed entities:

```typescript
class GameScene {
  private bullets: Entity[] = [];
  
  update(delta: number) {
    // Filter out destroyed bullets
    this.bullets = this.bullets.filter(bullet => {
      if (bullet.isDestroyed) {
        return false;  // Remove from array
      }
      bullet.update(delta);
      return true;
    });
  }
}
```

### Bullet Entity Example

```typescript
export function createBulletEntity(
  scene: Phaser.Scene,
  x: number,
  y: number,
  dirX: number,
  dirY: number,
  grid: Grid
): Entity {
  const entity = new Entity('bullet');
  
  // Rotation: add 90° if bullet texture is vertical
  const rotation = Math.atan2(dirY, dirX) + Math.PI / 2;
  
  const transform = entity.add(new TransformComponent(x, y, rotation, 1));
  const sprite = entity.add(new SpriteComponent(scene, 'bullet_default', transform));
  sprite.sprite.setDisplaySize(16, 16);
  
  // Bullet is blocked by walls (true)
  entity.add(new ProjectileComponent(dirX, dirY, 800, 700, grid, true));
  
  entity.setUpdateOrder([
    TransformComponent,
    ProjectileComponent,
    SpriteComponent,
  ]);
  
  return entity;
}
```

### Grenade Entity Example (Flies Over Walls)

```typescript
export function createGrenadeEntity(
  scene: Phaser.Scene,
  x: number,
  y: number,
  dirX: number,
  dirY: number,
  grid: Grid
): Entity {
  const entity = new Entity('grenade');
  
  const rotation = Math.atan2(dirY, dirX);
  const transform = entity.add(new TransformComponent(x, y, rotation, 1));
  const sprite = entity.add(new SpriteComponent(scene, 'grenade', transform));
  sprite.sprite.setDisplaySize(24, 24);
  
  // Grenade flies over walls (false)
  entity.add(new ProjectileComponent(dirX, dirY, 600, 500, grid, false));
  
  entity.setUpdateOrder([
    TransformComponent,
    ProjectileComponent,
    SpriteComponent,
  ]);
  
  return entity;
}
```

### Debug Visualization

Use Grid's debug rendering system for temporary visualizations:

```typescript
// ❌ Bad: Creates permanent sprites
if (debugEnabled) {
  this.add.rectangle(x, y, 20, 20, 0xff0000);  // Leaves trail!
}

// ✅ Good: Uses Grid's frame-based rendering
grid.renderEmitterBox(x, y, 20);  // Cleared each frame
```

**Grid debug methods:**
- `grid.renderCollisionBox(x, y, width, height)` - Blue collision boxes
- `grid.renderEmitterBox(x, y, size)` - Red emitter positions
- Both only render when debug mode is enabled (G key)

## File Organization

### Constants vs Domain-Specific Code

Place shared constants in `src/constants/`:

```
src/
├── constants/
│   └── Direction.ts        # Used by animation, movement, projectiles
├── animation/
│   ├── Animation.ts
│   └── AnimationSystem.ts
├── ecs/
│   └── components/
│       ├── ProjectileComponent.ts
│       └── ProjectileEmitterComponent.ts
└── projectile/
    └── BulletEntity.ts     # Bullet factory function
```

**Why separate constants:**
- `Direction` is used by animation, movement, AI, and projectiles
- Keeping it in `animation/` implies it's animation-specific
- `constants/` makes it clear it's shared across systems
