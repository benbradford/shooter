# Coding Standards

## ⚠️ MANDATORY: Build and Lint After Every Change ⚠️

**Run these commands after EVERY code modification:**

```bash
npm run build                # MUST pass with zero errors
npx eslint src --ext .ts     # MUST pass with zero errors
```

**No exceptions. Every code change must build and lint successfully before considering work complete.**

*Note: `npm run dev` is optional if you already have the dev server running in another terminal.*

---

## TypeScript Standards

### Imports

**DO ✅**
```typescript
// Use relative paths based on file location
import type { Component } from '../Component';  // In components/ folder
import type { Entity } from '../Entity';

// Use 'import type' for type-only imports
import type { IState } from '../utils/state/IState';

// Use 'export type' when re-exporting interfaces
export type { Component } from './Component';
```

**DON'T ❌**
```typescript
// Wrong relative path
import type { Component } from './Component';  // In components/ folder

// Missing 'type' keyword
import { Component } from '../Component';

// Re-exporting without 'type'
export { Component } from './Component';
```

### Readonly Properties

**DO ✅**
```typescript
// Mark properties readonly if never reassigned
class MyComponent {
  constructor(
    private readonly grid: Grid,
    private readonly transform: TransformComponent
  ) {}
}

// Mutable state is fine
class MyComponent {
  private currentHealth: number = 100;  // Changes during gameplay
}
```

**DON'T ❌**
```typescript
// Readonly on reassigned property
class MyComponent {
  private readonly occupiedCells: Set<string> = new Set();
  
  update() {
    this.occupiedCells = new Set();  // ERROR: Can't reassign readonly
  }
}

// Not using readonly for immutable references
class MyComponent {
  constructor(private grid: Grid) {}  // Should be readonly
}
```

### Unused Parameters

**DO ✅**
```typescript
// Prefix unused parameters with underscore
update(_delta: number): void {
  // delta not used
}
```

### Type Safety

**DO ✅**
```typescript
// Specific types
private readonly keys: Record<string, Phaser.Input.Keyboard.Key>;

// Constructor types
get<T extends Component>(componentClass: new (...args: never[]) => T): T | undefined

// Optional chaining
scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.G);

// Non-null assertion when guaranteed
const transform = this.entity.get(TransformComponent)!;
```

**DON'T ❌**
```typescript
// Never use 'any'
private keys: any;
get<T>(componentClass: new (...args: any[]) => T): T

// Untyped objects
private keys: { [key: string]: any };
```

### Duplicate Declarations

**DON'T ❌**
```typescript
// Declaring property twice
class Grid {
  private scene: Phaser.Scene;
  
  constructor(private scene: Phaser.Scene) {}  // Duplicate!
}
```

**DO ✅**
```typescript
// Use parameter property OR separate declaration
class Grid {
  constructor(private readonly scene: Phaser.Scene) {}
}
```

## Component Design Principles

### Single Responsibility

Each component should do ONE thing:

