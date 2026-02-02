# Quick Reference Guide

## ⚠️ MANDATORY: After Every Code Change ⚠️

**Run these commands after EVERY code modification:**

```bash
npm run build                # MUST pass with zero errors
npx eslint src --ext .ts     # MUST pass with zero errors
```

**No exceptions. Every code change must build and lint successfully.**

*Note: `npm run dev` is optional if you already have the dev server running in another terminal.*

---

## Common Development Tasks

### Starting Development

```bash
npm run dev          # Start dev server (http://localhost:5173)
npm run build        # Build for production
npx eslint src --ext .ts  # Check code quality
```

### Adding a Shadow to an Entity

Shadows are handled by the reusable `ShadowComponent`. All shadow properties must be explicitly provided:

```typescript
import { ShadowComponent } from '../ecs/components/ShadowComponent';

// In entity factory function
const shadow = entity.add(new ShadowComponent(scene, {
  scale: 2,        // Shadow size (required)
  offsetX: 0,      // Horizontal offset from entity (required)
  offsetY: 50      // Vertical offset from entity (required)
}));
shadow.init();  // Must call init() after add()
```

**Common shadow configurations:**
- Player: `{ scale: 2, offsetX: -5, offsetY: 43 }`
- Robot: `{ scale: 2, offsetX: 0, offsetY: 60 }`
- Fireball: `{ scale: 1.4, offsetX: 0, offsetY: 50 }`

The shadow:
- Uses the `shadow` texture from `assets/generic/shadow.png`
- Automatically follows the entity's position
- Renders at depth -1 (behind everything)

**Note:** Always call `shadow.init()` after adding the component to the entity.

### Adding a New Asset

1. Add sprite sheet to `public/assets/`
2. Register in `src/assets/AssetRegistry.ts`:
```typescript
export const ASSET_REGISTRY = {
  enemy: {
    key: 'enemy',
    path: 'assets/enemy/enemy-spritesheet.png',
    type: 'spritesheet' as const,
    config: { frameWidth: 64, frameHeight: 64 }
  },
};
```
3. Add to `src/assets/AssetLoader.ts` default assets list:
```typescript
const keysToLoad: AssetKey[] = keys || ['player', 'floating_robot', ..., 'enemy'];
```

### Creating a New Entity Type

1. Create factory function in `src/entityType/` (e.g., `src/enemy/`)
2. Add necessary components
3. Set update order
4. Example structure:

```typescript
// src/enemy/EnemyEntity.ts
export function createEnemyEntity(scene: Phaser.Scene, x: number, y: number, grid: Grid): Entity {
  const entity = new Entity('enemy');
  
  const transform = entity.add(new TransformComponent(x, y, 0, 2));
  const sprite = entity.add(new SpriteComponent(scene, 'enemy', transform));
  // ... add more components
  
  entity.setUpdateOrder([
    TransformComponent,
    SpriteComponent,
    // ... order matters!
  ]);
  
  return entity;
}
```

### Entity Positioning and Collision Boxes

**Key Principle:** Derive all values from `grid.cellSize` to minimize magic numbers.

**Two Types of Collision Boxes:**
1. **Grid Collision Box** - For wall/grid collision (used by GridPositionComponent)
   - Offset is relative to entity center (transform position)
   - **CRITICAL:** Must be centered (`offsetX: 0`) to prevent layer crossing issues
   - Height should be ≤ 50% of cell size to avoid overlapping adjacent cells
2. **Entity Collision Box** - For entity-to-entity collision (used by CollisionComponent)
   - Offset is relative to entity center
   - Use negative offsets to center: `-size / 2`

**Pattern for Grid-Based Entities:**
```typescript
// Grid collision box - MUST be centered on entity
const GRID_COLLISION_BOX = { 
  offsetX: 0,      // CRITICAL: Must be 0 (centered)
  offsetY: 16,     // Adjust vertical position as needed
  width: 32,       // Keep small (≤ 50% of cell size)
  height: 16       // Keep small (≤ 50% of cell size)
};

// Entity collision box - centered around sprite
const ENTITY_COLLISION_BOX = { 
  offsetX: -24,    // Negative to center
  offsetY: -24, 
  width: 48, 
  height: 48 
};
```

