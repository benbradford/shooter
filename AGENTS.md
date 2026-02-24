# Dodging Bullets - AI Assistant Guide

**Last Updated:** 2026-02-24

This document provides comprehensive context for AI coding assistants working on the Dodging Bullets game project.

## Table of Contents

1. [Project Overview](#project-overview)
2. [Critical Development Rules](#critical-development-rules)
3. [Architecture](#architecture)
4. [Directory Structure](#directory-structure)
5. [Common Tasks](#common-tasks)
6. [Development Workflow](#development-workflow)
7. [Key Patterns](#key-patterns)
8. [Documentation Map](#documentation-map)

---

## Project Overview

**Dodging Bullets** is a 2D top-down shooter built with:
- **Framework:** Phaser 3 (TypeScript)
- **Architecture:** Entity-Component-System (ECS)
- **Grid:** 64x64 pixel cells, multi-layer support
- **Resolution:** 1280x720 (16:9)
- **Platform:** Web (desktop + mobile touch)

**Key Features:**
- Grid-based movement with smooth interpolation
- Multi-layer environments with staircases
- In-game level editor
- Touch controls (joysticks + buttons)
- A* pathfinding for AI
- Event-driven entity spawning
- Automated browser testing

---

## Critical Development Rules

### After EVERY Code Change

```bash
npm run build                # MUST pass with zero errors
npx eslint src --ext .ts     # MUST pass with zero errors
```

No exceptions. Both must complete successfully.

### Never Use Git Commands

AI assistants must NEVER run git commands (checkout, reset, revert, stash, etc.). If code needs reverting, manually undo changes by editing files.

### Never Modify Images

Do NOT resize, crop, or modify image files unless explicitly requested. Adjust sprite scaling in code instead.

### Clarify Before Implementing

If there is ANY ambiguity in requirements, STOP and ask for clarification before writing code.

---

## Architecture

### ECS System

**Entity:** Container with unique ID holding components
**Component:** Data + behavior implementing `Component` interface
**EntityManager:** Creates, destroys, queries entities
**Update Order:** Components update in specified sequence

```typescript
entity.setUpdateOrder([
  TransformComponent,      // Position
  SpriteComponent,         // Visual sync
  InputComponent,          // Read input
  WalkComponent,           // Calculate movement
  GridCollisionComponent,  // Validate position
  StateMachineComponent,   // Update state
  AnimationComponent,      // Update frames
]);
```

### Component Design Principles

1. **Props-based configuration** - All values passed as props, no defaults
2. **Single responsibility** - One component, one job
3. **Minimal dependencies** - Only depend on what you need
4. **Reusability** - Think about multiple entity types
5. **No magic numbers** - All values as named constants with units

**Example:**
```typescript
interface WalkComponentProps {
  speedPxPerSec: number;
  accelerationTimeMs: number;
}

constructor(props: WalkComponentProps) {
  this.speedPxPerSec = props.speedPxPerSec;
  this.accelerationTimeMs = props.accelerationTimeMs;
}
```

### Grid System

- **Cell size:** 64x64 pixels
- **Layers:** -1 (pits), 0 (ground), 1+ (platforms/walls)
- **Transitions:** Staircases connecting layers (vertical movement only)
- **Properties:** 'platform', 'wall', 'stairs', 'path', 'water', 'blocked'

**Collision:**
- Grid collision: Entity vs walls/layers (GridCollisionComponent)
- Entity collision: Entity vs entity (CollisionComponent + CollisionSystem)
- Projectile collision: Separate rules (ProjectileComponent)

---

## Directory Structure

```
src/
├── ecs/
│   ├── components/
│   │   ├── core/          # Transform, Sprite, Health, Damage
│   │   ├── movement/      # Walk, GridCollision, GridPosition
│   │   ├── input/         # Input, TouchJoystick, AttackButton
│   │   ├── combat/        # Projectile, Collision, Ammo
│   │   ├── ai/            # Patrol, LineOfSight, Difficulty
│   │   ├── visual/        # HitFlash, Particles, Shadow
│   │   ├── ui/            # HudBar, JoystickVisuals
│   │   └── abilities/     # SlideAbility
│   ├── entities/
│   │   ├── player/        # Player entity and states
│   │   ├── robot/         # Stalking robot enemy
│   │   ├── skeleton/      # Skeleton enemy
│   │   ├── thrower/       # Thrower enemy
│   │   ├── bug/           # Bug and bug base
│   │   ├── bulletdude/    # Bullet dude enemy
│   │   ├── projectile/    # Bullets, fireballs, grenades
│   │   ├── pickup/        # Coins, medipacks
│   │   └── breakable/     # Breakable objects
│   ├── Entity.ts          # Entity class
│   └── EntityManager.ts   # Entity lifecycle
├── systems/
│   ├── grid/              # Grid and CellData
│   ├── animation/         # Animation system
│   ├── state/             # State machine
│   ├── level/             # Level loading
│   ├── combat/            # Combat helpers
│   ├── CollisionSystem.ts
│   ├── Pathfinder.ts
│   ├── EntityLoader.ts
│   ├── EntityCreatorManager.ts
│   ├── WorldStateManager.ts
│   └── SceneOverlays.ts
├── scenes/
│   ├── GameScene.ts       # Main game scene
│   ├── EditorScene.ts     # Level editor overlay
│   ├── HudScene.ts        # HUD overlay
│   ├── LevelSelectorScene.ts
│   ├── states/            # Game states
│   └── theme/             # Theme renderers
├── editor/                # Editor state classes
├── constants/             # Shared constants
├── assets/                # Asset registry and loader
└── main.ts                # Entry point

public/
├── assets/                # All game assets
│   ├── player/
│   ├── attacker/          # Player animations
│   ├── enemies/
│   ├── cell_drawables/    # Textures, tilesets
│   └── generic/
└── levels/                # Level JSON files

scripts/                   # Build and generation scripts
test/                      # Puppeteer tests
docs/                      # Detailed documentation
agent-sops/                # Standard operating procedures
```

---

## Common Tasks

### Adding a New Component

1. Create in `src/ecs/components/{category}/`
2. Define props interface (all required, no defaults)
3. Implement `Component` interface
4. Export from `src/ecs/index.ts`
5. Add to relevant entities

### Adding a New Enemy

1. Create sprite sheet (register in AssetRegistry)
2. Create components for behavior
3. Create state machine states
4. Create entity factory function
5. Add to EntityLoader
6. Add to editor (AddEntityEditorState)

See `docs/adding-enemies.md` for complete guide.

### Adding a Background Texture

1. Add file to `public/assets/cell_drawables/`
2. Register in `src/assets/AssetRegistry.ts`
3. Add to `src/assets/AssetLoader.ts` default assets
4. Add to `AVAILABLE_TEXTURES` in `src/editor/TextureEditorState.ts`
5. (Optional) Add transform override in `GameSceneRenderer.ts`

See `agent-sops/adding-background-textures.md` for complete SOP.

### Updating Attacker Spritesheet

1. Add animation frames to `public/assets/attacker/animations/`
2. Run `node scripts/generate-attacker-spritesheet.js`
3. Update frame indices in `PlayerEntity.ts`
4. Test all animations

See `agent-sops/updating-attacker-spritesheet.md` for complete SOP.

---

## Development Workflow

### Standard Workflow

1. Make code changes
2. Run `npm run build` (must pass)
3. Run `npx eslint src --ext .ts` (must pass)
4. Test in browser (`npm run dev`)
5. Run relevant tests if applicable

### Level Editing Workflow

1. Press **E** in-game to enter editor
2. Make changes (grid, entities, textures)
3. Click **Log** to save JSON
4. Copy JSON to `public/levels/{levelName}.json`
5. Refresh browser to test

### Testing Workflow

```bash
# All tests
npm test                                    # Visible browser
npm run test:headless                       # Headless mode

# Single test file
npm run test:single test-ammo-system
npm run test:headless:single test-ammo-system

# With keyword filter
npm run test:single test-ammo-system "refills"
```

---

## Key Patterns

### Component Props Pattern

```typescript
// Define props interface - all required
export interface MyComponentProps {
  speedPxPerSec: number;
  durationMs: number;
}

// Use in constructor
constructor(props: MyComponentProps) {
  this.speedPxPerSec = props.speedPxPerSec;
  this.durationMs = props.durationMs;
}

// Usage - explicit configuration
new MyComponent({ speedPxPerSec: 300, durationMs: 1000 })
```

### Entity Factory Pattern

```typescript
export function createEnemyEntity(props: CreateEnemyProps): Entity {
  const entity = new Entity(props.entityId);
  entity.tags.add('enemy');
  
  entity.add(new TransformComponent(x, y, 0, scale));
  entity.add(new SpriteComponent(scene, texture, transform));
  // ... more components
  
  entity.setUpdateOrder([
    TransformComponent,
    SpriteComponent,
    // ... order matters
  ]);
  
  return entity;
}
```

### State Machine Pattern

```typescript
export class EnemyIdleState implements IState {
  constructor(private readonly entity: Entity) {}
  
  onEnter(): void {
    // Setup when entering state
  }
  
  onExit(): void {
    // Cleanup when leaving state
  }
  
  onUpdate(delta: number): void {
    // Per-frame logic
    // Check conditions and transition states
  }
}
```

### Collision Callback Pattern

```typescript
entity.add(new CollisionComponent({
  box: { offsetX: -16, offsetY: -16, width: 32, height: 32 },
  collidesWith: ['enemy'],
  onHit: (other) => {
    // Each entity decides its own fate
    const health = other.get(HealthComponent);
    if (health) {
      health.takeDamage(10);
    }
    
    // Destroy self on next frame (after all callbacks)
    scene.time.delayedCall(0, () => entity.destroy());
  }
}));
```

---

## Documentation Map

For detailed information on specific topics, consult:

**Architecture & Design:**
- `docs/ecs-architecture.md` - ECS fundamentals
- `docs/coding-standards.md` - Code quality rules
- `docs/grid-and-collision.md` - Grid system details

**Game Systems:**
- `docs/collision-system.md` - Entity collision
- `docs/pathfinding.md` - AI navigation
- `docs/event-system.md` - Event-driven gameplay
- `docs/input-systems.md` - Controls
- `docs/world-state-system.md` - Save/load

**Level Design:**
- `docs/level-editor.md` - Editor usage and data format
- `docs/entity-creation-system.md` - Entity spawning
- `docs/level-themes.md` - Visual themes

**Development:**
- `docs/adding-enemies.md` - Enemy implementation
- `docs/spawner-entities.md` - Spawner systems
- `docs/visual-effects.md` - Particles and effects
- `docs/testing.md` - Test infrastructure

**Reference:**
- `docs/quick-reference.md` - Common tasks
- `docs/attacker-spritesheet.md` - Animation frames
- `docs/screen-scaling-and-hud.md` - Mobile quirks

**SOPs:**
- `agent-sops/adding-background-textures.md`
- `agent-sops/updating-attacker-spritesheet.md`

---

## Quick Reference

### Debug Controls

- **G** - Toggle grid debug (layers, transitions, triggers)
- **C** - Toggle collision boxes
- **E** - Enter level editor
- **P** - Toggle punch targeting mode
- **V** - Toggle HUD visibility
- **Y** - Save world state to clipboard

### Constants

- `CELL_SIZE = 64` - Grid cell size
- `CAMERA_ZOOM = 1` - Must always be 1 (never change)
- `CAN_WALK_ON_WATER = false` - Water blocks movement

### Key Files

- `src/ecs/entities/player/PlayerEntity.ts` - Player setup
- `src/scenes/GameScene.ts` - Main game loop
- `src/systems/EntityLoader.ts` - Entity spawning from JSON
- `src/editor/DefaultEditorState.ts` - Editor main menu
- `src/assets/AssetRegistry.ts` - All game assets

---

**For detailed information on any topic, refer to the specific documentation files listed in the Documentation Map section above.**
