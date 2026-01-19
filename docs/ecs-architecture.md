# ECS Architecture Guide

This document explains the Entity-Component-System architecture and how to create new entities.

**Related Docs:**
- [Coding Standards](./coding-standards.md) - TypeScript and component design principles
- [Quick Reference](./quick-reference.md) - Common tasks and patterns
- [Input Systems](./input-systems.md) - Joystick and keyboard controls

---

## Core Concepts

### Entity-Component System (ECS)

- **Entity**: A container with an ID that holds components
- **Component**: Reusable logic/data modules that define behavior
- **Update Order**: Components update in a specific order defined per entity

### Why ECS?

- **Composition over inheritance**: Build entities from components
- **Reusability**: Components work across different entity types
- **Flexibility**: Add/remove behavior by adding/removing components
- **Clear dependencies**: Components declare what they need

## Component Library

### Core Components

**TransformComponent** - Position, rotation, scale
```typescript
new TransformComponent(x, y, rotation, scale)
```

**SpriteComponent** - Visual representation
```typescript
new SpriteComponent(scene, texture, transformComponent)
```

**AnimationComponent** - Animation system integration
```typescript
new AnimationComponent(animationSystem, spriteComponent)
```

### Movement Components

**InputComponent** - Keyboard and joystick input
```typescript
new InputComponent(scene)
// Methods: getInputDelta(), getRawInputDelta(), isFirePressed()
```

**WalkComponent** - Movement physics with momentum
```typescript
new WalkComponent(transformComponent, inputComponent)  // Defaults
new WalkComponent(transformComponent, inputComponent, { speed: 400, accelerationTime: 200 })  // Custom
// Props: speed, accelerationTime, stopThreshold
// Properties: lastDir, lastMoveX, lastMoveY
// Methods: isMoving(), getVelocityMagnitude()
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

### Gameplay Systems

**AmmoComponent** - Ammo tracking with overheat
```typescript
new AmmoComponent()  // Defaults: 20 ammo, 10/s refill, 2s delay
new AmmoComponent({ maxAmmo: 30, refillRate: 15 })  // Custom
// Props: maxAmmo, refillRate, refillDelay
// Methods: canFire(), consumeAmmo(), isGunOverheated()
```

**OverheatSmokeComponent** - Visual feedback for overheated weapon
```typescript
new OverheatSmokeComponent(scene, ammoComponent, emitterOffsets)
// Requires init() call after add()
// Emits smoke particles when ammo reaches 0
// Stops when fully refilled
```

**HealthComponent** - Health tracking
```typescript
new HealthComponent()  // Default: 100 health
new HealthComponent({ maxHealth: 200 })  // Boss with 200 health
// Props: maxHealth
// Implements HudBarDataSource for health bar display
```

**HudBarComponent** - Visual health/ammo bars
```typescript
new HudBarComponent(scene, [
  { dataSource: health, offsetY: 70, fillColor: 0x00ff00 },
  { dataSource: ammo, offsetY: 90, fillColor: 0x0000ff },
])
// Requires init() call after add()
// Supports multiple bars in one component
```

## Component Update Order

**Critical**: Components update in the order specified by `setUpdateOrder()`.

**Standard order for moving entities**:
```typescript
entity.setUpdateOrder([
  TransformComponent,      // 1. Base position
  SpriteComponent,         // 2. Sync sprite with transform
  InputComponent,          // 3. Read input
  WalkComponent,           // 4. Calculate new position
  GridCollisionComponent,  // 5. Validate and adjust position
  StateMachineComponent,   // 6. Update state based on movement
  AnimationComponent,      // 7. Update animation frames
]);
```

**Why this order matters**:
- Walk must update before GridCollision (so collision sees new position)
- GridCollision must update before StateMachine (so states see final position)
- StateMachine must update before Animation (so animation changes apply)

## Creating New Components

### Props-Based Design Pattern

**When creating a new component, always think: "What might vary between different entities?"**

Those values should be passed as props, not hardcoded.

**Example: Creating a DashComponent**

```typescript
// 1. Define props interface with optional values
export interface DashProps {
  dashSpeed?: number;
  dashDuration?: number;
  dashCooldown?: number;
  dashDistance?: number;
}