**Why Centered Grid Collision Box:**
- Prevents entity center from crossing layer boundaries when pushed
- Avoids getting stuck at layer corners
- Ensures `currentLayer` stays accurate during knockback
- Robot example: `{ offsetX: 0, offsetY: 32, width: 32, height: 16 }`

**Common Collision Sizes:**
- Small (robot): `width: 32, height: 16` (50% of 64px cell)
- Medium (player): `width: 48, height: 32` (75% width, 50% height)
- Large (boss): `width: 64, height: 64` (100% of cell)


### Creating a New Component

1. Create file in `src/ecs/components/`
2. Define props interface for configurable values
3. Implement Component interface with props-based constructor:

```typescript
import type { Component } from '../Component';
import type { Entity } from '../Entity';

// 1. Define props interface
export interface MyComponentProps {
  speed?: number;
  duration?: number;
  cooldown?: number;
}

// 2. Implement component with props
export class MyComponent implements Component {
  entity!: Entity;
  private readonly speed: number;
  private readonly duration: number;
  private readonly cooldown: number;
  
  constructor(
    private readonly dependency: SomeOtherComponent,
    props: MyComponentProps = {}
  ) {
    // Apply defaults
    this.speed = props.speed ?? 300;
    this.duration = props.duration ?? 1000;
    this.cooldown = props.cooldown ?? 2000;
  }
  
  update(delta: number): void {
    // Component logic
  }
  
  onDestroy(): void {
    // Cleanup
  }
}

// 3. Usage: Easy to customize per entity
new MyComponent(dependency)  // Defaults
new MyComponent(dependency, { speed: 500, cooldown: 1000 })  // Custom
```

**Key principle:** Think about what might vary between entities and pass it as props.

3. Export from `src/ecs/index.ts`

### Adding Triggers

Triggers are invisible areas that fire events when the player walks into them:

```typescript
// In level JSON
"triggers": [
  {
    "eventName": "door_open",
    "triggerCells": [
      { "col": 15, "row": 20 },
      { "col": 16, "row": 20 }
    ]
  }
]
```

**Editor workflow:**
1. Press **E** → **Trigger** button
2. Enter event name (e.g., "door_open")
3. Click grid cells to select trigger area (white borders appear)
4. Click **Add Trigger** → returns to main editor
5. Press **G** to see yellow outlines around trigger cells
6. Click **Log** to save level with triggers

**How triggers work:**
- Invisible entities that detect player position
- Fire events when player enters any trigger cell
- Disappear after being triggered (one-time use)
- Events logged to console and show alert popup

### Adding Grid Walls

In `GameScene.create()`:
```typescript
// Single wall
this.grid.setCell(5, 5, { layer: 1 });

// Row of walls
for (let col = 5; col <= 10; col++) {
  this.grid.setCell(col, 5, { layer: 1 });
}
```

### Debug Controls

- **G key** - Toggle grid debug visualization (enabled by default)
  - White lines: Grid cells
  - Layer shading: Darker for higher layers, lighter for lower
  - Blue overlay: Transition cells (staircases)
  - **Yellow outlines: Trigger cells**
  
- **C key** - Toggle collision debug visualization (disabled by default)
  - Black boxes: Entity collision boxes (CollisionComponent)
  - Blue boxes: Grid collision boxes (GridPositionComponent)
  - Red boxes: Projectile emitter positions

- **E key** - Enter level editor mode
  - Pauses game
  - Allows editing grid cells, moving player, resizing grid
  - **Trigger button** - Add invisible trigger areas that fire events
  - Click Save to export level JSON (logs to console + downloads file)

### Managing Entities

**Use EntityManager** - All entities are managed in one place:

