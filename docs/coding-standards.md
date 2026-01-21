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

## Modern JavaScript Standards

### Use Modern Math APIs

**DO ✅**
```typescript
// Use Math.hypot for distance calculations
const distance = Math.hypot(dx, dy);

// Use Math.log10 for base-10 logarithms
const result = Math.log10(x);
```

**DON'T ❌**
```typescript
// Don't use manual calculations
const distance = Math.sqrt(dx * dx + dy * dy);

// Don't use legacy logarithm expressions
const result = Math.log(x) / Math.LN10;
```

### Use Number Static Methods

**DO ✅**
```typescript
const num = Number.parseInt('42', 10);
const float = Number.parseFloat('3.14');
if (Number.isNaN(value)) { /* ... */ }
if (Number.isFinite(value)) { /* ... */ }
```

**DON'T ❌**
```typescript
const num = parseInt('42', 10);
const float = parseFloat('3.14');
if (isNaN(value)) { /* ... */ }  // Coerces types unexpectedly
if (isFinite(value)) { /* ... */ }
```

### Clean Number Literals

**DO ✅**
```typescript
const scale = 1;
const speed = 300;
```

**DON'T ❌**
```typescript
const scale = 1.0;  // Unnecessary decimal
const speed = 300.;  // Trailing decimal point
```

### Avoid Negated Conditions with Else

**DO ✅**
```typescript
if (isValid) {
  processData();
} else {
  handleError();
}
```

**DON'T ❌**
```typescript
if (!isValid) {  // Harder to read
  handleError();
} else {
  processData();
}
```

### Use for-of for Iterables

**DO ✅**
```typescript
for (const entity of entities) {
  entity.update(delta);
}
```

**DON'T ❌**
```typescript
for (let i = 0; i < entities.length; i++) {
  entities[i].update(delta);
}
```

**Exception:** Use traditional for loop when you need the index or are modifying the array during iteration.

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

### Props-Based Configuration

**ALWAYS use props objects for component configuration.** Think about what might vary between different entities and pass those values as props.

**DO ✅**
```typescript
// Define props interface
export interface WalkProps {
  speed?: number;
  accelerationTime?: number;
  stopThreshold?: number;
}

// Use props in constructor
export class WalkComponent implements Component {
  private readonly speed: number;
  private readonly accelerationTime: number;
  private readonly stopThreshold: number;

  constructor(
    private readonly transformComp: TransformComponent,
    private readonly inputComp: InputComponent,
    props: WalkProps = {}
  ) {
    this.speed = props.speed ?? 300;
    this.accelerationTime = props.accelerationTime ?? 300;
    this.stopThreshold = props.stopThreshold ?? 50;
  }
}

// Usage: Easy to customize per entity
new WalkComponent(transform, input)  // Player with defaults
new WalkComponent(transform, input, { speed: 450 })  // Fast enemy
new WalkComponent(transform, input, { speed: 150, accelerationTime: 500 })  // Slow tank
```

**DON'T ❌**
```typescript
// Hardcoded values - not reusable
class WalkComponent {
  private readonly speed = 300;  // Can't change for different entities
  private readonly accelerationTime = 300;
}

// Long parameter lists - hard to read
constructor(
  transform: TransformComponent,
  input: InputComponent,
  speed: number = 300,
  accelerationTime: number = 300,
  stopThreshold: number = 50,
  friction: number = 0.8,
  maxVelocity: number = 500
) {}  // What does each number mean?
```

**Benefits:**
- Named parameters (self-documenting)
- Easy to add new options without breaking existing code
- Same component works for player, enemies, NPCs
- Clear what each value represents

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

### Avoiding Duplicate Configuration

**DON'T ❌**
```typescript
// Duplicate values in different components
class TouchJoystickComponent {
  private readonly maxRadius = 70;
}

class JoystickVisualsComponent {
  private readonly outerRadius = 100;  // Different value!
}
```

**DO ✅**
```typescript
// Single source of truth
class TouchJoystickComponent {
  public readonly maxRadius = 70;      // Owner of the value
  public readonly innerRadius = 30;
}

class JoystickVisualsComponent {
  constructor(private readonly joystick: TouchJoystickComponent) {}
  
  init(): void {
    this.outerCircle = this.scene.add.circle(0, 0, this.joystick.maxRadius);
    this.innerCircle = this.scene.add.circle(0, 0, this.joystick.innerRadius);
  }
}
```

**Why this matters:**
- Configuration stays in sync
- Clear ownership of values
- Single place to update
- No confusion about which value is correct

### Shared UI Patterns in Editor

**DO ✅**
```typescript
// In EditorState base class
protected createBackButton(): Phaser.GameObjects.Text {
  const height = this.scene.cameras.main.height;
  const backButton = this.scene.add.text(100, height - 50, 'Back', {
    fontSize: '24px',
    color: '#ffffff',
    backgroundColor: '#333333',
    padding: { x: 20, y: 10 }
  });
  // ... setup interactions
  return backButton;
}

// In GridEditorState, MoveEditorState, ResizeEditorState
onEnter(): void {
  this.backButton = this.createBackButton();  // Consistent position and style
  // ... other UI
}
```

**Benefits:**
- Consistent positioning (lower-left corner)
- Consistent styling
- Single place to update
- Less code duplication

### Components with init() Methods

Some components need initialization after being added to an entity:

**Pattern:**
```typescript
// In entity factory function
const hudBars = entity.add(new HudBarComponent(scene, configs));
hudBars.init();  // Must call init() after add()

const overheatSmoke = entity.add(new OverheatSmokeComponent(scene, ammo, offsets));
overheatSmoke.init();  // Must call init() after add()
```

**Why init() is needed:**
- Component needs access to `this.entity` (set by `add()`)
- Component creates Phaser game objects that need scene reference
- Separation of construction from initialization

**When to use init():**
- Creating Phaser sprites, particles, or graphics
- Setting up event listeners
- Accessing other components on the entity

### Circular Hit Detection

For touch/click areas, use circular collision for natural feel:

```typescript
// Set bounds
const radius = (this.sprite.width / 2) * this.scale;
this.joystick.setCrosshairBounds(x, y, radius);

// Check if touch is within circle
const dx = pointer.x - this.crosshairBounds.x;
const dy = pointer.y - this.crosshairBounds.y;
const distance = Math.sqrt(dx * dx + dy * dy);

if (distance <= this.crosshairBounds.radius) {
  // Touch is inside circle
}
```

**Benefits:**
- More natural than rectangular hit boxes
- Matches circular UI elements
- Easy to calculate
- Scales with sprite size

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
9. **Shared UI patterns** - use base class methods (e.g., `createBackButton()`)
10. **Grid cell size consistency** - always use `this.grid.cellSize`
