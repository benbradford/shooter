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

### Player Combat System

The player uses a melee punch attack system:

**Attack Button:**
- Fixed position at 85% camera width, 85% camera height (bottom-right)
- Touch/click or press Space to punch
- Recalculates position every frame (Android compatibility)
- Uses camera dimensions (not displaySize) for correct positioning in HudScene

**Punch Mechanics:**
- Range: 128 pixels
- Damage: 20
- Duration: 250ms animation
- Hitbox spawns 150ms into animation (60% through)
- Finds nearest enemy within range
- Player faces enemy when punching
- Creates invisible hitbox 30px in front of player
- Hitbox follows player if they move during punch
- Hitbox lasts 300ms
- Uses collision system for damage/hit flash
- Respects layer boundaries (can't hit enemies on different layers unless on stairs)

**Hold-to-Repeat:**
- Tap attack: Single punch, player can move
- Hold attack: After first punch completes, auto-repeats every 250ms
- Movement locked during repeat punches (2nd+ punch)
- Facing direction updates even when locked
- Release attack: Returns to idle, movement unlocked

**Slide Ability:**
- Press H or tap slide button (left of attack button) to slide
- Slides 250px in facing direction at 400px/s with friction
- Player invulnerable during slide (passes through enemies)
- Stops on walls
- Cannot move or attack while sliding
- 3 second cooldown after slide
- Slide button visual feedback:
  - Unpressed: 0.7 alpha (more visible)
  - Pressed/Sliding: Red tint, 0.9 alpha, no circle
  - Cooldown: 0.3 alpha with partial circle showing remaining time

**Debug Mode (Press P):**
- Toggle between two targeting modes:
  - `mustFaceEnemy = false` (default): Punch any enemy within 128px
  - `mustFaceEnemy = true`: Only punch enemies within 108° FOV cone
- Press C to visualize FOV cone (yellow arc and lines)

**Player Sprite:**
- Uses `attacker` sprite sheet (56x56 frames)
- Frames 0-7: 8-direction idle
- Frames 8-55: Cross-punch (6 frames × 8 directions)
- Frames 56-87: Walking (4 frames × 8 directions)
- Frames 116-163: Slide (6 frames × 8 directions)

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
- Skeleton: `{ scale: 1.5, offsetX: 0, offsetY: 40 }`
- Bone projectile: `{ scale: 0.5, offsetX: 0, offsetY: 10 }`

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

// 1. Define props interface - all required
export interface MyComponentProps {
  speed: number;
  duration: number;
  cooldown: number;
}

// 2. Implement component with props
export class MyComponent implements Component {
  entity!: Entity;
  private readonly speed: number;
  private readonly duration: number;
  private readonly cooldown: number;
  
  constructor(
    private readonly dependency: SomeOtherComponent,
    props: MyComponentProps
  ) {
    this.speed = props.speed;
    this.duration = props.duration;
    this.cooldown = props.cooldown;
  }
  
  update(delta: number): void {
    // Component logic
  }
  
  onDestroy(): void {
    // Cleanup
  }
}

// 3. Usage: Explicit configuration
new MyComponent(dependency, { speed: 300, duration: 1000, cooldown: 2000 })
new MyComponent(dependency, { speed: 500, duration: 800, cooldown: 1000 })
```

**Key principle:** All props required, no defaults. Think about what might vary between entities.

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

### Adding Grid Walls and Platforms

In `GameScene.create()`:
```typescript
// Single wall (blocks movement, renders with pattern)
this.grid.setCell(5, 5, { layer: 1, properties: new Set(['wall']) });

// Row of walls
for (let col = 5; col <= 10; col++) {
  this.grid.setCell(col, 5, { layer: 1, properties: new Set(['wall']) });
}

// Platform (elevated, walkable, no pattern)
this.grid.setCell(15, 10, { layer: 1, properties: new Set(['platform']) });
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
  - **Yellow FOV cone: Punch targeting cone (when P is enabled)**

- **P key** - Toggle punch targeting mode
  - `mustFaceEnemy = false` (default): Punch any enemy within 128px
  - `mustFaceEnemy = true`: Only punch enemies within 108° FOV cone
  - FOV visualization appears when C is also pressed

- **V key** - Toggle HUD visibility
  - Hides/shows movement joystick, attack button, slide button, health/ammo bars
  - Useful for screenshots or cleaner view

- **Y key** - Save world state
  - Copies world state JSON to clipboard
  - Logs to console
  - Paste into `public/states/default.json` to persist

- **E key** - Enter level editor mode
  - Pauses game
  - Allows editing grid cells, moving player, resizing grid
  - **Trigger button** - Manage event triggers (list/edit/delete)
  - **Cell Modifier button** - Manage cell modifications (list/edit/delete)
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

### Projectile Collision

**See [Grid and Collision](./grid-and-collision.md#projectile-layer-rules-definitive) for complete bullet collision rules.**

Key points:
- Walls never block bullets
- Bullets blocked by platforms above player's starting layer (before stairs)
- After going UP through stairs: bullets pass through all same-layer platforms, blocked by different layers
- After going DOWN through stairs: no special restrictions

```typescript
// Bullet example
new ProjectileComponent({
  dirX, dirY, speed: 800, maxDistance: 700, grid,
  startLayer: playerLayer,
  fromTransition: false,
  scene,
  onWallHit: (x, y) => createParticles(scene, x, y)
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
    // Use layer collision helper for player attacks
    if (!canPlayerHitEnemy(playerEntity, other, grid)) {
      return;
    }
    
    const health = other.get(HealthComponent);
    const damage = entity.get(DamageComponent);
    if (health && damage) {
      health.takeDamage(damage.damage);
    }
    entity.destroy();
  }
}));
```

**Layer Collision Helper:**

Use `canPlayerHitEnemy()` to check if player attacks can hit enemies across layers:

```typescript
import { canPlayerHitEnemy } from '../../../systems/combat/LayerCollisionHelper';

// In enemy collision handler
if (!canPlayerHitEnemy(playerEntity, enemyEntity, grid)) {
  return; // Player on different layer and not on stairs
}
```

**Rules:**
- Player on stairs → Always hits (ignores layer)
- Player on same layer as enemy → Hits
- Player on different layer and not on stairs → Doesn't hit

**Key points:**
- Use `tags` to identify entity types
- `DamageComponent` stores damage value
- Collision boxes are separate from grid collision boxes
- Press **C** to toggle collision box debug rendering (black outlines)
- Use layer helper for all player projectile collisions with enemies

### Making Components Reusable

Use callbacks instead of hardcoding behavior to make components work across different entity types (player, enemies, NPCs, turrets).

### Moving Player Start Position

1. Press **E** to enter editor
2. Click **Move** button
3. Click and drag player to new position
4. Click **Back** to return to main menu
5. Click **Save** - JSON logged to console and downloaded
6. Copy JSON from console and paste into `public/levels/default.json`
7. Refresh browser

**Important:** Always use `this.grid.cellSize` instead of hardcoded values when converting between world and cell coordinates.

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

### Water System

**Swimming Mechanics:**
- Player swims at 70% speed in water cells
- Uses `PLAYER_SWIMMING_GRID_COLLISION_BOX` (64×64) for collision detection
- Larger collision box prevents sprite from overlapping land/blocked cells
- Water ripples spawn every 150ms while swimming
- Shadow fades to 60% alpha and renders at depth -8 when swimming
- Water splash effect when entering/leaving water (full splash)
- Mini splash effect every 500ms while actively swimming (reduced scale/speed)

**River Current:**
- Water with `flowDirection` applies force to push player
- Force configurable via `force` field (pixels/second)
- Stops when within 20px of blocker in flow direction
- Player can swim against current (harder) or with it (easier)

**Water + Blocked Cells:**
- Combine 'water' and 'blocked' properties to create impassable water obstacles
- Use at corners to prevent swimming into land where sprite would overlap
- Prevents visual glitches from sprite extending beyond collision box

**Water + Bridge Cells:**
- Walking over bridge: Full speed, no water effects
- Swimming under bridge: Reduced speed, ripples appear
- Bridge textures render at depth -5 (above swimming player at -7)

**Background Textures in Water:**
- Textures on water cells render at depth -8 (below swimming player)
- Use for submerged rocks, underwater obstacles
- Player always renders on top when swimming

**Assets:** 
- `public/assets/cell_drawables/water_ripple_spritesheet.png` - Ripples
- `public/assets/cell_drawables/water_splash.png` - Splash particles

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

**Attacker sprite sheet** (672×2072 pixels, 12×37 grid, 56×56 frames, 440 frames total):
- Frames 0-7: Idle (8 directions, alphabetical order)
- Frames 8-55: Cross-punch (6 frames × 8 directions)
- Frames 56-111: Falling-back-death (7 frames × 8 directions)
- Frames 112-151: Picking-up (5 frames × 8 directions)
- Frames 152-199: Pushing (6 frames × 8 directions)
- Frames 200-247: Running-6-frames (6 frames × 8 directions)
- Frames 248-295: Running-slide (6 frames × 8 directions)
- Frames 296-351: Surprise-uppercut (7 frames × 8 directions)
- Frames 352-407: Throw-object (7 frames × 8 directions)
- Frames 408-439: Walking-5 (4 frames × 8 directions)

**Note:** Idle frames (0-7) are in alphabetical order (east, north-east, north-west, north, south-east, south-west, south, west), not Direction enum order.

See `docs/attacker-spritesheet-reference.md` for complete frame mapping and `agent-sops/updating-attacker-spritesheet.md` for regeneration process.

**Skeleton sprite sheet** (288×1344 pixels, 6 columns × 28 rows, 48×48 frames):
- Rows 0-7: Idle (1 frame, 8 directions)
- Rows 8-15: Walk (4 frames, 8 directions)
- Rows 16-23: Lead Jab (3 frames, 8 directions)
- Rows 24-27: Taking Punch (6 frames, 4 directions)

See `public/assets/skeleton/README.md` for frame calculation formulas.

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
- Behind player: `sprite.setDepth(Depth.particleBehind)`
- In front: `sprite.setDepth(Depth.projectile)`

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

### Editor Saving Wrong Player Position

**Symptom:** Player position in saved level JSON doesn't match where player is in editor.

**Cause:** Editor was using `Math.round(worldX / cellSize)` to convert world coordinates to cell coordinates, which doesn't account for cell centering offset (`+ cellSize / 2`).

**Solution:** Use `grid.worldToCell()` which properly handles the conversion:

```typescript
// ❌ Wrong
const playerStart = {
  x: Math.round(playerTransform.x / grid.cellSize),
  y: Math.round(playerTransform.y / grid.cellSize)
};

// ✅ Correct
const cell = grid.worldToCell(playerTransform.x, playerTransform.y);
const playerStart = { x: cell.col, y: cell.row };
```

**Why:** Loading uses `worldX = cellSize * x + cellSize / 2`, so saving must use the inverse operation.

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

### Spawn Animations

For enemies that should rise from the ground (skeletons, undead):

```typescript
// SkeletonRiseComponent
export class SkeletonRiseComponent implements Component {
  private startY = 0;
  private targetY = 0;
  
  update(delta: number): void {
    if (this.elapsedMs === 0) {
      // Start below ground
      this.targetY = transform.y;
      this.startY = this.targetY + sprite.sprite.displayHeight;
      transform.y = this.startY;
      
      // Hide shadow and disable collision
      shadow.shadow.setVisible(false);
      collision.enabled = false;
      
      // Spawn smoke at feet
      createSmokeBurst({
        scene, x: transform.x, y: this.targetY,
        cellSize: sprite.sprite.displayHeight,
        burstCount: 3, intervalMs: 100
      });
    }
    
    // Move upward
    transform.y = this.startY + (this.targetY - this.startY) * progress;
    
    // Reveal top-to-bottom with mask
    const maskY = sprite.sprite.y - spriteHeight / 2;
    const maskHeight = spriteHeight * progress;
    
    if (progress >= 1) {
      shadow.shadow.setVisible(true);
      collision.enabled = true;
      stateMachine.enter('idle');
    }
  }
}
```

**Key points:**
- Start sprite below ground (y + displayHeight)
- Move upward to final position over 1 second
- Mask reveals from top to bottom (head first)
- Hide shadow until fully risen
- Disable collision until fully risen
- Smoke burst at feet position (targetY, not startY)
- Transition to idle state when complete

### Sprite Shattering Effect

For breakable objects, create realistic destruction by dividing the sprite into a 3x3 grid of shards:

```typescript
// In BreakableComponent.breakApart()
const GRID_SIZE = 3;
const pieceWidth = frame.width / GRID_SIZE;
const pieceHeight = frame.height / GRID_SIZE;

for (let row = 0; row < GRID_SIZE; row++) {
  for (let col = 0; col < GRID_SIZE; col++) {
    const shard = scene.add.sprite(x, y, texture);
    shard.setCrop(cropX, cropY, pieceWidth, pieceHeight);
    
    // Physics-based motion
    shard.x = startX + velocityX * time;
    shard.y = startY + velocityY * time - upwardVelocity * time + (gravity * time²) / 2;
    
    // Rotation based on position (left = counter-clockwise, right = clockwise)
    shard.angle = rotationDir * rotationSpeed * time;
    
    // Center column: Y-axis scale oscillation to simulate flipping
    if (col === 1) {
      shard.scaleY = scale * Math.sin(progress * Math.PI * 4);
    }
  }
}
```

**Key points:**
- Use absolute position calculation (not incremental) to prevent rotation affecting trajectory
- Add randomness to velocity, rotation, and gravity for natural variation
- Clamp Y position to prevent falling below original sprite
- Left/right pieces rotate in opposite directions
- Center pieces use Y-scale oscillation instead of rotation
- Position shards with minimal offset: `offsetX = (col - 1)`, `offsetY = (row - 1)` for tight grid

### Non-Lethal Hit Feedback

For objects that take multiple hits:
- Spawn single random shard on hit
- Shake sprite slightly (3px, 100ms)
- No hit flash (looks strange on objects)

### Coin and Medipack Pickups

**Coins:**
- Spawn from breakables based on rarity (0-20 coins)
- Physics-based: fly outward, arc upward, fall with gravity
- Stop at walls (check both X and Y collision separately)
- Can't be collected for first 200ms
- Fly to HUD counter when collected (accelerating flight)
- Add to coin count when reaching HUD
- Lifetime: 15 seconds, fade after 10 seconds
- Collection distance: 70px

**Medipacks:**
- Drop chance based on rarity (0% to 30%)
- Spawn at bottom center of breakable's cell
- Gradual healing: 50 HP/sec for 2 seconds (100 total)
- Overheal: Health can go above 100, up to 200 max
- Overheal benefits: 1.5x movement speed, 2x punch speed
- Overheal decays at 5 HP/sec when not healing
- Damage consumes from total health (overheal consumed first automatically)
- Natural regen disabled when health > 150
- Lifetime: 15 seconds, fade after 10 seconds
- Collection distance: 40px, 500ms delay

**Overheal HUD:**
- Purple bar overlays green health bar from left
- Sparkles at right edge during healing
- Bar stays visible during healing or overheal

**Coin Counter:**
- Displays in top-left corner with coin icon
- Shows total coins collected
- Coins fly to counter when collected
- Counter fades out after 3 seconds of no collection
- Reappears when collecting coins
- Persists across level transitions

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

### Varied Particle Textures

Create runtime textures by sampling from existing sprites:

```typescript
// Sample 6 random pieces from center 40% of texture
const centerX = frame.cutX + frame.width / 2;
const centerY = frame.cutY + frame.height / 2;
const sampleAreaSize = frame.width * 0.4;

for (let i = 0; i < 6; i++) {
  const srcX = centerX - sampleAreaSize/2 + Math.random() * sampleAreaSize;
  const srcY = centerY - sampleAreaSize/2 + Math.random() * sampleAreaSize;
  ctx.drawImage(sourceImage, srcX, srcY, 8, 8, i * 8, 0, 8, 8);
}

// Use as spritesheet
scene.textures.addSpriteSheet('rubble', canvas.canvas, {
  frameWidth: 8,
  frameHeight: 8
});

// Particles randomly pick frames
particles.add.particles(x, y, 'rubble', {
  frame: [0, 1, 2, 3, 4, 5],
  // ... other config
});
```

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