// 2. Use props in constructor with defaults
export class DashComponent implements Component {
  entity!: Entity;
  private readonly dashSpeed: number;
  private readonly dashDuration: number;
  private readonly dashCooldown: number;
  private readonly dashDistance: number;
  private isDashing: boolean = false;
  private cooldownRemaining: number = 0;

  constructor(
    private readonly transformComp: TransformComponent,
    private readonly inputComp: InputComponent,
    props: DashProps = {}
  ) {
    // Apply defaults using nullish coalescing
    this.dashSpeed = props.dashSpeed ?? 800;
    this.dashDuration = props.dashDuration ?? 200;
    this.dashCooldown = props.dashCooldown ?? 1000;
    this.dashDistance = props.dashDistance ?? 150;
  }

  update(delta: number): void {
    // Component logic...
  }

  onDestroy(): void {}
}

// 3. Usage: Easy to customize per entity
new DashComponent(transform, input)  // Player with defaults
new DashComponent(transform, input, { dashSpeed: 1200, dashDistance: 250 })  // Fast enemy
new DashComponent(transform, input, { dashCooldown: 500 })  // Frequent dasher
```

**Guidelines:**
- All configurable values should be in props
- All props should be optional with sensible defaults
- Required dependencies (other components, scene) go as regular parameters
- Use `readonly` for props that don't change after construction

## Creating New Entities

### Example: Bullet (Simple Projectile)

**Requirements**:
- Moves in a straight line
- Destroyed on wall collision
- Doesn't occupy grid cells

**Implementation**:
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
  
  const rotation = Math.atan2(dirY, dirX) + Math.PI / 2;
  const transform = entity.add(new TransformComponent(x, y, rotation, 1));
  const sprite = entity.add(new SpriteComponent(scene, 'bullet_default', transform));
  sprite.sprite.setDisplaySize(16, 16);
  
  entity.add(new ProjectileComponent({
    dirX,
    dirY,
    speed: 800,
    maxDistance: 700,
    grid,
    blockedByWalls: true
  }));
  
  entity.setUpdateOrder([
    TransformComponent,
    ProjectileComponent,
    SpriteComponent,
  ]);
  
  return entity;
}
```

### Example: Player (Complex Character)

**Requirements**:
- Keyboard and joystick input
- Movement with momentum
- Collision with walls
- Animations (idle, walk)
- Shooting
- Health and ammo

**Implementation**:
```typescript
export function createPlayerEntity(
  scene: Phaser.Scene,
  x: number,
  y: number,
  grid: Grid,
  onFire: (x, y, dirX, dirY) => void,
  onShellEject: (x, y, dir, playerDir) => void,
  joystick: Entity
): Entity {
  const entity = new Entity('player');

  // Core components
  const transform = entity.add(new TransformComponent(x, y, 0, 2));
  const sprite = entity.add(new SpriteComponent(scene, 'player', transform));
  
  // Animation system
  const animMap = createPlayerAnimations();
  const animSystem = new AnimationSystem(animMap, `idle_${Direction.Down}`);
  entity.add(new AnimationComponent(animSystem, sprite));

  // Input
  const input = entity.add(new InputComponent(scene));
  const joystickComp = joystick.get(TouchJoystickComponent)!;
  input.setJoystick(joystickComp);

  // Movement
  entity.add(new WalkComponent(transform, input));

  // Grid integration
  const startCell = grid.worldToCell(x, y);
  entity.add(new GridPositionComponent(
    startCell.col,
    startCell.row,
    { offsetX: 0, offsetY: 32, width: 36, height: 32 }
  ));
  entity.add(new GridCollisionComponent(grid));

  // Systems
  const health = entity.add(new HealthComponent());
  const ammo = entity.add(new AmmoComponent());
  
  entity.add(new HudBarComponent(scene, [
    { dataSource: health, offsetY: 70, fillColor: 0x00ff00 },
    { dataSource: ammo, offsetY: 90, fillColor: 0x0000ff },
  ]));

  // Shooting
  entity.add(new ProjectileEmitterComponent(
    scene,
    onFire,
    emitterOffsets,
    () => input.isFirePressed(),
    200,
    onShellEject,
    ammo
  ));

  // State machine
  const stateMachine = new StateMachine({
    idle: new PlayerIdleState(entity),
    walk: new PlayerWalkState(entity),
  }, 'idle');
  entity.add(new StateMachineComponent(stateMachine));

  // Update order
  entity.setUpdateOrder([
    TransformComponent,
    SpriteComponent,
    InputComponent,
    WalkComponent,
    GridCollisionComponent,
    HealthComponent,
    AmmoComponent,
    ProjectileEmitterComponent,
    OverheatSmokeComponent,
    HudBarComponent,
    StateMachineComponent,
    AnimationComponent,
  ]);

  grid.addOccupant(startCell.col, startCell.row, entity);
  return entity;
}
```

