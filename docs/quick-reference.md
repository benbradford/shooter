# Quick Reference Guide

## Common Development Tasks

### Starting Development

```bash
npm run dev          # Start dev server (http://localhost:5173)
npm run build        # Build for production
npx eslint src --ext .ts  # Check code quality
```

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

### Creating a New Component

1. Create file in `src/ecs/components/`
2. Implement Component interface:

```typescript
import type { Component } from '../Component';
import type { Entity } from '../Entity';

export class MyComponent implements Component {
  entity!: Entity;
  
  constructor(/* dependencies */) {}
  
  update(delta: number): void {
    // Component logic
  }
  
  onDestroy(): void {
    // Cleanup
  }
}
```

3. Export from `src/ecs/index.ts`

### Adding Grid Walls

In `GameScene.create()`:
```typescript
// Single wall
this.grid.setCell(5, 5, { walkable: false, blocksProjectiles: true });

// Row of walls
for (let col = 5; col <= 10; col++) {
  this.grid.setCell(col, 5, { walkable: false, blocksProjectiles: true });
}
```

### Debug Controls

- **G key** - Toggle grid debug visualization (enabled by default)
  - White lines: Grid cells
  - Red cells: Non-walkable
  - Green cells: Occupied by entities
  - Blue boxes: Collision boxes
  - Red boxes: Projectile emitter positions

### Adding Projectiles

1. Create projectile entity factory in `src/projectile/`
2. Add `ProjectileComponent` for movement, lifetime, and collision
3. Track bullets in GameScene and filter destroyed ones

```typescript
// In GameScene
private bullets: Entity[] = [];

update(delta: number) {
  this.bullets = this.bullets.filter(bullet => {
    if (bullet.isDestroyed) return false;
    bullet.update(delta);
    return true;
  });
}

// Spawn bullet (blocked by walls)
const bullet = createBulletEntity(this, x, y, dirX, dirY, grid);
this.bullets.push(bullet);
```

### Projectile Wall Collision

Control whether projectiles are blocked by walls:

```typescript
// Bullet - blocked by walls
new ProjectileComponent(dirX, dirY, 800, 700, grid, true)

// Grenade - flies over walls
new ProjectileComponent(dirX, dirY, 600, 500, grid, false)
```

The last parameter (`blockedByWalls`) determines if the projectile checks `grid.blocksProjectiles`.

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
  constructor(
    scene: Phaser.Scene,
    onFire: (x, y, dirX, dirY) => void,
    offsets: Record<Direction, EmitterOffset>,
    shouldFire: () => boolean,  // Player: () => input.isFirePressed()
    cooldown: number = 200      // Enemy: () => ai.shouldAttack()
  ) {}
}
```

## Project Structure Quick Reference

```
src/
├── assets/              # Asset registry and loader
├── constants/           # Shared constants (Direction, etc.)
├── ecs/                 # ECS framework
│   └── components/      # All reusable components
├── animation/           # Animation system
├── player/              # Player entity and states
├── projectile/          # Projectile entities (bullets, etc.)
├── utils/               # Grid, StateMachine, etc.
├── GameScene.ts         # Main game scene
└── main.ts              # Entry point
```

## Common Patterns

### Accessing Components in States

```typescript
export class MyState implements IState {
  constructor(private readonly entity: Entity) {}
  
  onUpdate(_delta: number): void {
    const transform = this.entity.get(TransformComponent)!;
    const sprite = this.entity.get(SpriteComponent)!;
    // Use components
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
- Missing `readonly` on properties that never change
- Using `any` type (use specific types or `unknown`)

### Linting Errors

```bash
npx eslint src --ext .ts
```

Common issues:
- Unused variables (prefix with `_` if intentional)
- `any` types (replace with proper types)

### Game Not Loading

1. Check browser console for errors
2. Verify asset paths in AssetRegistry
3. Check sprite sheet dimensions match config
4. Ensure all components are added before `setUpdateOrder()`

## Performance Tips

- Use sprite sheets instead of individual images
- Limit entities updated per frame
- Use object pooling for frequently spawned entities (bullets, particles)
- Profile with browser DevTools

## Useful Links

- Phaser 3 Docs: https://photonstorm.github.io/phaser3-docs/
- TypeScript Handbook: https://www.typescriptlang.org/docs/
- Game Architecture Doc: `docs/game-architecture.md`