**DO ✅**
```typescript
// InputComponent - ONLY handles input
class InputComponent {
  getInputDelta(): { dx: number; dy: number }
  getRawInputDelta(): { dx: number; dy: number }
  isFirePressed(): boolean
}

// WalkComponent - ONLY handles movement physics
class WalkComponent {
  update(delta: number): void  // Movement logic
  isMoving(): boolean
  getVelocityMagnitude(): number
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

### Decoupling Through Callbacks

**DO ✅**
```typescript
// Reusable across player, enemies, turrets
class ProjectileEmitterComponent {
  constructor(
    private readonly onFire: (x: number, y: number, dirX: number, dirY: number) => void,
    private readonly shouldFire: () => boolean,  // Callback decides when
    private readonly cooldown: number
  ) {}
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

### Minimal Dependencies

**DO ✅**
```typescript
// Component only depends on what it needs
class WalkComponent {
  constructor(
    private readonly transformComp: TransformComponent,
    private readonly inputComp: InputComponent
  ) {}
}
```

**DON'T ❌**
```typescript
// Component depends on entire entity or scene
class WalkComponent {
  constructor(private readonly entity: Entity) {}
  
  update() {
    // Reaches into entity to get everything
    const transform = this.entity.get(TransformComponent)!;
    const input = this.entity.get(InputComponent)!;
  }
}
```

## Entity Design

### One Component Type Per Entity

**DO ✅**
```typescript
// Entity enforces this at runtime
entity.add(new HealthComponent());
entity.add(new AmmoComponent());  // Different types - OK
```

**DON'T ❌**
```typescript
// This will throw an error
entity.add(new HudBarComponent(health));
entity.add(new HudBarComponent(ammo));  // ERROR: Duplicate type
```

**Solution**: Design components to handle multiple instances internally:
```typescript
// Single component handles multiple bars
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
  WalkComponent,
  GridCollisionComponent,
  StateMachineComponent,
  AnimationComponent,
]);
```

**DON'T ❌**
```typescript
// Don't use instances
entity.setUpdateOrder([
  transform,
  sprite,
  input,
  // ...
]);
```

## File Organization

### Constants vs Domain Code

**DO ✅**
```
src/
├── constants/
│   └── Direction.ts        # Shared across systems
├── animation/
│   ├── Animation.ts
│   └── AnimationSystem.ts
├── ecs/
│   └── components/
└── player/
```

**DON'T ❌**
```
src/
├── animation/
│   ├── Direction.ts        # Implies animation-specific
│   ├── Animation.ts
│   └── AnimationSystem.ts
```

## Asset Management

### Register All Assets

**DO ✅**
```typescript
// In AssetRegistry.ts
export const ASSET_REGISTRY = {
  crosshair: {
    key: 'crosshair',
    path: 'assets/player/crosshair.png',
    type: 'image' as const,
  },
} as const;

// In AssetLoader.ts
const keysToLoad: AssetKey[] = keys || ['player', 'bullet_default', 'crosshair'];
```

**DON'T ❌**
```typescript
// Loading assets directly in scene
this.load.image('crosshair', 'assets/player/crosshair.png');  // Not centralized
```

## Common Patterns

### Private Helper Methods

**DO ✅**
```typescript
class WalkComponent {
  update(delta: number): void {
    const movementInput = this.inputComp.getInputDelta();
    const facingInput = this.inputComp.getRawInputDelta();
    
    if (facingInput.dx !== 0 || facingInput.dy !== 0) {
      this.updateFacingDirection(facingInput.dx, facingInput.dy);
    }
    
    const targetVelocity = this.calculateTargetVelocity(movementInput.dx, movementInput.dy);
    this.applyMomentum(targetVelocity, delta);
    this.applyStopThreshold();
  }

  private updateFacingDirection(dx: number, dy: number): void { /* ... */ }
  private calculateTargetVelocity(dx: number, dy: number): { x: number; y: number } { /* ... */ }
  private applyMomentum(target: { x: number; y: number }, delta: number): void { /* ... */ }
  private applyStopThreshold(): void { /* ... */ }
}
```

**Benefits:**
- Clear intent from method names
- Single responsibility per method
- Easy to test and debug
- Self-documenting code

### Named Constants

**DO ✅**
```typescript
class WalkComponent {
  private readonly accelerationTime = 300; // ms to reach full speed
  private readonly stopThreshold = 50;     // velocity below this snaps to zero
}
```

**DON'T ❌**
```typescript
// Magic numbers
if (velocityMagnitude < 50) {  // What does 50 mean?
  this.velocityX = 0;
}
```

## ESLint Configuration

Key rules enforced:
- `@typescript-eslint/no-unused-vars`: Allows `_` prefix for unused parameters
- `@typescript-eslint/no-explicit-any`: Disallows `any` type
- `@typescript-eslint/prefer-readonly`: Suggests readonly for immutable properties

## Summary

1. **Always build and lint** after every change
2. **Single responsibility** - one component, one job
3. **Decouple through callbacks** - make components reusable
4. **Minimal dependencies** - only depend on what you need
5. **Type safety** - never use `any`, use specific types
6. **Named constants** - no magic numbers
7. **Private helpers** - break complex methods into focused functions
8. **One component type per entity** - enforced at runtime
