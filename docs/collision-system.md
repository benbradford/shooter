# Collision System

## Overview

The collision system provides entity-to-entity collision detection using AABB (Axis-Aligned Bounding Box) collision. It is separate from grid/wall collision which is handled by `ProjectileComponent`.

## Components

### CollisionComponent

Defines collision properties for an entity:

```typescript
interface CollisionComponentProps {
  box: CollisionBox;              // Collision box (offset and size)
  collidesWith: string[];         // Tags this entity can collide with
  onHit: (other: Entity) => void; // Callback when collision occurs
}
```

### Entity Tags

Entities now have a `tags` property to identify what they are:

```typescript
entity.tags.add('player');
entity.tags.add('enemy');
entity.tags.add('player_projectile');
entity.tags.add('enemy_projectile');
```

## CollisionSystem

Located in `src/systems/CollisionSystem.ts`, this system:
- Checks all entities with `CollisionComponent` each frame
- Uses AABB collision detection (box overlap)
- Only checks pairs that should collide (based on tags)
- Triggers `onHit` callbacks when collision occurs
- Provides debug rendering (black boxes) when enabled

## Debug Rendering

Press **C** key to toggle collision box visualization:
- Black outlined boxes show collision areas
- Also toggles grid occupant highlighting
- Collision boxes render at depth 10000 (on top)

## Usage Example

### Player Bullet

```typescript
const entity = new Entity('bullet');
entity.tags.add('player_projectile');

entity.add(new CollisionComponent({
  box: { offsetX: -2, offsetY: -2, width: 4, height: 4 },
  collidesWith: ['enemy'],
  onHit: (other) => {
    if (other.tags.has('enemy')) {
      other.get(HealthComponent)?.takeDamage(10);
      entity.destroy();
    }
  }
}));
```

### Enemy Robot

```typescript
const entity = new Entity('stalking_robot');
entity.tags.add('enemy');

entity.add(new CollisionComponent({
  box: { offsetX: 0, offsetY: 16, width: 32, height: 16 },
  collidesWith: ['player_projectile', 'player'],
  onHit: (other) => {
    if (other.tags.has('player_projectile')) {
      health.takeDamage(10);
      stateMachine.enter('hit');
    }
  }
}));
```

### Player

```typescript
const entity = new Entity('player');
entity.tags.add('player');

entity.add(new CollisionComponent({
  box: { offsetX: 0, offsetY: 16, width: 32, height: 16 },
  collidesWith: ['enemy_projectile', 'enemy'],
  onHit: (other) => {
    if (other.tags.has('enemy_projectile')) {
      health.takeDamage(10);
      other.destroy();
    }
  }
}));
```

## Separation of Concerns

**CollisionSystem** handles:
- Entity ↔ Entity collision
- Projectile ↔ Entity collision

**ProjectileComponent** handles:
- Projectile ↔ Wall collision
- Layer-based wall blocking
- Transition cell upgrades

This separation keeps concerns isolated and allows:
- Fireballs to use CollisionComponent without ProjectileComponent
- Bullets to use both for complete collision detection
- Entities to collide with each other without grid involvement

## Two Types of Collision Boxes

Entities that interact with both the grid and other entities need **two separate collision boxes**:

### Grid Collision Box (GridPositionComponent)
- Used for wall/grid collision
- Typically offset to the right (offsetX: 0 or positive)
- Used by GridCollisionComponent for movement blocking

### Entity Collision Box (CollisionComponent)
- Used for entity-to-entity collision (projectiles, enemies, etc.)
- Typically centered (offsetX: negative half-width)
- Used by CollisionSystem for damage/interaction

**Example:**
```typescript
// Player
const PLAYER_GRID_COLLISION_BOX = { offsetX: 0, offsetY: 16, width: 48, height: 32 };
const PLAYER_ENTITY_COLLISION_BOX = { offsetX: -18, offsetY: 16, width: 36, height: 32 };

// Robot
const ROBOT_GRID_COLLISION_BOX = { offsetX: 0, offsetY: 16, width: 32, height: 16 };
const ROBOT_ENTITY_COLLISION_BOX = { offsetX: -16, offsetY: 0, width: 32, height: 32 };
```

**Why separate?**
- Grid collision needs to align with grid cells for wall detection
- Entity collision needs to be centered for accurate hit detection
- Different sizes optimize for different purposes

## Integration

In `GameScene.update()`:
```typescript
// Update entities first
this.entityManager.update(delta);

// Then check collisions
this.collisionSystem.update(this.entityManager.getAll());
```

## Next Steps

The collision system is fully integrated:
- ✅ Player has CollisionComponent (takes damage from enemy projectiles)
- ✅ Bullets have CollisionComponent (damage enemies)
- ✅ Fireballs have CollisionComponent (damage player)
- ✅ Robots have CollisionComponent (take damage from bullets)
- ✅ All entities use DamageComponent for damage values
- ✅ Old adhoc collision checks removed from GameScene

To add collision to a new entity:
1. Add appropriate tag(s) to entity
2. Add DamageComponent if it deals damage
3. Add CollisionComponent with collision box and onHit callback
4. Test with C key debug visualization