```typescript
// In GameScene
private entityManager!: EntityManager;
private collisionSystem!: CollisionSystem;

async create() {
  this.entityManager = new EntityManager();
  this.collisionSystem = new CollisionSystem(this);
  
  // Add entities
  const player = this.entityManager.add(createPlayerEntity(...));
  const joystick = this.entityManager.add(createJoystickEntity(this));
}

update(delta: number) {
  // Update all entities
  this.entityManager.update(delta);
  
  // Check collisions
  this.collisionSystem.update(this.entityManager.getAll());
}

// Query entities
const player = this.entityManager.getFirst('player');
const bullets = this.entityManager.getByType('bullet');
```

**Benefits:**
- No separate arrays for different entity types
- Automatic cleanup of destroyed entities
- Easy to query by type
- Centralized collision detection

### Projectile Wall Collision

Control whether projectiles are blocked by walls:

```typescript
// Bullet - blocked by walls
new ProjectileComponent({
  dirX, dirY, speed: 800, maxDistance: 700, grid,
  blockedByWalls: true
})

// Grenade - flies over walls
new ProjectileComponent({
  dirX, dirY, speed: 600, maxDistance: 500, grid,
  blockedByWalls: false
})
```

### Entity Collision Detection

Use `CollisionComponent` for entity-to-entity collision:

```typescript
// Add to entity
entity.tags.add('player_projectile');
entity.add(new DamageComponent(10));
entity.add(new CollisionComponent({
  box: { offsetX: -2, offsetY: -2, width: 4, height: 4 },
  collidesWith: ['enemy'],
  onHit: (other) => {
    const health = other.get(HealthComponent);
    const damage = entity.get(DamageComponent);
    if (health && damage) {
      health.takeDamage(damage.damage);
    }
    entity.destroy();
  }
}));
```

**Key points:**
- Use `tags` to identify entity types
- `DamageComponent` stores damage value
- Collision boxes are separate from grid collision boxes
- Press **C** to toggle collision box debug rendering (black outlines)

### Making Components Reusable

Use callbacks instead of hardcoding behavior:

```typescript
// ❌ Bad: Hardcoded to player input
class ProjectileEmitterComponent {
  constructor(scene: Phaser.Scene) {
    this.fireKey = scene.input.keyboard!.addKey(KeyCodes.SPACE);
  }
}

// ✅ Good: Callback-based
class ProjectileEmitterComponent {
  constructor(props: {
    scene: Phaser.Scene,
    onFire: (x, y, dirX, dirY) => void,
    offsets: Record<Direction, EmitterOffset>,
    shouldFire: () => boolean,  // Player: () => input.isFirePressed()
    cooldown?: number           // Enemy: () => ai.shouldAttack()
  }) {}
}
```

**Important:** When defining emitter offsets, always scale by `SPRITE_SCALE`:

```typescript
const emitterOffsets: Record<Direction, EmitterOffset> = {
  [Direction.Down]: { x: -16 * SPRITE_SCALE, y: 40 * SPRITE_SCALE },
  [Direction.Up]: { x: 10 * SPRITE_SCALE, y: -30 * SPRITE_SCALE },
  // ... etc
};
```

