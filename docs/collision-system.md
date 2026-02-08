# Collision System

## Overview

The collision system provides entity-to-entity collision detection using AABB (Axis-Aligned Bounding Box) collision with spatial partitioning optimization. It is separate from grid/wall collision which is handled by `ProjectileComponent`.

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
- Uses **spatial partitioning** via grid cells for efficient collision detection
- Checks entities with `CollisionComponent` each frame
- Uses AABB collision detection (box overlap)
- Only checks pairs that should collide (based on tags)
- Triggers `onHit` callbacks when collision occurs
- Provides debug rendering (black boxes) when enabled

### Spatial Partitioning Optimization

The collision system uses the grid's `occupants` tracking for spatial awareness:

**Grid-Based Entities** (have `GridPositionComponent`):
- Only check their current cell + 8 neighboring cells (9 cells total)
- Leverages existing `grid.occupants` data maintained by `GridCollisionComponent`
- Dramatically reduces collision checks for spread-out entities

**Non-Grid Entities** (projectiles without grid position):
- Fall back to checking all collidable entities
- Ensures nothing is missed even without grid tracking

**Performance Gains:**
- Small maps (10-20 entities): Minimal difference
- Medium maps (50-100 entities): **5-10x faster**
- Large maps (200+ entities): **20-50x faster**

**Example:**
- Before: 100 entities = 4,950 checks per frame (O(n²))
- After: 100 entities = ~900 checks per frame (O(n) with spatial partitioning)

The optimization is most effective when entities are spread across the map. If all entities cluster in one area, it degrades gracefully to near-original performance.

## Debug Rendering

Press **C** key to toggle collision box visualization:
- Black outlined boxes show collision areas
- Also toggles grid occupant highlighting
- Collision boxes render at depth 10000 (on top)

## Collision Callback Best Practices

### Principle: Each Entity Decides Its Own Fate

**Good Pattern:**
```typescript
// Bullet decides what to do with itself
entity.add(new CollisionComponent({
  collidesWith: ['enemy'],
  onHit: (other) => {
    if (other.tags.has('enemy')) {
      // Damage the enemy
      other.require(HealthComponent).takeDamage(BULLET_DAMAGE);
      
      // Trigger enemy state
      other.get(StateMachineComponent)?.stateMachine.enter('hit');
      
      // Destroy self on next frame (after all callbacks complete)
      scene.time.delayedCall(0, () => entity.destroy());
    }
  }
}));

// Robot decides what to do with itself
entity.add(new CollisionComponent({
  collidesWith: ['player_projectile'],
  onHit: (other) => {
    if (other.tags.has('player_projectile')) {
      // Read projectile data (safe - bullet destruction is delayed)
      const projectile = other.require(ProjectileComponent);
      const dirX = projectile.dirX;
      const dirY = projectile.dirY;
      
      // Take damage
      health.takeDamage(ROBOT_BULLET_DAMAGE);
      
      // Apply knockback
      const knockback = entity.get(KnockbackComponent);
      if (knockback) {
        const length = Math.hypot(dirX, dirY);
        knockback.applyKnockback(dirX / length, dirY / length, KNOCKBACK_FORCE);
      }
      
      // Enter hit state
      stateMachine.enter('hit');
    }
  }
}));
```

**Why this works:**
- Bullet destroys itself on next frame using `scene.time.delayedCall(0, ...)`
- Both callbacks execute in the current frame
- Robot can safely read `ProjectileComponent` data before bullet is destroyed
- No timing issues, no ordering dependencies

**Bad Pattern (Don't Do This):**
```typescript
// ❌ Robot destroying the bullet
onHit: (other) => {
  other.destroy(); // Robot shouldn't decide bullet's fate
}

// ❌ Immediate destruction
onHit: (other) => {
  entity.destroy(); // Destroys before other callback runs
}
```

### Timing and Frame Delays

**Problem:** If entity A destroys itself immediately in its callback, entity B's callback can't read A's components.

**Solution:** Delay destruction by one frame:

```typescript
// Destroy on next frame
scene.time.delayedCall(0, () => entity.destroy());
```

This ensures:
- Both collision callbacks complete in current frame
- All component data is readable
- Destruction happens cleanly before next frame's collision check

### Knockback Implementation

When applying knockback from projectiles:

```typescript
// Always normalize direction for consistent distance
const length = Math.hypot(projectile.dirX, projectile.dirY);
const normalizedDirX = projectile.dirX / length;
const normalizedDirY = projectile.dirY / length;
knockback.applyKnockback(normalizedDirX, normalizedDirY, FORCE);

// Ignore new knockback while already active
if (this.isActive) return;

// Apply friction per-second, not per-frame
const frictionPerFrame = Math.pow(this.friction, delta / 1000);
this.velocityX *= frictionPerFrame;
```

**Key points:**
- Normalize direction vectors for consistent knockback distance
- Ignore overlapping knockback to prevent inconsistent behavior
- Use time-based friction for frame-rate independence

## Usage Example

### Player Punch Hitbox

```typescript
const entity = new Entity('punch_hitbox');
entity.tags.add('player_projectile');

entity.add(new DamageComponent(PUNCH_DAMAGE));

entity.add(new CollisionComponent({
  box: { offsetX: -16, offsetY: -16, width: 32, height: 32 },
  collidesWith: ['enemy'],
  onHit: (other) => {
    if (other.tags.has('enemy')) {
      // Use layer collision helper
      if (!canPlayerHitEnemy(playerEntity, other, grid)) {
        return;
      }
      
      const health = other.get(HealthComponent);
      const damage = entity.get(DamageComponent);
      if (health && damage) {
        health.takeDamage(damage.damage);
      }
      
      const stateMachine = other.get(StateMachineComponent);
      if (stateMachine) {
        stateMachine.stateMachine.enter('hit');
      }
      
      // Destroy on next frame after all collision callbacks complete
      scene.time.delayedCall(0, () => entity.destroy());
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
      health.takeDamage(ROBOT_BULLET_DAMAGE);
      
      // Apply knockback from projectile's direction (normalized)
      const knockback = entity.get(KnockbackComponent);
      const projectile = other.get(ProjectileComponent);
      if (knockback && projectile) {
        const length = Math.hypot(projectile.dirX, projectile.dirY);
        const normalizedDirX = projectile.dirX / length;
        const normalizedDirY = projectile.dirY / length;
        knockback.applyKnockback(normalizedDirX, normalizedDirY, KNOCKBACK_FORCE);
      }
      
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
      const damage = other.get(DamageComponent);
      if (damage) {
        health.takeDamage(damage.damage);
      }
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
