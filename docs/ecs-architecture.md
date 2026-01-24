# ECS Architecture Guide

This document explains the Entity-Component-System architecture and best practices for creating components.

**Related Docs:**
- [Coding Standards](./coding-standards.md) - TypeScript best practices, modern JavaScript standards
- [Quick Reference](./quick-reference.md) - Common tasks and patterns

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

## Component Design Principles

### 1. Think About Reusability First

**Before creating a component, ask:**
- Could this work for player, enemies, NPCs, turrets?
- What values might vary between different entities?
- Can I make this generic enough to reuse?

**Example: WalkComponent**
```typescript
// ✅ Good: Works for any entity that moves
class WalkComponent {
  constructor(
    private readonly transform: TransformComponent,
    private readonly input: InputComponent,
    props: WalkProps
  ) {
    this.speed = props.speed;
    this.accelerationTime = props.accelerationTime;
  }
}

// Usage:
new WalkComponent(transform, input, { speed: 300 })  // Player
new WalkComponent(transform, input, { speed: 450 })  // Fast enemy
new WalkComponent(transform, input, { speed: 150 })  // Slow tank
```

### 2. Always Use Props for Configuration

**All configurable values must be passed as props - never use defaults.**

**DO ✅**
```typescript
export interface MyComponentProps {
  speed: number;           // Required
  duration: number;        // Required
  cooldown: number;        // Required
}

export class MyComponent implements Component {
  private readonly speed: number;
  private readonly duration: number;
  private readonly cooldown: number;
  
  constructor(
    private readonly dependency: SomeComponent,
    props: MyComponentProps
  ) {
    this.speed = props.speed;
    this.duration = props.duration;
    this.cooldown = props.cooldown;
  }
}

// Usage: Explicit values
new MyComponent(dep, { speed: 300, duration: 1000, cooldown: 2000 })
```

**DON'T ❌**
```typescript
// No defaults - forces explicit configuration
export interface MyComponentProps {
  speed?: number;  // ❌ Optional with default
}

constructor(props: MyComponentProps = {}) {
  this.speed = props.speed ?? 300;  // ❌ Hidden default
}
```

**Why no defaults?**
- Makes configuration explicit and visible
- Prevents confusion about what values are actually used
- Forces you to think about appropriate values per entity
- Easier to see differences between entity types

### 3. Single Responsibility

Each component should do ONE thing:

**DO ✅**
```typescript
// InputComponent - ONLY handles input
class InputComponent {
  getInputDelta(): { dx: number; dy: number }
  isFirePressed(): boolean
}

// WalkComponent - ONLY handles movement physics
class WalkComponent {
  update(delta: number): void  // Movement logic
  isMoving(): boolean
}

// GridCollisionComponent - ONLY handles collision
class GridCollisionComponent {
  update(delta: number): void  // Collision detection
}
```

**DON'T ❌**
```typescript
// Component doing too much
class PlayerComponent {
  handleInput()      // Should be InputComponent
  updateMovement()   // Should be WalkComponent
  updateAnimation()  // Should be AnimationComponent
  checkCollision()   // Should be GridCollisionComponent
}
```

### 4. Decouple Through Callbacks

Make components reusable by accepting callbacks instead of hardcoding behavior:

**DO ✅**
```typescript
// Reusable across player, enemies, turrets
class ProjectileEmitterComponent {
  constructor(props: {
    onFire: (x, y, dirX, dirY) => void,
    shouldFire: () => boolean,  // Callback decides when
    cooldown: number
  }) {}
}

// Player: shouldFire: () => input.isFirePressed()
// Enemy: shouldFire: () => aiComponent.shouldAttack()
// Turret: shouldFire: () => playerInRange && hasLineOfSight
```

**DON'T ❌**
```typescript
// Hardcoded to player input
class ProjectileEmitterComponent {
  constructor(scene: Phaser.Scene) {
    this.fireKey = scene.input.keyboard!.addKey(KeyCodes.SPACE);
  }
}
```

### 5. Minimal Dependencies

Only depend on what you actually need:

**DO ✅**
```typescript
class WalkComponent {
  constructor(
    private readonly transform: TransformComponent,
    private readonly input: InputComponent,
    props: WalkProps
  ) {}
}
```

**DON'T ❌**
```typescript
class WalkComponent {
  constructor(private readonly entity: Entity) {}  // Too broad
  
  update() {
    const transform = this.entity.get(TransformComponent)!;  // Reaches in
    const input = this.entity.get(InputComponent)!;
  }
}
```

### 6. Check for Existing Components First

**Before creating a new component:**
1. Check if an existing component can be extended
2. Check if props can make an existing component work
3. Only create new if truly different behavior needed