This ensures projectile emission points are correct regardless of sprite scale.
```

### Moving Player Start Position

1. Press **E** to enter editor
2. Click **Move** button
3. Click and drag player to new position
4. Click **Back** to return to main menu
5. Click **Save** - JSON logged to console and downloaded
6. Copy JSON from console and paste into `public/levels/default.json`
7. Refresh browser

**Important:** Always use `this.grid.cellSize` instead of hardcoded values when converting between world and cell coordinates.

### Configuring Overheat System

The overheat system locks the gun when ammo reaches 0 until fully reloaded:

```typescript
// In PlayerEntity.ts
const ammo = entity.add(new AmmoComponent({
  maxAmmo: 20,                    // Total ammo capacity
  refillRate: 10,                 // Ammo per second refill rate
  refillDelay: 2000,              // Normal delay before refilling (ms)
  overheatedRefillDelay: 4000     // Longer delay when overheated (ms)
}));
```

**Behavior:**
- Fire normally when `currentAmmo > 0` and not overheated
- Ammo hits 0 → Gun locks (can't fire even as ammo refills)
- Wait `overheatedRefillDelay` ms → Start refilling
- Ammo reaches max → Gun unlocks
- Smoke particles emit while overheated

**Key difference:** `overheatedRefillDelay` is longer than `refillDelay` to punish overheating.

### Health Regeneration

Player health regenerates automatically after not taking damage:

```typescript
// In PlayerEntity.ts
const health = entity.add(new HealthComponent({ 
  maxHealth: 100, 
  enableRegen: true  // Enable auto-regen
}));
```

**Behavior:**
- After 3 seconds without damage, health regens at 20 HP/sec
- Taking damage resets the 3-second timer
- Only enabled for player (enemies don't regen)

### Hit Flash Effect

Entities flash when taking damage. Color can be customized:

```typescript
// Red flash (default - for robots, player, etc.)
entity.add(new HitFlashComponent());

// Green flash (for bugs with red/black sprites)
entity.add(new HitFlashComponent(0x00ff00));
```

**Critical:** HitFlashComponent must be BEFORE SpriteComponent in update order:
```typescript
entity.setUpdateOrder([
  TransformComponent,
  HitFlashComponent,  // BEFORE SpriteComponent
  SpriteComponent,
  // ...
]);
```

### Touch Joystick Visual Components

The game uses two visual joystick components for touch controls:

**JoystickVisualsComponent (Movement):**
- Outer circle: 150px radius, grey outline
- Inner circle: 80px radius, grey outline
- Arrows sprite: Shows directional arrows, follows drag
- Alpha: 1.0 when active, 0.3 when inactive
- Default position: 20% from left, 75% from top
- Appears at touch location on left half of screen
- Persists at last position when not touching

**AimJoystickVisualsComponent (Aiming):**
- Outer circle: 150px radius, blue outline
- Crosshair sprite: Scaled to 50%, centered in auto-aim, follows drag in manual aim
- Alpha: 1.0 when active, 0.3 when inactive
- Default position: 80% from left, 50% from top (center-right)
- Appears at touch location on right half of screen
- Persists at last position when not aiming
- Crosshair returns to center when releasing

**Key Constants:**
```typescript
const TOUCH_CONTROLS_SCALE = 2.5;  // Scale factor for all touch UI
const MANUAL_AIM_THRESHOLD_PX = 70; // Distance to trigger manual aim
const PLAYER_BULLET_MAX_DISTANCE_PX = 700; // Auto-aim range
```

**Visual Component Pattern:**
- All HUD elements use `setScrollFactor(0)` to fix to camera
- High depth (2000+) to render on top
- Use `displaySize` for percentage-based positioning
- Recalculate positions every frame until first interaction (Android fix)

## Project Structure Quick Reference

```
src/
├── animation/           # Animation system (Animation, AnimationSystem)
├── assets/              # Asset registry and loader
├── constants/           # Shared constants (Direction, etc.)
├── ecs/                 # ECS framework
│   ├── components/      # All reusable components
│   ├── Component.ts     # Component interface
│   ├── Entity.ts        # Entity class
│   └── EntityManager.ts # Entity lifecycle management
├── editor/              # Level editor states and UI
├── hud/                 # HUD entities (joystick, etc.)
├── level/               # Level loading system
├── player/              # Player entity and states
├── projectile/          # Projectile entities (bullets, fireballs, shells)
├── robot/               # Robot enemy entity and states
├── systems/             # Game systems (CollisionSystem)
├── utils/               # Grid, StateMachine, etc.
│   └── state/           # State machine interfaces
├── EditorScene.ts       # Level editor scene
├── GameScene.ts         # Main game scene
└── main.ts              # Entry point
```

## Common Patterns

### Accessing Components in States

```typescript
export class MyState implements IState {
  constructor(private readonly entity: Entity) {}
  
