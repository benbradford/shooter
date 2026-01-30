---
name: Component Builder
description: Expert in creating and refactoring ECS components for the Dodging Bullets game. Specializes in props-based design, minimal code, and proper component organization.
---

# Component Builder Skill

## Core Principles

### 1. Props-Based Configuration
**All components use props objects - NO defaults in constructors.**

```typescript
// Define props interface - all required
export interface MyComponentProps {
  speedPxPerSec: number;
  durationMs: number;
  cooldownMs: number;
}

export class MyComponent implements Component {
  entity!: Entity;
  private readonly speedPxPerSec: number;
  private readonly durationMs: number;
  private readonly cooldownMs: number;
  
  constructor(
    private readonly dependency: SomeComponent,
    props: MyComponentProps
  ) {
    this.speedPxPerSec = props.speedPxPerSec;
    this.durationMs = props.durationMs;
    this.cooldownMs = props.cooldownMs;
  }
  
  init?(): void {
    // Optional: Create Phaser objects after entity is set
  }
  
  update?(delta: number): void {
    // Optional: Per-frame logic
  }
  
  onDestroy?(): void {
    // Optional: Cleanup
  }
}
```

### 2. No Magic Numbers
**Every number must be a named constant with units.**

```typescript
// Constants at top of file
const FLASH_DURATION_MS = 500;
const KNOCKBACK_FORCE_PX = 300;
const ATTACK_RANGE_PX = 200;
const COOLDOWN_MS = 1000;

// Use in code
this.flashDurationMs = props.flashDurationMs ?? FLASH_DURATION_MS;
```

**Unit suffixes:**
- `_MS` - milliseconds
- `_PX` - pixels
- `_PX_PER_SEC` - pixels per second
- `_PERCENT` - percentage (0-100)
- `_DEGREES` - degrees
- `_RAD` - radians
- `_CELLS` - grid cells

### 3. Minimal Code
- Write absolute minimum needed
- No verbose implementations
- No redundant comments
- Single responsibility per component

### 4. Component Organization (7 folders)

```
src/ecs/components/
├── core/        - TransformComponent, SpriteComponent, AnimationComponent, HealthComponent
├── movement/    - WalkComponent, GridCollisionComponent, GridPositionComponent
├── input/       - InputComponent, TouchJoystickComponent, AimJoystickComponent
├── combat/      - ProjectileComponent, CollisionComponent, DamageComponent, AmmoComponent
├── ai/          - PatrolComponent, LineOfSightComponent, DifficultyComponent
├── visual/      - HitFlashComponent, ParticleTrailComponent, ShadowComponent
└── ui/          - HudBarComponent, JoystickVisualsComponent
```

## Component Templates

### Data-Only Component
```typescript
import type { Component } from '../../Component';
import type { Entity } from '../../Entity';

export class DifficultyComponent<T extends string> implements Component {
  entity!: Entity;
  constructor(public difficulty: T) {}
}
```

### Logic Component
```typescript
import type { Component } from '../../Component';
import type { Entity } from '../../Entity';

export interface MyComponentProps {
  valuePx: number;
  durationMs: number;
}

export class MyComponent implements Component {
  entity!: Entity;
  private readonly valuePx: number;
  private readonly durationMs: number;
  private elapsedMs: number = 0;
  
  constructor(props: MyComponentProps) {
    this.valuePx = props.valuePx;
    this.durationMs = props.durationMs;
  }
  
  update(delta: number): void {
    this.elapsedMs += delta;
    if (this.elapsedMs >= this.durationMs) {
      // Logic here
    }
  }
  
  onDestroy(): void {
    // Cleanup
  }
}
```

### Visual Component (with init)
```typescript
import type { Component } from '../../Component';
import type { Entity } from '../../Entity';

export interface MyVisualComponentProps {
  scale: number;
  offsetXPx: number;
  offsetYPx: number;
}

export class MyVisualComponent implements Component {
  entity!: Entity;
  private sprite!: Phaser.GameObjects.Sprite;
  private readonly scale: number;
  private readonly offsetXPx: number;
  private readonly offsetYPx: number;
  
  constructor(
    private readonly scene: Phaser.Scene,
    props: MyVisualComponentProps
  ) {
    this.scale = props.scale;
    this.offsetXPx = props.offsetXPx;
    this.offsetYPx = props.offsetYPx;
  }
  
  init(): void {
    // Create Phaser objects after entity is set
    this.sprite = this.scene.add.sprite(0, 0, 'texture');
    this.sprite.setScale(this.scale);
    this.sprite.setScrollFactor(0);
    this.sprite.setDepth(2000);
  }
  
  update(_delta: number): void {
    const transform = this.entity.require(TransformComponent);
    this.sprite.setPosition(
      transform.x + this.offsetXPx,
      transform.y + this.offsetYPx
    );
  }
  
  onDestroy(): void {
    this.sprite.destroy();
  }
}
```