### Example: Static Decoration

**Requirements**:
- Doesn't move
- Doesn't collide
- Just visual

**Implementation**:
```typescript
export function createDecorationEntity(scene: Phaser.Scene, x: number, y: number): Entity {
  const entity = new Entity('decoration');
  
  const transform = entity.add(new TransformComponent(x, y, 0, 1));
  entity.add(new SpriteComponent(scene, 'tree', transform));
  
  entity.setUpdateOrder([
    TransformComponent,
    SpriteComponent,
  ]);
  
  return entity;
}
```

## Grid Integration

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
- Visual effects (shell casings, smoke)

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

## Entity Lifecycle

1. **Create**: Call factory function (e.g., `createPlayerEntity()`)
2. **Add to EntityManager**: `entityManager.add(entity)`
3. **Update**: EntityManager calls `entity.update(delta)` each frame
4. **Destroy**: Call `entity.destroy()` or let it self-destruct
   - Removes sprites
   - Removes from grid occupancy
   - Calls `onDestroy()` on all components
   - Automatically filtered out by EntityManager on next update

## Entity Manager

**All entities are managed by a single EntityManager.** This replaces the old pattern of tracking entities in separate arrays.

### EntityManager API

```typescript
class EntityManager {
  // Add an entity
  add(entity: Entity): Entity
  
  // Update all entities (call once per frame)
  update(delta: number): void
  
  // Query entities by type
  getByType(type: string): Entity[]
  getFirst(type: string): Entity | undefined
  
  // Destroy all entities
  destroyAll(): void
  
  // Get total count
  get count(): number
}
```

### Usage in GameScene

```typescript
export default class GameScene extends Phaser.Scene {
  private entityManager!: EntityManager;
  
  async create() {
    this.entityManager = new EntityManager();
    
    // Add entities
    const joystick = this.entityManager.add(createJoystickEntity(this));
    const player = this.entityManager.add(createPlayerEntity(this, x, y, grid, ...));
    
    // Bullets/shells added in callbacks
    onFire: (x, y, dirX, dirY) => {
      const bullet = createBulletEntity(this, x, y, dirX, dirY, grid);
      this.entityManager.add(bullet);
    }
  }
  
  update(delta: number) {
    // Update all entities at once
    this.entityManager.update(delta);
  }
}
```

### How It Works

1. **Update loop**: Iterates through all entities and calls `entity.update(delta)`
2. **Automatic cleanup**: After updating, filters out any entities marked as destroyed
3. **Mid-update additions**: Entities added during the update cycle (like bullets) are preserved

**Important:** The update loop is split into two phases:
```typescript
// Phase 1: Update all entities
for (let i = 0; i < this.entities.length; i++) {
  entity.update(delta);  // Bullets can be added here
}

// Phase 2: Remove destroyed entities
this.entities = this.entities.filter(entity => !entity.isDestroyed);
```

This ensures entities added mid-update (like bullets fired during player update) are not lost.

### Benefits

- **Single source of truth**: All entities in one place
- **No manual tracking**: No separate arrays for bullets, shells, enemies, etc.
- **Automatic cleanup**: Destroyed entities removed automatically
- **Easy queries**: Find entities by type with `getByType()` or `getFirst()`
- **Scalable**: Add new entity types without modifying GameScene

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
├── projectile/
│   ├── BulletEntity.ts
│   └── ShellCasingEntity.ts
└── GameScene.ts
```

## Key Takeaways

- **Composition over inheritance**: Build entities from components
- **Update order matters**: Control component execution sequence
- **Grid integration is optional**: Only for entities that need collision
- **One component type per entity**: Enforced at runtime
- **Class-based update order**: More maintainable than instance references
- **Factory functions**: Create entities with `createXEntity()` pattern
- **Clean up properly**: Call `entity.destroy()` to remove from grid and scene