  onUpdate(_delta: number): void {
    // Use require() for mandatory components (throws if missing)
    const transform = this.entity.require(TransformComponent);
    const sprite = this.entity.require(SpriteComponent);
    
    // Use get() for optional components (returns undefined if missing)
    const knockback = this.entity.get(KnockbackComponent);
    if (knockback) {
      knockback.apply(dirX, dirY);
    }
  }
}
```

### Sprite Sheet Frame Layout

Current player sprite sheet (256x512):
- 4 columns: idle, walk1, walk2, walk3
- 8 rows: down, up, left, right, upleft, upright, downleft, downright
- Frame index = `row * 4 + column`

### Component Update Order Rules

1. **Transform** - Base position
2. **Sprite** - Sync visual with transform
3. **Input** - Read player input (if applicable)
4. **Movement** (Walk/AI) - Calculate new position
5. **GridCollision** - Validate and adjust position
6. **StateMachine** - Update state based on final position
7. **Animation** - Update animation frames

## Troubleshooting

### Build Errors

```bash
npm run build  # See TypeScript errors
```

Common issues:
- Import paths wrong (use `../` for parent directory)
- Missing `readonly` on properties that never change (enable with `@typescript-eslint/prefer-readonly`)
- Using `any` type (use specific types or `unknown`)

### Linting Errors

```bash
npx eslint src --ext .ts
```

Common issues:
- Unused variables (prefix with `_` if intentional)
- `any` types (replace with proper types)
- Properties that should be `readonly` (eslint will warn with `prefer-readonly` rule)

### Sprite Sizing Issues

If `sprite.setDisplaySize()` doesn't work:
- `SpriteComponent.update()` calls `setScale()` every frame, overriding display size
- Use `TransformComponent` scale parameter instead:
  ```typescript
  new TransformComponent(x, y, rotation, 0.5)  // Half size
  ```

### Visual Effects Not Rendering Correctly

**Depth sorting:**
- Set sprite depth based on context (player direction, Y position)
- Behind player: `sprite.setDepth(-1)`
- In front: `sprite.setDepth(1)`

**Physics-based motion:**
- Use velocity + gravity, not sine waves
- Sine waves loop forever; physics settles naturally

### Player Spawning at Wrong Position

**Symptom:** Player always spawns at (0, 0) or top-left corner, regardless of saved position in level JSON.

**Cause:** `GridCollisionComponent` initializes `previousX` and `previousY` to (0, 0). On the first update frame, it thinks the player is moving from (0, 0) to the spawn position. If there are layer 1 walls between (0, 0) and the spawn point, the collision system blocks the "movement" and snaps the player back to (0, 0).

**Solution:** `GridCollisionComponent.update()` now checks if `previousX === 0 && previousY === 0` on first frame and initializes them to the player's actual starting position. This prevents the phantom movement check.

**Code:**
```typescript
// In GridCollisionComponent.update()
if (this.previousX === 0 && this.previousY === 0) {
  this.previousX = transform.x;
  this.previousY = transform.y;
}
```

### Editor Green Box in Wrong Position

**Symptom:** In Move mode, green highlight box appears in top-right corner or doesn't scroll with camera.

**Cause:** Highlight rectangle was created in EditorScene using `this.scene.add.rectangle()`. EditorScene is an overlay with `scrollFactor(0)` by default, so objects don't scroll with the camera.

**Solution:** Create highlight rectangle in GameScene instead:
```typescript
// In MoveEditorState.onEnter()
const gameScene = this.scene.scene.get('game') as GameScene;
this.highlight = gameScene.add.rectangle(...);  // Not this.scene.add
```

This ensures the highlight scrolls with the world camera.

### Player Hidden Behind Walls

**Symptom:** Player appears to be in wrong position, but console logs show correct coordinates (e.g., 2560, 2560).

**Cause:** Layer 1 cells are elevated platforms/walls that render with a darker overlay on top of everything. If the entire top of the map is layer 1, it creates a visual barrier that obscures the player even though they're at the correct position.

**Solution:** Design levels so:
- Player starts in open areas (layer 0 cells)
- Layer 1 walls don't completely block view of playable areas
- Use layer 1 for actual walls/obstacles, not as a full ceiling

### Grid Cell Size Consistency

**Symptom:** Player position calculations are wrong, or level doesn't load correctly.

**Cause:** Using hardcoded `this.cellSize` instead of `this.grid.cellSize` when converting between world and cell coordinates.

**Solution:** Always use `this.grid.cellSize`:
```typescript
// ✅ Correct
const startX = this.grid.cellSize * level.playerStart.x;
const cellX = Math.round(transform.x / this.grid.cellSize);