**Example:**
```typescript
// Don't create FastWalkComponent, SlowWalkComponent, etc.
// Just use WalkComponent with different props:
new WalkComponent(transform, input, { speed: 450 })  // Fast
new WalkComponent(transform, input, { speed: 150 })  // Slow
```

## Component Template

Use this template when creating new components:

```typescript
import type { Component } from '../Component';
import type { Entity } from '../Entity';

// 1. Define props interface - all required, no defaults
export interface MyComponentProps {
  value1: number;
  value2: number;
  callback?: () => void;  // Only callbacks can be optional
}

// 2. Implement component
export class MyComponent implements Component {
  entity!: Entity;
  private readonly value1: number;
  private readonly value2: number;
  private readonly callback?: () => void;
  
  constructor(
    private readonly dependency: SomeComponent,
    props: MyComponentProps
  ) {
    // Store props as readonly properties
    this.value1 = props.value1;
    this.value2 = props.value2;
    this.callback = props.callback;
  }
  
  update(delta: number): void {
    // Component logic
  }
  
  onDestroy(): void {
    // Cleanup (remove listeners, destroy sprites, etc.)
  }
}
```

## Component Update Order

**Critical**: Components update in the order specified by `setUpdateOrder()`.

**Standard order for moving entities**:
```typescript
entity.setUpdateOrder([
  TransformComponent,      // 1. Base position
  HitFlashComponent,       // 2. Modify sprite tint (before sprite renders)
  SpriteComponent,         // 3. Sync sprite with transform
  InputComponent,          // 4. Read input
  WalkComponent,           // 5. Calculate new position
  GridCollisionComponent,  // 6. Validate and adjust position
  StateMachineComponent,   // 7. Update state based on movement
  AnimationComponent,      // 8. Update animation frames
]);
```

**Why this order matters**:
- HitFlashComponent must update BEFORE SpriteComponent (modifies tint)
- Walk must update before GridCollision (so collision sees new position)
- GridCollision must update before StateMachine (so states see final position)
- StateMachine must update before Animation (so animation changes apply)

## Entity Design

### One Component Type Per Entity

**DO ✅**
```typescript
entity.add(new HealthComponent());
entity.add(new AmmoComponent());  // Different types - OK
```

**DON'T ❌**
```typescript
entity.add(new HudBarComponent(health));
entity.add(new HudBarComponent(ammo));  // ERROR: Duplicate type
```

**Solution**: Design components to handle multiple instances internally:
```typescript
entity.add(new HudBarComponent(scene, [
  { dataSource: health, offsetY: 70, fillColor: 0x00ff00 },
  { dataSource: ammo, offsetY: 90, fillColor: 0x0000ff },
]));
```

### Class-Based Update Order

**DO ✅**
```typescript
entity.setUpdateOrder([
  TransformComponent,
  SpriteComponent,
  InputComponent,
]);
```

**DON'T ❌**
```typescript
// Don't use instances
entity.setUpdateOrder([
  transform,
  sprite,
  input,
]);
```

## Creating New Entities

Use factory functions to create entities:

```typescript
export function createEnemyEntity(
  scene: Phaser.Scene,
  x: number,
  y: number,
  grid: Grid
): Entity {
  const entity = new Entity('enemy');
  
  // Add components with explicit props
  const transform = entity.add(new TransformComponent(x, y, 0, 2));
  const sprite = entity.add(new SpriteComponent(scene, 'enemy', transform));
  entity.add(new WalkComponent(transform, input, {
    speed: 200,
    accelerationTime: 400,
    stopThreshold: 50
  }));
  
  // Set update order
  entity.setUpdateOrder([
    TransformComponent,
    SpriteComponent,
    WalkComponent,
  ]);
  
  return entity;
}
```

## Entity Manager

**All entities are managed by a single EntityManager:**

```typescript
class EntityManager {
  add(entity: Entity): Entity
  update(delta: number): void
  getByType(type: string): Entity[]
  getFirst(type: string): Entity | undefined
  destroyAll(): void
  get count(): number
}
```

**Usage:**
```typescript
// In GameScene
private entityManager!: EntityManager;

async create() {
  this.entityManager = new EntityManager();
  
  const player = this.entityManager.add(createPlayerEntity(...));
  const enemy = this.entityManager.add(createEnemyEntity(...));
}

update(delta: number) {
  this.entityManager.update(delta);  // Updates all entities
}
```

## Key Takeaways

1. **Reusability first** - Think about how component can work for multiple entity types
2. **No defaults** - All props required, explicit configuration
3. **Single responsibility** - One component, one job
4. **Decouple with callbacks** - Make components generic
5. **Minimal dependencies** - Only depend on what you need
6. **Check existing first** - Extend before creating new
7. **Update order matters** - Control component execution sequence
8. **One type per entity** - Enforced at runtime