## Update Order Rules

Components update in the order specified by `entity.setUpdateOrder()`.

**Standard order for moving entities:**
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

**Why order matters:**
- HitFlashComponent BEFORE SpriteComponent (modifies tint)
- Walk BEFORE GridCollision (collision sees new position)
- GridCollision BEFORE StateMachine (states see final position)
- StateMachine BEFORE Animation (animation changes apply)

## Common Patterns

### Dependencies and Initialization Order

**Critical:** When a component depends on a Phaser game object (sprite, image, particle emitter), ensure the object exists before the entity is created.

**Problem Pattern:**
```typescript
// GameScene.ts
private initializeScene(): void {
  this.spawnEntities();  // Player created here
  
  // Vignette created AFTER player
  this.vignette = this.add.image(...);
}

// PlayerEntity.ts
if (vignette) {  // vignette is undefined!
  entity.add(new VignetteHealthComponent({ vignette, health }));
}
```

**Solution Pattern:**
```typescript
// GameScene.ts
private initializeScene(): void {
  // Create game objects FIRST
  this.vignette = this.add.image(...);
  this.vignette.setScrollFactor(0);
  this.vignette.setDepth(10000);
  
  // Then spawn entities that depend on them
  this.spawnEntities();
}

// PlayerEntity.ts
if (vignette) {  // vignette exists!
  entity.add(new VignetteHealthComponent({ vignette, health }));
}
```

**Rule:** Game objects must be created before entities that reference them.

**Common dependencies:**
- Vignette overlays (created in scene, passed to player)
- Particle emitters (created in scene, passed to components)
- UI elements (created in HUD scene, passed to game entities)
- Shared sprites (created once, referenced by multiple entities)

### Accessing Other Components
```typescript
// Required component (throws if missing)
const transform = this.entity.require(TransformComponent);

// Optional component (returns undefined if missing)
const knockback = this.entity.get(KnockbackComponent);
if (knockback) {
  knockback.apply(dirX, dirY);
}
```

### Two-Phase Initialization
```typescript
// In entity factory
const component = entity.add(new MyComponent(scene, props));
component.init(); // Must call after add()
```

### Conditional Components and Update Order

**Problem:** Component is conditionally added but always in update order.

```typescript
// ❌ WRONG
if (vignette) {
  entity.add(new VignetteHealthComponent({ vignette, health }));
}

entity.setUpdateOrder([
  TransformComponent,
  HealthComponent,
  VignetteHealthComponent,  // Error if not added!
  AmmoComponent,
]);
```

**Solution:** Build update order dynamically.

```typescript
// ✅ CORRECT
if (vignette) {
  entity.add(new VignetteHealthComponent({ vignette, health }));
}

const updateOrder: Array<new (...args: never[]) => Component> = [
  TransformComponent,
  HealthComponent,
];

if (vignette) {
  updateOrder.push(VignetteHealthComponent);
}

updateOrder.push(AmmoComponent);

entity.setUpdateOrder(updateOrder);
```

**Type annotation required:** `Array<new (...args: never[]) => Component>`

### Callback-Based Decoupling
```typescript
export interface ProjectileEmitterProps {
  onFire: (x: number, y: number, dirX: number, dirY: number) => void;
  shouldFire: () => boolean;
  cooldownMs: number;
}

// Reusable across player, enemies, turrets
// Player: shouldFire: () => input.isFirePressed()
// Enemy: shouldFire: () => ai.shouldAttack()
```

## Anti-Patterns to Avoid

❌ Default parameter values
❌ Magic numbers without constants
❌ Redundant comments
❌ Long parameter lists (use props)
❌ Hardcoded behavior (use callbacks)
❌ Multiple responsibilities in one component
❌ Reaching into entity to get components in constructor

## Checklist

- [ ] Props interface defined with all required fields
- [ ] All numbers are named constants with units
- [ ] No defaults in constructor
- [ ] Component in correct folder (core/movement/input/combat/ai/visual/ui)
- [ ] **If component depends on Phaser objects, ensure they're created before entity spawn**
- [ ] Exported from `src/ecs/index.ts`
- [ ] Update order specified if component has update()
- [ ] **If component is conditionally added, update order must handle it (use array.push)**
- [ ] init() called after add() if needed
- [ ] onDestroy() cleans up resources
- [ ] Build passes: `npm run build`
- [ ] Lint passes: `npx eslint src --ext .ts`

## Export Pattern

After creating component, add to `src/ecs/index.ts`:

```typescript
export { MyComponent } from './components/category/MyComponent';
export type { MyComponentProps } from './components/category/MyComponent';
```