// ❌ Wrong
const startX = this.cellSize * level.playerStart.x;  // Hardcoded value
const cellX = Math.round(transform.x / this.cellSize);
```

The grid's cellSize is the source of truth since it's initialized from the level data.

### Overheat System Not Working

**Symptom:** Can still fire when overheated, or smoke particles never stop.

**Cause:** Multiple issues:
1. `canFire()` was checking `currentAmmo >= 1` instead of `> 0`
2. No overheat lock - gun could fire as soon as ammo started refilling
3. Smoke particles checking ammo ratio instead of overheat flag

**Solution:** 
- Added `isOverheated` flag that locks gun until fully reloaded
- `canFire()` checks both `currentAmmo > 0` and `!isOverheated`
- Smoke particles sync directly with `isGunOverheated()`
- Separate `overheatedRefillDelay` for longer penalty when overheated

**Code:**
```typescript
// In AmmoComponent
private isOverheated: boolean = false;

canFire(): boolean {
  return this.currentAmmo > 0 && !this.isOverheated;
}

consumeAmmo(): void {
  if (this.currentAmmo > 0) {
    this.currentAmmo -= 1;
    if (this.currentAmmo <= 0) {
      this.currentAmmo = 0;
      this.isOverheated = true;  // Lock gun
    }
  }
}

update(delta: number): void {
  const delay = this.isOverheated ? this.overheatedRefillDelay : this.refillDelay;
  // ... refill logic
  if (this.currentAmmo >= this.maxAmmo) {
    this.isOverheated = false;  // Unlock gun
  }
}

// In OverheatSmokeComponent
update(_delta: number): void {
  // Sync particles directly with overheat state
  this.particles.emitting = this.ammoComponent.isGunOverheated();
}
```

## Visual Effects Best Practices

### Creating Particle Effects (Shell Casings, Debris)

1. **Use physics-based motion**
   ```typescript
   velocityY += gravity * delta;  // Not: Math.sin(time)
   ```

2. **Randomize for variety**
   ```typescript
   const randomX = (Math.random() * 120) - 60;  // ±60 pixels
   const randomY = (Math.random() * 30) - 15;   // ±15 pixels
   ```

3. **Set depth based on context**
   ```typescript
   const facingUp = [Direction.Up, Direction.UpLeft, Direction.UpRight].includes(dir);
   sprite.setDepth(facingUp ? -1 : 1);
   ```

4. **Use simple phase management**
   ```typescript
   phase: 'flying' | 'bouncing' | 'fading'  // Not StateMachineComponent
   ```

5. **No grid interaction needed**
   - Skip GridPositionComponent and GridCollisionComponent
   - Visual effects don't occupy cells

## Performance Tips

- Use sprite sheets instead of individual images
- Limit entities updated per frame
- Use object pooling for frequently spawned entities (bullets, particles)
- Profile with browser DevTools
- Compress assets (use `sips -Z <size>` on macOS)

## Useful Links

- Phaser 3 Docs: https://photonstorm.github.io/phaser3-docs/
- TypeScript Handbook: https://www.typescriptlang.org/docs/
- Game Architecture Doc: `docs/game-architecture.md`
